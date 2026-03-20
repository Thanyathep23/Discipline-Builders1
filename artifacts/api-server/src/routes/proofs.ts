import { Router } from "express";
import { db, proofSubmissionsTable, focusSessionsTable, missionsTable, usersTable, aiMissionsTable, proofFilesTable } from "@workspace/db";
import { eq, and, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { judgeProof } from "../lib/ai-judge.js";
import { computeRewardCoins, grantReward, updateStreak, applySystemPenalty } from "../lib/rewards.js";
import { grantSessionSkillXp } from "../lib/skill-engine.js";
import { auditLogTable } from "@workspace/db";
import { awardBadge, awardTitle } from "./inventory.js";

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
    rewardMultiplier: p.rewardMultiplier ?? null,
    coinsAwarded: p.coinsAwarded ?? null,
    manualReviewNote: p.manualReviewNote ?? null,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  };
}

async function runJudgment(submissionId: string, userId: string): Promise<void> {
  const proofs = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, submissionId)).limit(1);
  if (!proofs[0]) return;
  const proof = proofs[0];

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

    const { coins, xp } = computeRewardCoins({
      missionPriority: mission.priority,
      missionImpact: mission.impactLevel,
      targetDurationMinutes: mission.targetDurationMinutes,
      actualDurationMinutes: actualMinutes,
      proofQuality,
      proofConfidence: judgeResult.confidenceScore,
      blockedAttemptCount: session.blockedAttemptCount ?? 0,
      strictnessMode: session.strictnessMode,
      userTrustScore: user.trustScore,
      currentStreak: user.currentStreak,
    });

    coinsAwarded = Math.round(coins * judgeResult.rewardMultiplier);

    if (coinsAwarded > 0) {
      await grantReward(userId, coinsAwarded, xp, `Mission completed: ${mission.title}`, {
        missionId: mission.id,
        sessionId: session.id,
        proofId: submissionId,
      });
      await updateStreak(userId);
      await grantSessionSkillXp(userId, mission.category, actualMinutes, judgeResult.verdict);

      // Update mission to completed
      await db.update(missionsTable).set({ status: "completed", updatedAt: new Date() })
        .where(eq(missionsTable.id, mission.id));

      // AI mission bonus reward
      if (mission.source === "ai_generated" && mission.aiMissionId) {
        const [aiMission] = await db
          .select()
          .from(aiMissionsTable)
          .where(eq(aiMissionsTable.id, mission.aiMissionId))
          .limit(1);

        if (aiMission && aiMission.suggestedRewardBonus > 0) {
          await grantReward(
            userId,
            aiMission.suggestedRewardBonus,
            Math.round(aiMission.suggestedRewardBonus * 0.5),
            `AI Mission bonus: ${mission.title}`,
            { missionId: mission.id, aiMissionId: aiMission.id },
          );
        }

        // Award AI champion badge after 5 completed AI missions
        const [{ value: aiCompletedCount }] = await db
          .select({ value: count() })
          .from(missionsTable)
          .where(and(eq(missionsTable.userId, userId), eq(missionsTable.source, "ai_generated"), eq(missionsTable.status, "completed")));

        if (Number(aiCompletedCount) >= 5) {
          await awardBadge(userId, "badge-ai-champion");
        }
        if (Number(aiCompletedCount) >= 1) {
          await awardTitle(userId, "title-grind-architect");
        }
      }
    }
  }

  // Apply system penalty for rejected proof
  if (judgeResult.verdict === "rejected") {
    await applySystemPenalty(
      userId, 20, 10,
      "failed_proof",
      `Proof rejected by AI for mission: ${mission.title}`,
      { sessionId: session.id, missionId: mission.id, proofId: submissionId }
    );
  }

  // Adjust trust score based on verdict
  let trustDelta = 0;
  if (judgeResult.verdict === "rejected") trustDelta = -0.05;
  if (judgeResult.verdict === "flagged") trustDelta = -0.1;
  if (judgeResult.verdict === "approved") trustDelta = 0.02;

  if (trustDelta !== 0) {
    const newTrust = Math.max(0.1, Math.min(2.0, user.trustScore + trustDelta));
    await db.update(usersTable).set({ trustScore: newTrust, updatedAt: new Date() }).where(eq(usersTable.id, userId));
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
}

router.post("/", async (req, res) => {
  const schema = z.object({
    sessionId: z.string(),
    textSummary: z.string().optional().nullable(),
    links: z.array(z.string()).optional().default([]),
    fileUrls: z.array(z.string()).optional().default([]),
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

  const id = generateId();
  await db.insert(proofSubmissionsTable).values({
    id,
    sessionId: parsed.data.sessionId,
    missionId: sessions[0].missionId,
    userId,
    status: "reviewing",
    textSummary: parsed.data.textSummary ?? null,
    links: JSON.stringify(parsed.data.links),
    fileUrls: JSON.stringify(parsed.data.fileUrls),
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
    answers: z.string().min(20),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Answers too short" });
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

  await db.update(proofSubmissionsTable).set({
    followupAnswers: parsed.data.answers,
    status: "reviewing",
    updatedAt: new Date(),
  }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

  runJudgment(req.params.submissionId, userId).catch(err => console.error("Judge error:", err));

  const proof = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, req.params.submissionId)).limit(1);
  res.json(parseProof(proof[0]));
});

export default router;
