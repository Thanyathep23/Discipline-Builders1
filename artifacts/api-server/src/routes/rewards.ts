import { Router } from "express";
import { db, usersTable, rewardTransactionsTable, shopItemsTable, userInventoryTable, auditLogTable } from "@workspace/db";
import { eq, desc, sum, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { xpForLevel } from "../lib/rewards.js";

const router = Router();
router.use(requireAuth);

router.get("/balance", async (req, res) => {
  const userId = (req as any).userId;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = users[0];

  // Total earned
  const earned = await db.select({ total: sum(rewardTransactionsTable.amount) })
    .from(rewardTransactionsTable)
    .where(eq(rewardTransactionsTable.userId, userId));

  const totalCoinsEarned = Number(earned[0]?.total ?? 0);

  // Count completed missions
  const { missionsTable } = await import("@workspace/db");
  const { count } = await import("drizzle-orm");
  const completed = await db.select({ count: count() })
    .from(missionsTable)
    .where(eq(missionsTable.userId, userId));

  res.json({
    coinBalance: user.coinBalance,
    level: user.level,
    xp: user.xp,
    xpToNextLevel: xpForLevel(user.level),
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    totalCoinsEarned,
    totalMissionsCompleted: Number(completed[0]?.count ?? 0),
  });
});

router.get("/history", async (req, res) => {
  const userId = (req as any).userId;
  const history = await db.select().from(rewardTransactionsTable)
    .where(eq(rewardTransactionsTable.userId, userId))
    .orderBy(desc(rewardTransactionsTable.createdAt))
    .limit(50);

  res.json(history.map(t => ({
    ...t,
    createdAt: t.createdAt?.toISOString(),
  })));
});

router.get("/shop", async (req, res) => {
  const items = await db.select().from(shopItemsTable).where(eq(shopItemsTable.isAvailable, true));
  res.json(items.map(i => ({
    ...i,
    createdAt: undefined,
  })));
});

router.post("/shop/:itemId/redeem", async (req, res) => {
  const userId = (req as any).userId;

  const items = await db.select().from(shopItemsTable)
    .where(eq(shopItemsTable.id, req.params.itemId))
    .limit(1);

  if (!items[0] || !items[0].isAvailable) {
    res.status(400).json({ error: "Item not available" });
    return;
  }

  const item = items[0];

  // Phase 17: prevent duplicate purchases
  const existing = await db.select().from(userInventoryTable)
    .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, item.id)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "You already own this item" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (users[0].coinBalance < item.cost) {
    res.status(400).json({ error: "Insufficient coins" });
    return;
  }

  const newBalance = users[0].coinBalance - item.cost;
  await db.update(usersTable).set({ coinBalance: newBalance, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  await db.insert(rewardTransactionsTable).values({
    id: generateId(),
    userId,
    type: "spent",
    amount: -item.cost,
    reason: `Redeemed: ${item.name}`,
  });

  await db.insert(userInventoryTable).values({
    id: generateId(),
    userId,
    itemId: item.id,
  });

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: userId,
    actorRole: "user",
    action: "item_redeemed",
    targetId: item.id,
    targetType: "shop_item",
    details: JSON.stringify({ cost: item.cost, newBalance }),
  });

  res.json({
    success: true,
    newBalance,
    item: { id: item.id, name: item.name, description: item.description, cost: item.cost, category: item.category, isAvailable: item.isAvailable, icon: item.icon },
  });
});

export default router;
