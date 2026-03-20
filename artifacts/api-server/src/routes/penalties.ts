import { Router } from "express";
import { db, penaltiesTable, usersTable, rewardTransactionsTable, auditLogTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";

const router = Router();

function parsePenalty(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    sessionId: p.sessionId ?? null,
    missionId: p.missionId ?? null,
    proofId: p.proofId ?? null,
    reason: p.reason,
    coinsDeducted: p.coinsDeducted,
    xpDeducted: p.xpDeducted,
    description: p.description,
    appliedAt: p.appliedAt?.toISOString(),
    appliedBy: p.appliedBy ?? "system",
  };
}

// GET /penalties — list own penalties
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const penalties = await db
    .select()
    .from(penaltiesTable)
    .where(eq(penaltiesTable.userId, userId))
    .orderBy(desc(penaltiesTable.appliedAt))
    .limit(50);

  res.json(penalties.map(parsePenalty));
});

// POST /penalties (admin only) — manually apply penalty to a user
router.post("/", requireAdmin, async (req, res) => {
  const schema = z.object({
    userId: z.string(),
    reason: z.enum(["abandoned_session", "blocked_attempt", "failed_proof", "missed_deadline", "admin_penalty", "low_trust_score"]),
    coinsDeducted: z.number().int().min(0).max(10000),
    xpDeducted: z.number().int().min(0).max(10000),
    description: z.string().min(1).max(500),
    sessionId: z.string().optional(),
    missionId: z.string().optional(),
    proofId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  const adminUser = (req as any).user;
  const target = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId)).limit(1);
  if (!target[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { coinsDeducted, xpDeducted, description, reason, userId: targetUserId, sessionId, missionId, proofId } = parsed.data;

  // Apply penalty to user wallet
  const newBalance = Math.max(0, target[0].coinBalance - coinsDeducted);
  const newXp = Math.max(0, target[0].xp - xpDeducted);

  await db.update(usersTable).set({
    coinBalance: newBalance,
    xp: newXp,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, targetUserId));

  // Record penalty
  const penaltyId = generateId();
  await db.insert(penaltiesTable).values({
    id: penaltyId,
    userId: targetUserId,
    sessionId: sessionId ?? null,
    missionId: missionId ?? null,
    proofId: proofId ?? null,
    reason,
    coinsDeducted,
    xpDeducted,
    description,
    appliedBy: adminUser.id,
  });

  // Transaction record
  if (coinsDeducted > 0) {
    await db.insert(rewardTransactionsTable).values({
      id: generateId(),
      userId: targetUserId,
      type: "penalty",
      amount: -coinsDeducted,
      xpAmount: -xpDeducted,
      reason: `Penalty: ${description}`,
      penaltyId,
      balanceAfter: newBalance,
    });
  }

  // Audit
  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: adminUser.id,
    actorRole: "admin",
    action: "admin_penalty_applied",
    targetId: targetUserId,
    targetType: "user",
    details: JSON.stringify({ coinsDeducted, xpDeducted, reason, description }),
  });

  const penalty = await db.select().from(penaltiesTable).where(eq(penaltiesTable.id, penaltyId)).limit(1);
  res.status(201).json(parsePenalty(penalty[0]));
});

export default router;
