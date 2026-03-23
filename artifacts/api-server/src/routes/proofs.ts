import { Router } from "express";
import { db, proofSubmissionsTable, focusSessionsTable, missionsTable, usersTable, aiMissionsTable, proofFilesTable, CATEGORY_SKILL_MAP, CYCLE_DEFINITIONS } from "@workspace/db";
import type { CycleType } from "@workspace/db";
import { eq, and, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { judgeProof } from "../lib/ai-judge.js";
import { hashText } from "../lib/ai-providers.js";
import { computeRewardCoins, grantReward, updateStreak, applySystemPenalty, computeRarityBonus, computeAdaptiveDifficultyBonus } from "../lib/rewards.js";
import { advanceChainStep } from "../lib/quest-chains.js";
import { grantSessionSkillXp } from "../lib/skill-engine.js";
import { incrementCycleProgress, markCycleRewardClaimed } from "../lib/cycle-engine.js";
import { auditLogTable } from "@workspace/db";
import { awardBadge, awardTitle } from "./inventory.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { dispatchWebhookEvent } from "../lib/webhook-dispatcher.js";

const router = Router();
router.use(requireAuth);

function parseProof(p: any) {
  return {
    id: p.id,
    sessionId: p.sessionId,
    missionId: p.missionId,
    userId: p.userId,
    status: p.status,
    textSummary: p.textSummary ?? null,
    links: JSON.parse(p.links || "[]"),
    fileUrls: JSON.parse(p.fileUrls || "[]"),
    aiConfidenceScore: p.aiConfidenceScore ?? null,
    aiVerdict: p.aiVerdict ?? null,
    aiExplanation: p.aiExplanation ?? null,
    aiRubric: (p.aiRubricRelevance != null) ? {
      relevanceScore: p.aiRubricRelevance,
      qualityScore: p.aiRubricQuality,
      plausibilityScore: p.aiRubricPlausibility,
      specificityScore: p.aiRubricSpecificity,
    } : null,
    followupQuestions: p.followupQuestions ?? null,
    followupCount: p.followupCount ?? 0,
    rewardMultiplier: p.rewardMultiplier ?? null,
    coinsAwarded: p.coinsAwarded ?? null,
    manualReviewNote: p.manualReviewNote ?? null,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  };
}

interface SettlementContext {
  userId: string;
  submissionId: string;
  verdict: "approved" | "partial";
  mission: typeof missionsTable.$inferSelect;
  session: typeof focusSessionsTable.$inferSelect;
  user: typeof usersTable.$inferSelect;
  proofQuality: number;
  proofConfidence: number;
  rewardMultiplier: number;
}

async function settleCompletionRewards(ctx: SettlementContext): Promise<number> {
  const startedAt = new Date(ctx.session.startedAt);
  const endedAt = ctx.session.endedAt ? new Date(ctx.session.endedAt) : new Date();
  const actualMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000) - Math.floor((ctx.session.totalPausedSeconds ?? 0) / 60);

  const { coins, xp } = computeRewardCoins({
    missionPriority: ctx.mission.priority,
    missionImpact: ctx.mission.impactLevel,
    targetDurationMinutes: ctx.mission.targetDurationMinutes,
    actualDurationMinutes: actualMinutes,
    proofQuality: ctx.proofQuality,
    proofConfidence: ctx.proofConfidence,
    blockedAttemptCount: ctx.session.blockedAttemptCount ?? 0,
    strictnessMode: ctx.session.strictnessMode,
    userTrustScore: ctx.user.trustScore,
    currentStreak: ctx.user.currentStreak,
    missionValueScore: ctx.mission.missionValueScore ?? undefined,
    rewardMultiplier: ctx.rewardMultiplier,
    distractionCount: ctx.session.blockedAttemptCount ?? 0,
  });

  const finalXp = ctx.verdict === "approved" ? Math.max(10, xp) : Math.max(1, xp);

  await grantReward(ctx.userId, coins, finalXp, `Mission completed: ${ctx.mission.title}`, {
    missionId: ctx.mission.id,
    sessionId: ctx.session.id,
    proofId: ctx.submissionId,
  });
  await updateStreak(ctx.userId);
  await grantSessionSkillXp(ctx.userId, ctx.mission.category, actualMinutes, ctx.verdict);

  const categorySkills = CATEGORY_SKILL_MAP[ctx.mission.category] ?? ["focus"];
  const cycleSkillsToCheck = [
    ...new Set([
      ...categorySkills,
      "focus",
      ...(ctx.verdict === "approved" ? ["discipline"] : []),
    ]),
  ];
  let cycleRewardProcessed = false;
  for (const skillId of cycleSkillsToCheck) {
    const cycleResult = await incrementCycleProgress(ctx.userId, skillId).catch(() => null);
    if (cycleResult?.completed && cycleResult.cycleId && cycleResult.cycleType && !cycleRewardProcessed) {
      cycleRewardProcessed = true;
      const def = CYCLE_DEFINITIONS[cycleResult.cycleType as CycleType];
      if (def) {
        const titleId = "title-" + def.rewardTitle.toLowerCase().replace(/\s+/g, "-");
        await awardTitle(ctx.userId, titleId).catch(() => {});
        await grantReward(ctx.userId, 200, 100, `Cycle completed: ${def.label}`);
        await markCycleRewardClaimed(cycleResult.cycleId);
      }
    }
  }

  await db.update(missionsTable).set({ status: "completed", updatedAt: new Date() })
    .where(eq(missionsTable.id, ctx.mission.id));

  if (ctx.mission.source === "ai_generated" && ctx.mission.aiMissionId) {
    const [aiMission] = await db.select().from(aiMissionsTable)
      .where(eq(aiMissionsTable.id, ctx.mission.aiMissionId)).limit(1);
    if (aiMission && aiMission.suggestedRewardBonus > 0) {
      await grantReward(ctx.userId, aiMission.suggestedRewardBonus,
        Math.round(aiMission.suggestedRewardBonus * 0.5),
        `AI Mission bonus: ${ctx.mission.title}`, { missionId: ctx.mission.id });
    }

    const [{ value: aiCompletedCount }] = await db
      .select({ value: count() }).from(missionsTable)
      .where(and(eq(missionsTable.userId, ctx.userId), eq(missionsTable.source, "ai_generated"), eq(missionsTable.status, "completed")));
    if (Number(aiCompletedCount) >= 5) await awardBadge(ctx.userId, "badge-ai-champion");
    if (Number(aiCompletedCount) >= 1) await awardTitle(ctx.userId, "title-grind-architect");
  }

  const rarityBonus = computeRarityBonus(ctx.mission.rarity);
  const difficultyBonus = computeAdaptiveDifficultyBonus(ctx.mission.difficultyColor);
  const rarityTotalBonus = rarityBonus + difficultyBonus;
  if (rarityTotalBonus > 0) {
    await grantReward(ctx.userId, rarityTotalBonus, Math.round(rarityTotalBonus * 0.5),
      `${ctx.mission.rarity ?? "normal"} mission bonus: ${ctx.mission.title}`,
      { missionId: ctx.mission.id });
  }

  if (ctx.mission.chainId) {
    const chainResult = await advanceChainStep(ctx.mission.chainId, ctx.userId);
    if (chainResult?.completed && chainResult.bonusCoins > 0) {
      await grantReward(ctx.userId, chainResult.bonusCoins,
        Math.round(chainResult.bonusCoins * 0.75),
        `Quest chain completed: ${chainResult.chainName}`,
        { missionId: ctx.mission.id });
    }
  }

  const trustDelta = ctx.verdict === "approved"
    ? (ctx.proofConfidence >= 0.8 ? 0.05 : 0.02)
    : 0.01;
  const newTrust = Math.max(0.1, Math.min(1.0, ctx.user.trustScore + trustDelta));
  await db.update(usersTable).set({ trustScore: newTrust, updatedAt: new Date() }).where(eq(usersTable.id, ctx.userId));

  return coins;
}

async function runJudgment(submissionId: string, userId: string, isFollowupRejudge = false, skipPenaltiesForAutoPartial = false): Promise<void> {
  const proofs = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, submissionId)).limit(1);
  if (!proofs[0]) return;
  const proof = proofs[0];

  // Guard: only judge proofs still in 'reviewing' state — prevents double-reward from concurrent calls
  if (proof.status !== "reviewing") return;

  const missions = await db.select().from(missionsTable).where(eq(missionsTable.id, proof.missionId)).limit(1);
  const sessions = await db.select().from(focusSessionsTable).where(eq(focusSessionsTable.id, proof.sessionId)).limit(1);
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!missions[0] || !sessions[0] || !users[0]) return;
  const mission = missions[0];
  const session = sessions[0];
  const user = users[0];

  const attachedFiles = await db
    .select({
      originalName: proofFilesTable.originalName,
      mimeType: proofFilesTable.mimeType,
      fileSize: proofFilesTable.fileSize,
      extractedText: proofFilesTable.extractedText,
      extractionStatus: proofFilesTable.extractionStatus,
    })
    .from(proofFilesTable)
    .where(and(eq(proofFilesTable.proofSubmissionId, submissionId), eq(proofFilesTable.userId, userId)));

  const startedAt = new Date(session.startedAt);
  const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
  const actualMinutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000) - Math.floor((session.totalPausedSeconds ?? 0) / 60);

  const proofReqs = mission.proofRequirements ? JSON.parse(mission.proofRequirements) : null;

  const judgeResult = await judgeProof({
    missionTitle: mission.title,
    missionDescription: mission.description,
    missionPurpose: mission.purpose,
    missionCategory: mission.category,
    targetDurationMinutes: mission.targetDurationMinutes,
    actualDurationMinutes: actualMinutes,
    textSummary: proof.textSummary,
    links: JSON.parse(proof.links || "[]"),
    requiredProofTypes: JSON.parse(mission.requiredProofTypes || "[]"),
    followupAnswers: proof.followupAnswers,
    userId,
    proofRubric: proofReqs?.rubric,
    userTrustScore: user.trustScore,
    distractionCount: session.blockedAttemptCount ?? 0,
    missionPriority: mission.priority,
    missionImpactLevel: mission.impactLevel,
    excludeProofId: submissionId,
    isFollowupRejudge,
    attachedFiles: attachedFiles.map((f) => ({
      name: f.originalName,
      type: f.mimeType,
      sizeKb: Math.round(f.fileSize / 1024),
      extractedText: f.extractedText ?? undefined,
      extractionStatus: f.extractionStatus ?? undefined,
    })),
  });

  let coinsAwarded = 0;

  if (judgeResult.verdict === "approved" || judgeResult.verdict === "partial") {
    const proofQuality = (judgeResult.rubric.relevanceScore + judgeResult.rubric.qualityScore +
      judgeResult.rubric.specificityScore) / 3;

    const verdictCap = judgeResult.verdict === "approved" ? 1.0 : 0.5;
    const effectiveMultiplier = Math.min(judgeResult.rewardMultiplier ?? verdictCap, verdictCap);

    coinsAwarded = await settleCompletionRewards({
      userId,
      submissionId,
      verdict: judgeResult.verdict,
      mission,
      session,
      user,
      proofQuality,
      proofConfidence: judgeResult.confidenceScore,
      rewardMultiplier: effectiveMultiplier,
    });
  }

  const isDuplicate = judgeResult.preScreenReason === "duplicate_submission";

  if (judgeResult.verdict === "rejected" && !isDuplicate && !skipPenaltiesForAutoPartial) {
    await applySystemPenalty(
      userId, 20, 10,
      "failed_proof",
      `Proof rejected by AI for mission: ${mission.title}`,
      { sessionId: session.id, missionId: mission.id, proofId: submissionId }
    );
  }

  if (!skipPenaltiesForAutoPartial && (judgeResult.verdict === "rejected" || judgeResult.verdict === "flagged" || judgeResult.verdict === "followup_needed" || judgeResult.verdict === "manual_review")) {
    await grantReward(userId, 0, 1, `Attempt XP: ${mission.title}`, {
      missionId: mission.id, sessionId: session.id, proofId: submissionId,
    });
  }

  // Milestone triggers for approved proofs
  if (judgeResult.verdict === "approved") {
    try {
      const { recordMilestone } = await import("./inventory.js");
      const [{ value: approvedCount }] = await db
        .select({ value: count() })
        .from(proofSubmissionsTable)
        .where(and(eq(proofSubmissionsTable.userId, userId), eq(proofSubmissionsTable.status, "approved")));
      const n = Number(approvedCount) + 1;
      if (n === 1) {
        await awardBadge(userId, "badge-focus-initiate");
        await awardTitle(userId, "title-focus-initiate");
        await recordMilestone(userId, "first_proof_approved");
      }
      if (n >= 5) {
        await awardTitle(userId, "title-focus-operator");
      }
      if (n >= 10) {
        await awardBadge(userId, "badge-proof-master");
        await awardTitle(userId, "title-proof-master");
      }
    } catch {}
  }

  if (judgeResult.verdict !== "approved" && judgeResult.verdict !== "partial") {
    let trustDelta = judgeResult.trustScoreDelta ?? 0;
    if (trustDelta === 0) {
      if (judgeResult.verdict === "rejected") trustDelta = -0.05;
      else if (judgeResult.verdict === "flagged") trustDelta = -0.10;
      else if (judgeResult.verdict === "manual_review") trustDelta = -0.02;
    }

    if (skipPenaltiesForAutoPartial && trustDelta < 0) {
      trustDelta = 0;
    }

    if (trustDelta !== 0) {
      const newTrust = Math.max(0.1, Math.min(1.0, user.trustScore + trustDelta));
      await db.update(usersTable).set({ trustScore: newTrust, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    }
  }

  await db.update(proofSubmissionsTable).set({
    status: judgeResult.verdict === "followup_needed" ? "followup_needed" : judgeResult.verdict,
    aiConfidenceScore: judgeResult.confidenceScore,
    aiVerdict: judgeResult.verdict,
    aiExplanation: judgeResult.explanation,
    aiRubricRelevance: judgeResult.rubric.relevanceScore,
    aiRubricQuality: judgeResult.rubric.qualityScore,
    aiRubricPlausibility: judgeResult.rubric.plausibilityScore,
    aiRubricSpecificity: judgeResult.rubric.specificityScore,
    followupQuestions: judgeResult.followupQuestions ?? null,
    rewardMultiplier: judgeResult.rewardMultiplier,
    coinsAwarded,
    updatedAt: new Date(),
  }).where(eq(proofSubmissionsTable.id, submissionId));

  // Audit
  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: null,
    actorRole: "system",
    action: "proof_judged",
    targetId: submissionId,
    targetType: "proof",
    details: JSON.stringify({ verdict: judgeResult.verdict, coins: coinsAwarded }),
  });

  // Telemetry
  const verdictEvent =
    judgeResult.verdict === "approved" || judgeResult.verdict === "partial" ? Events.PROOF_APPROVED :
    judgeResult.verdict === "rejected" || judgeResult.verdict === "flagged"  ? Events.PROOF_REJECTED :
    judgeResult.verdict === "followup_needed" ? Events.PROOF_FOLLOWUP_REQUIRED : null;
  if (verdictEvent) {
    trackEvent(verdictEvent, userId, { submissionId, verdict: judgeResult.verdict, coins: coinsAwarded }).catch(() => {});
  }

  // Phase 16 — Webhook dispatch (fire-and-forget, never breaks main flow)
  if (judgeResult.verdict === "approved" || judgeResult.verdict === "partial") {
    dispatchWebhookEvent(userId, "proof.approved", {
      submissionId,
      missionId: mission.id,
      missionTitle: mission.title,
      coinsAwarded,
      verdict: judgeResult.verdict,
      confidenceScore: judgeResult.confidenceScore,
    }).catch(() => {});
    dispatchWebhookEvent(userId, "mission.completed", {
      missionId: mission.id,
      title: mission.title,
      category: mission.category,
      coinsAwarded,
    }).catch(() => {});
  }
  if (judgeResult.verdict === "rejected") {
    dispatchWebhookEvent(userId, "proof.rejected", {
      submissionId,
      missionId: mission.id,
      missionTitle: mission.title,
    }).catch(() => {});
  }
}

router.post("/", async (req, res) => {
  const schema = z.object({
    sessionId: z.string(),
    textSummary: z.string().optional().nullable(),
    links: z.array(z.string()).optional().default([]),
    proofFileIds: z.array(z.string()).optional().default([]),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId ?? (req as any).user?.id;

  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, parsed.data.sessionId), eq(focusSessionsTable.userId, userId)))
    .limit(1);

  if (!sessions[0]) {
    res.status(400).json({ error: "Session not found" });
    return;
  }

  const existing = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.sessionId, parsed.data.sessionId))
    .limit(1);
  if (existing[0] && !["rejected", "followup_needed"].includes(existing[0].status)) {
    res.status(400).json({ error: "Proof already submitted for this session" });
    return;
  }

  const hasFileIds = parsed.data.proofFileIds.length > 0;
  const hasText = (parsed.data.textSummary ?? "").trim().length > 0;
  const hasLinks = parsed.data.links.length > 0;

  if (!hasText && !hasLinks && !hasFileIds) {
    res.status(400).json({ error: "Proof required: provide a text summary, link, or uploaded file." });
    return;
  }

  if (hasFileIds) {
    const ownedFiles = await db
      .select({ id: proofFilesTable.id })
      .from(proofFilesTable)
      .where(and(
        inArray(proofFilesTable.id, parsed.data.proofFileIds),
        eq(proofFilesTable.userId, userId),
      ));

    if (ownedFiles.length !== parsed.data.proofFileIds.length) {
      res.status(403).json({ error: "One or more file IDs are invalid or do not belong to you." });
      return;
    }
  }

  const textContent = (parsed.data.textSummary ?? "").trim();
  const textHash = textContent.length > 0 ? hashText(textContent) : null;

  const id = generateId();
  await db.insert(proofSubmissionsTable).values({
    id,
    sessionId: parsed.data.sessionId,
    missionId: sessions[0].missionId,
    userId,
    status: "reviewing",
    textSummary: parsed.data.textSummary ?? null,
    links: JSON.stringify(parsed.data.links),
    textHash,
    followupCount: 0,
  });

  if (hasFileIds) {
    await db
      .update(proofFilesTable)
      .set({ proofSubmissionId: id })
      .where(and(
        inArray(proofFilesTable.id, parsed.data.proofFileIds),
        eq(proofFilesTable.userId, userId),
      ));
  }

  trackEvent(Events.PROOF_SUBMITTED, userId, { sessionId: parsed.data.sessionId }).catch(() => {});
  runJudgment(id, userId).catch(err => console.error("Judge error:", err));

  const proof = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, id)).limit(1);
  res.status(201).json(parseProof(proof[0]));
});

router.get("/:submissionId", async (req, res) => {
  const userId = (req as any).userId;
  const proofs = await db.select().from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.id, req.params.submissionId), eq(proofSubmissionsTable.userId, userId)))
    .limit(1);

  if (!proofs[0]) {
    res.status(404).json({ error: "Proof not found" });
    return;
  }
  res.json(parseProof(proofs[0]));
});

router.post("/:submissionId/followup", async (req, res) => {
  const schema = z.object({
    answers: z.string().min(10),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Answers too short (minimum 10 characters)" });
    return;
  }

  const userId = (req as any).userId;
  const proofs = await db.select().from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.id, req.params.submissionId), eq(proofSubmissionsTable.userId, userId)))
    .limit(1);

  if (!proofs[0] || proofs[0].status !== "followup_needed") {
    res.status(400).json({ error: "No follow-up pending" });
    return;
  }

  const currentFollowupCount = proofs[0].followupCount ?? 0;
  if (currentFollowupCount >= 2) {
    res.status(400).json({ error: "Maximum follow-up attempts reached" });
    return;
  }
  const newFollowupCount = currentFollowupCount + 1;
  const isLastFollowup = newFollowupCount >= 2;

  await db.update(proofSubmissionsTable).set({
    followupAnswers: parsed.data.answers,
    followupCount: newFollowupCount,
    status: "reviewing",
    updatedAt: new Date(),
  }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

  runJudgment(req.params.submissionId, userId, true, isLastFollowup).then(async () => {
    if (isLastFollowup) {
      const updated = await db.select().from(proofSubmissionsTable)
        .where(eq(proofSubmissionsTable.id, req.params.submissionId)).limit(1);
      if (updated[0] && updated[0].status !== "approved" && updated[0].status !== "partial") {
        await db.update(proofSubmissionsTable).set({
          status: "partial",
          rewardMultiplier: 0.4,
          aiVerdict: "partial",
          aiExplanation: "Auto-resolved to partial after maximum follow-up attempts reached. " + (updated[0].aiExplanation ?? ""),
          aiConfidenceScore: Math.max(0.3, updated[0].aiConfidenceScore ?? 0.5),
          followupCount: newFollowupCount,
          updatedAt: new Date(),
        }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

        const sessions = await db.select().from(focusSessionsTable)
          .where(eq(focusSessionsTable.id, proofs[0].sessionId)).limit(1);
        const missions = await db.select().from(missionsTable)
          .where(eq(missionsTable.id, proofs[0].missionId)).limit(1);
        const users = await db.select().from(usersTable)
          .where(eq(usersTable.id, userId)).limit(1);

        if (sessions[0] && missions[0] && users[0]) {
          const coins = await settleCompletionRewards({
            userId,
            submissionId: req.params.submissionId,
            verdict: "partial",
            mission: missions[0],
            session: sessions[0],
            user: users[0],
            proofQuality: ((updated[0].aiRubricRelevance ?? 0.3) + (updated[0].aiRubricQuality ?? 0.3) + (updated[0].aiRubricSpecificity ?? 0.3)) / 3,
            proofConfidence: updated[0].aiConfidenceScore ?? 0.5,
            rewardMultiplier: 0.4,
          });

          await db.update(proofSubmissionsTable).set({ coinsAwarded: coins }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

          await db.insert(auditLogTable).values({
            id: generateId(),
            actorId: null,
            actorRole: "system",
            action: "proof_judged",
            targetId: req.params.submissionId,
            targetType: "proof",
            details: JSON.stringify({ verdict: "partial", coins, reason: "auto_resolve_max_followups" }),
          });
        }
      }
    }
  }).catch(err => console.error("Judge error:", err));

  const proof = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, req.params.submissionId)).limit(1);
  res.json(parseProof(proof[0]));
});

export default router;
