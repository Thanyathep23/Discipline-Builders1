import { Router } from "express";
import { db, proofSubmissionsTable, focusSessionsTable, missionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { judgeProof } from "../lib/ai-judge.js";
import { computeRewardCoins, grantReward, updateStreak } from "../lib/rewards.js";
import { auditLogTable } from "@workspace/db";

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

  // Calculate actual duration
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
  });

  let coinsAwarded = 0;

  if (judgeResult.verdict === "approved" || judgeResult.verdict === "partial") {
    const proofQuality = (judgeResult.rubric.relevanceScore + judgeResult.rubric.qualityScore +
      judgeResult.rubric.specificityScore) / 3;

    const { coins } = computeRewardCoins({
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
      await grantReward(userId, coinsAwarded, coinsAwarded * 2, `Mission completed: ${mission.title}`, mission.id, submissionId);
      await updateStreak(userId);

      // Update mission to completed
      await db.update(missionsTable).set({ status: "completed", updatedAt: new Date() })
        .where(eq(missionsTable.id, mission.id));
    }
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
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId;

  // Validate session belongs to user
  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, parsed.data.sessionId), eq(focusSessionsTable.userId, userId)))
    .limit(1);

  if (!sessions[0]) {
    res.status(400).json({ error: "Session not found" });
    return;
  }

  // Check for duplicate submission
  const existing = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.sessionId, parsed.data.sessionId))
    .limit(1);
  if (existing[0] && !["rejected", "followup_needed"].includes(existing[0].status)) {
    res.status(400).json({ error: "Proof already submitted for this session" });
    return;
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

  // Run AI judgment asynchronously (don't block response)
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
