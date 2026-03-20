import { Router } from "express";
import { db, usersTable, proofSubmissionsTable, auditLogTable, shopItemsTable, missionsTable, rewardTransactionsTable } from "@workspace/db";
import { eq, desc, not } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, generateId } from "../lib/auth.js";
import { grantReward } from "../lib/rewards.js";

const router = Router();
router.use(requireAdmin);

router.get("/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({
    id: u.id, email: u.email, username: u.username, role: u.role,
    coinBalance: u.coinBalance, level: u.level, currentStreak: u.currentStreak,
    trustScore: u.trustScore, isActive: u.isActive,
    createdAt: u.createdAt?.toISOString(),
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
  })));
});

router.put("/users/:userId", async (req, res) => {
  const schema = z.object({
    role: z.string().optional().nullable(),
    isActive: z.boolean().optional().nullable(),
    coinAdjustment: z.number().int().optional().nullable(),
    note: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const { role, isActive, coinAdjustment, note } = parsed.data;
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (role !== undefined && role !== null) updates.role = role;
  if (isActive !== undefined && isActive !== null) updates.isActive = isActive;

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.params.userId));

  if (coinAdjustment) {
    const type = coinAdjustment > 0 ? "admin_grant" : "admin_revoke";
    const reason = note ?? `Admin adjustment by ${actor.username}`;
    if (coinAdjustment > 0) {
      await grantReward(req.params.userId, Math.abs(coinAdjustment), 0, reason, {
        actorId: actor.id,
        type: "admin_grant",
      });
    } else {
      // Deduct coins
      const users = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId)).limit(1);
      if (users[0]) {
        const newBal = Math.max(0, users[0].coinBalance + coinAdjustment);
        await db.update(usersTable).set({ coinBalance: newBal, updatedAt: new Date() }).where(eq(usersTable.id, req.params.userId));
        await db.insert(rewardTransactionsTable).values({
          id: generateId(),
          userId: req.params.userId,
          type: "admin_revoke",
          amount: coinAdjustment,
          xpAmount: 0,
          reason,
          balanceAfter: newBal,
        });
      }
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: actor.id,
      actorRole: "admin",
      action: "admin_user_update",
      targetId: req.params.userId,
      targetType: "user",
      details: JSON.stringify({ role, isActive, coinAdjustment, note }),
    });
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId)).limit(1);
  if (!user[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user[0].id, email: user[0].email, username: user[0].username, role: user[0].role,
    coinBalance: user[0].coinBalance, level: user[0].level, currentStreak: user[0].currentStreak,
    trustScore: user[0].trustScore, isActive: user[0].isActive,
    createdAt: user[0].createdAt?.toISOString(),
    lastActiveAt: user[0].lastActiveAt?.toISOString() ?? null,
  });
});

router.get("/reviews", async (req, res) => {
  const flagged = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.status, "flagged"))
    .orderBy(desc(proofSubmissionsTable.createdAt));

  res.json(flagged.map(p => ({
    id: p.id, sessionId: p.sessionId, missionId: p.missionId, userId: p.userId,
    status: p.status, textSummary: p.textSummary ?? null,
    links: JSON.parse(p.links || "[]"), fileUrls: JSON.parse(p.fileUrls || "[]"),
    aiConfidenceScore: p.aiConfidenceScore ?? null, aiVerdict: p.aiVerdict ?? null,
    aiExplanation: p.aiExplanation ?? null,
    aiRubric: p.aiRubricRelevance != null ? {
      relevanceScore: p.aiRubricRelevance, qualityScore: p.aiRubricQuality,
      plausibilityScore: p.aiRubricPlausibility, specificityScore: p.aiRubricSpecificity,
    } : null,
    followupQuestions: p.followupQuestions ?? null,
    rewardMultiplier: p.rewardMultiplier ?? null, coinsAwarded: p.coinsAwarded ?? null,
    manualReviewNote: p.manualReviewNote ?? null,
    createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString(),
  })));
});

router.post("/reviews/:submissionId", async (req, res) => {
  const schema = z.object({
    verdict: z.enum(["approved", "partial", "rejected"]),
    note: z.string(),
    rewardMultiplier: z.number().min(0).max(1.5),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const { verdict, note, rewardMultiplier } = parsed.data;

  const proofs = await db.select().from(proofSubmissionsTable)
    .where(eq(proofSubmissionsTable.id, req.params.submissionId))
    .limit(1);

  if (!proofs[0]) {
    res.status(404).json({ error: "Proof not found" });
    return;
  }

  await db.update(proofSubmissionsTable).set({
    status: verdict,
    manualReviewNote: note,
    rewardMultiplier,
    updatedAt: new Date(),
  }).where(eq(proofSubmissionsTable.id, req.params.submissionId));

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: actor.id,
    actorRole: "admin",
    action: "admin_proof_review",
    targetId: req.params.submissionId,
    targetType: "proof",
    details: JSON.stringify({ verdict, note, rewardMultiplier }),
  });

  const proof = await db.select().from(proofSubmissionsTable).where(eq(proofSubmissionsTable.id, req.params.submissionId)).limit(1);
  res.json({ ...proof[0], links: JSON.parse(proof[0]?.links || "[]"), fileUrls: JSON.parse(proof[0]?.fileUrls || "[]") });
});

router.get("/audit-log", async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit as string ?? "50") || 50);
  const offset = parseInt(req.query.offset as string ?? "0") || 0;

  const entries = await db.select().from(auditLogTable)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(entries.map(e => ({
    id: e.id, actorId: e.actorId ?? null, actorRole: e.actorRole,
    action: e.action, targetId: e.targetId ?? null, targetType: e.targetType ?? null,
    details: e.details ?? null, createdAt: e.createdAt?.toISOString(),
  })));
});

router.post("/shop", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string(),
    cost: z.number().int().min(1),
    category: z.string(),
    icon: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const actor = (req as any).user;
  const id = generateId();
  await db.insert(shopItemsTable).values({ id, ...parsed.data });

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: actor.id,
    actorRole: "admin",
    action: "shop_item_created",
    targetId: id,
    targetType: "shop_item",
    details: JSON.stringify(parsed.data),
  });

  const item = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, id)).limit(1);
  res.status(201).json({ ...item[0], createdAt: undefined });
});

export default router;
