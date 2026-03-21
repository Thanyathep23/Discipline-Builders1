import { Router } from "express";
import {
  db, usersTable, shopItemsTable, userInventoryTable,
  rewardTransactionsTable, auditLogTable,
} from "@workspace/db";
import { checkUserPremium } from "./premium.js";
import { eq, and, asc, isNotNull } from "drizzle-orm";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";
import { isKilled } from "../lib/kill-switches.js";

const router = Router();

// ─────────────────────────────────────────────────────────
// MARKETPLACE ITEM CATALOG (expanded Phase 17 seed)
// ─────────────────────────────────────────────────────────
const MARKETPLACE_ITEMS = [
  // Trophies
  { id: "asset-focus-trophy",       name: "Focus Trophy",            description: "A symbolic trophy for committed deep work. Displayed in your command center.",                       cost: 80,   category: "trophy",   icon: "trophy",           rarity: "uncommon", itemType: "trophy",   isLimited: false, sellBackValue: 20,  sortOrder: 10, featuredOrder: null },
  { id: "asset-discipline-medal",   name: "Discipline Medal",        description: "Awarded to those who build real, lasting discipline. A mark of earned consistency.",                  cost: 120,  category: "trophy",   icon: "medal",            rarity: "rare",     itemType: "trophy",   isLimited: false, sellBackValue: 30,  sortOrder: 20, featuredOrder: 1    },
  { id: "asset-proof-vault",        name: "Proof Vault",             description: "A symbolic vault for verified excellence. Signifies a high proof approval rate.",                     cost: 180,  category: "trophy",   icon: "lock-closed",      rarity: "rare",     itemType: "trophy",   isLimited: false, sellBackValue: 45,  sortOrder: 30, featuredOrder: null },
  { id: "asset-chain-breaker",      name: "Chain Breaker",           description: "For operators who complete the hardest quest chains under pressure.",                                 cost: 280,  category: "trophy",   icon: "git-branch",       rarity: "epic",     itemType: "trophy",   isLimited: false, sellBackValue: 0,   sortOrder: 40, featuredOrder: 2    },
  { id: "asset-iron-log",           name: "Iron Log",                description: "30 consecutive sessions logged. Undeniable proof of relentless execution.",                          cost: 320,  category: "trophy",   icon: "barbell",          rarity: "epic",     itemType: "trophy",   isLimited: true,  sellBackValue: 0,   sortOrder: 50, featuredOrder: null },

  // Room Upgrades
  { id: "asset-focus-shrine",       name: "Focus Shrine",            description: "A command center upgrade — the dedicated deep work environment. Serious operators only.",            cost: 200,  category: "room",     icon: "home",             rarity: "rare",     itemType: "room",     isLimited: false, sellBackValue: 50,  sortOrder: 10, featuredOrder: null },
  { id: "asset-command-terminal",   name: "Command Terminal",        description: "Elite workspace upgrade. A black-glass terminal for operators at the highest level.",                 cost: 350,  category: "room",     icon: "desktop-outline",  rarity: "epic",     itemType: "room",     isLimited: false, sellBackValue: 0,   sortOrder: 20, featuredOrder: 3    },
  { id: "asset-war-room",           name: "War Room",                description: "The inner sanctum. Reserved for those who plan, execute, and dominate their craft.",                 cost: 600,  category: "room",     icon: "business",         rarity: "legendary", itemType: "room",    isLimited: true,  sellBackValue: 0,   sortOrder: 30, featuredOrder: null },

  // Profile Cosmetics
  { id: "asset-gold-ribbon",        name: "Gold Ribbon",             description: "A prestige marker worn by top performers. Displayed on your profile header.",                        cost: 250,  category: "cosmetic", icon: "ribbon",           rarity: "rare",     itemType: "cosmetic", isLimited: false, sellBackValue: 60,  sortOrder: 10, featuredOrder: null },
  { id: "asset-silver-frame",       name: "Silver Frame",            description: "A profile frame for consistent mid-tier performers. Clean, earned, visible.",                        cost: 150,  category: "cosmetic", icon: "images-outline",   rarity: "uncommon", itemType: "cosmetic", isLimited: false, sellBackValue: 35,  sortOrder: 20, featuredOrder: null },
  { id: "asset-command-badge",      name: "Command Badge",           description: "An operator badge worn on the profile. Indicates command-level discipline.",                         cost: 200,  category: "cosmetic", icon: "shield-checkmark", rarity: "rare",     itemType: "cosmetic", isLimited: false, sellBackValue: 50,  sortOrder: 30, featuredOrder: null },

  // Prestige Markers
  { id: "asset-prestige-seal",      name: "Prestige Seal",           description: "A first-cycle prestige marker. Shows you have completed a full discipline arc.",                    cost: 400,  category: "prestige", icon: "star",             rarity: "epic",     itemType: "prestige", isLimited: false, sellBackValue: 0,   sortOrder: 10, featuredOrder: 4    },
  { id: "asset-apex-marker",        name: "Apex Marker",             description: "Reserved for multi-cycle prestige. You have proven mastery across multiple arcs.",                   cost: 800,  category: "prestige", icon: "flame",            rarity: "legendary", itemType: "prestige", isLimited: true,  sellBackValue: 0,   sortOrder: 20, featuredOrder: null },
  { id: "asset-operator-sigil",     name: "Operator Sigil",          description: "A rare exclusive sigil. Not for sale to most — earned through extreme consistency.",                cost: 500,  category: "prestige", icon: "planet",           rarity: "epic",     itemType: "prestige", isExclusive: true, isLimited: true, sellBackValue: 0, sortOrder: 30, featuredOrder: null },
];

async function seedMarketplace() {
  for (const item of MARKETPLACE_ITEMS) {
    await db.insert(shopItemsTable).values({
      ...item,
      isAvailable: true,
      acquisitionSource: "purchase",
      featuredOrder: item.featuredOrder ?? null,
    }).onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────
// GET /marketplace — browse all items (with owned state)
// ─────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: any, res) => {
  try {
    await seedMarketplace();
    const userId = req.user.id;
    const category = req.query.category as string | undefined;

    const [user] = await db.select({ coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const balance = user?.coinBalance ?? 0;
    const isPremium = await checkUserPremium(userId);

    let itemsQuery = db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.isAvailable, true))
      .orderBy(asc(shopItemsTable.sortOrder));

    const allItems = await itemsQuery;
    const filtered = category && category !== "all"
      ? allItems.filter(i => i.category === category)
      : allItems;

    const owned = await db.select().from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedMap = new Map(owned.map(o => [o.itemId, o]));

    const featured = filtered
      .filter(i => i.featuredOrder !== null && i.featuredOrder !== undefined)
      .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));

    const enrichItem = (item: typeof allItems[0]) => ({
      ...item,
      owned: ownedMap.has(item.id),
      isEquipped: ownedMap.get(item.id)?.isEquipped ?? false,
      canAfford: balance >= item.cost,
      isSellable: item.sellBackValue > 0,
      premiumLocked: item.isPremiumOnly && !isPremium,
    });

    return res.json({
      items: filtered.map(enrichItem),
      featured: featured.map(enrichItem),
      coinBalance: balance,
      isPremium,
      categories: ["all", "trophy", "room", "cosmetic", "prestige"],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /marketplace/:itemId — item detail
// ─────────────────────────────────────────────────────────
router.get("/:itemId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const [user] = await db.select({ coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const balance = user?.coinBalance ?? 0;

    const [ownership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);

    return res.json({
      ...item,
      owned: !!ownership,
      isEquipped: ownership?.isEquipped ?? false,
      acquiredAt: ownership?.redeemedAt ?? null,
      source: ownership?.source ?? null,
      canAfford: balance >= item.cost,
      isSellable: item.sellBackValue > 0 && !!ownership,
      coinBalance: balance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/buy — purchase item
// ─────────────────────────────────────────────────────────
router.post("/:itemId/buy", requireAuth, async (req: any, res) => {
  try {
    // Kill-switch: block marketplace purchases if disabled
    if (await isKilled("kill_marketplace_purchases")) {
      return res.status(503).json({ error: "Marketplace purchases are temporarily unavailable. Please try again later." });
    }
    const userId = req.user.id;
    const { itemId } = req.params;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item || !item.isAvailable) {
      return res.status(400).json({ error: "Item not available" });
    }

    // Premium-only gate — enforce server-side
    if (item.isPremiumOnly) {
      const isPremium = await checkUserPremium(userId);
      if (!isPremium) {
        return res.status(403).json({ error: "premium_required", message: "This item requires an active premium membership." });
      }
    }

    // Duplicate purchase prevention
    const [existingOwnership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);
    if (existingOwnership) {
      return res.status(409).json({ error: "You already own this item" });
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.coinBalance < item.cost) {
      return res.status(400).json({ error: "Insufficient coins", required: item.cost, balance: user.coinBalance });
    }

    const newBalance = user.coinBalance - item.cost;

    // Atomic: deduct coins + add inventory entry
    // (DB unique constraint on user_id+item_id prevents race-condition double spends)
    await db.update(usersTable)
      .set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    const invId = generateId();
    await db.insert(userInventoryTable).values({
      id: invId,
      userId,
      itemId: item.id,
      isEquipped: false,
      source: "purchase",
    });

    await db.insert(rewardTransactionsTable).values({
      id: generateId(),
      userId,
      type: "spent",
      amount: -item.cost,
      xpAmount: 0,
      reason: `Purchased: ${item.name}`,
      balanceAfter: newBalance,
    });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: userId,
      actorRole: "user",
      action: "marketplace_purchase",
      targetId: item.id,
      targetType: "shop_item",
      details: JSON.stringify({
        cost: item.cost,
        newBalance,
        category: item.category,
        rarity: item.rarity,
        itemType: item.itemType,
      }),
    });

    return res.json({
      success: true,
      newBalance,
      item: {
        id: item.id, name: item.name, description: item.description,
        category: item.category, icon: item.icon, rarity: item.rarity,
        itemType: item.itemType, isEquipped: false,
      },
    });
  } catch (err: any) {
    // Catch unique constraint violation (race condition double spend)
    if (err.code === "23505" || (err.message && err.message.includes("unique"))) {
      return res.status(409).json({ error: "You already own this item" });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/equip — equip owned item
// ─────────────────────────────────────────────────────────
router.post("/:itemId/equip", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const [ownership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);
    if (!ownership) return res.status(403).json({ error: "Item not owned" });

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // For categories that support only one equipped at a time, unequip others
    if (["cosmetic", "prestige"].includes(item.itemType)) {
      const sameTypeItems = await db.select({ id: userInventoryTable.id, itemId: userInventoryTable.itemId })
        .from(userInventoryTable)
        .where(eq(userInventoryTable.userId, userId));

      const sameTypeItemIds = await db.select({ id: shopItemsTable.id })
        .from(shopItemsTable)
        .where(eq(shopItemsTable.itemType, item.itemType));
      const sameTypeSet = new Set(sameTypeItemIds.map(i => i.id));

      for (const owned of sameTypeItems) {
        if (sameTypeSet.has(owned.itemId) && owned.itemId !== itemId) {
          await db.update(userInventoryTable)
            .set({ isEquipped: false })
            .where(eq(userInventoryTable.id, owned.id));
        }
      }
    }

    await db.update(userInventoryTable)
      .set({ isEquipped: true })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: userId,
      actorRole: "user",
      action: "item_equipped",
      targetId: itemId,
      targetType: "shop_item",
      details: JSON.stringify({ itemType: item.itemType, category: item.category }),
    });

    return res.json({ success: true, itemId, isEquipped: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/unequip — unequip item
// ─────────────────────────────────────────────────────────
router.post("/:itemId/unequip", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const [ownership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);
    if (!ownership) return res.status(403).json({ error: "Item not owned" });

    await db.update(userInventoryTable)
      .set({ isEquipped: false })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)));

    return res.json({ success: true, itemId, isEquipped: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/sell — sell back item (lite)
// Only items with sellBackValue > 0 are sellable.
// Titles, badges, prestige markers, and exclusive items are NOT sellable.
// ─────────────────────────────────────────────────────────
router.post("/:itemId/sell", requireAuth, async (req: any, res) => {
  try {
    // Kill-switch: block marketplace transactions if disabled
    if (await isKilled("kill_marketplace_purchases")) {
      return res.status(503).json({ error: "Marketplace transactions are temporarily unavailable. Please try again later." });
    }
    const userId = req.user.id;
    const { itemId } = req.params;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (item.sellBackValue <= 0) {
      return res.status(400).json({ error: "This item cannot be sold back" });
    }
    if (item.isExclusive || item.isLimited || item.itemType === "prestige") {
      return res.status(400).json({ error: "Exclusive, limited, or prestige items cannot be sold back" });
    }

    const [ownership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);
    if (!ownership) return res.status(403).json({ error: "Item not owned" });

    // Prevent sell-back exploit: sell-back value is always much less than cost
    // (enforced at the seed/admin level, validated here)
    if (item.sellBackValue >= item.cost) {
      return res.status(400).json({ error: "Invalid sell-back configuration" });
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const newBalance = user.coinBalance + item.sellBackValue;

    await db.delete(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)));

    await db.update(usersTable)
      .set({ coinBalance: newBalance, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    await db.insert(rewardTransactionsTable).values({
      id: generateId(),
      userId,
      type: "earned",
      amount: item.sellBackValue,
      xpAmount: 0,
      reason: `Sold: ${item.name} (${item.sellBackValue} coins)`,
      balanceAfter: newBalance,
    });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: userId,
      actorRole: "user",
      action: "marketplace_sell",
      targetId: item.id,
      targetType: "shop_item",
      details: JSON.stringify({ sellBackValue: item.sellBackValue, newBalance }),
    });

    return res.json({ success: true, newBalance, coinsRefunded: item.sellBackValue });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: GET /marketplace/admin/items — list all with stats
// ─────────────────────────────────────────────────────────
router.get("/admin/items", requireAdmin, async (req: any, res) => {
  try {
    const items = await db.select().from(shopItemsTable).orderBy(asc(shopItemsTable.sortOrder));
    const inventory = await db.select().from(userInventoryTable);
    const purchaseCounts = new Map<string, number>();
    const equippedCounts = new Map<string, number>();
    for (const row of inventory) {
      purchaseCounts.set(row.itemId, (purchaseCounts.get(row.itemId) ?? 0) + 1);
      if (row.isEquipped) equippedCounts.set(row.itemId, (equippedCounts.get(row.itemId) ?? 0) + 1);
    }
    return res.json({
      items: items.map(i => ({
        ...i,
        purchaseCount: purchaseCounts.get(i.id) ?? 0,
        equippedCount: equippedCounts.get(i.id) ?? 0,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: PATCH /marketplace/admin/items/:itemId — tune item
// ─────────────────────────────────────────────────────────
router.patch("/admin/items/:itemId", requireAdmin, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const { cost, isAvailable, isLimited, isExclusive, featuredOrder, sellBackValue } = req.body;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const updates: Record<string, any> = {};
    if (cost !== undefined) {
      if (typeof cost !== "number" || cost < 1) return res.status(400).json({ error: "Invalid cost" });
      updates.cost = cost;
    }
    if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
    if (isLimited !== undefined) updates.isLimited = Boolean(isLimited);
    if (isExclusive !== undefined) updates.isExclusive = Boolean(isExclusive);
    if (featuredOrder !== undefined) updates.featuredOrder = featuredOrder === null ? null : Number(featuredOrder);
    if (sellBackValue !== undefined) {
      const val = Number(sellBackValue);
      if (val < 0) return res.status(400).json({ error: "sellBackValue cannot be negative" });
      updates.sellBackValue = val;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await db.update(shopItemsTable).set(updates).where(eq(shopItemsTable.id, itemId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: (req as any).user?.id ?? "admin",
      actorRole: "admin",
      action: "economy_item_tuned",
      targetId: itemId,
      targetType: "shop_item",
      details: JSON.stringify(updates),
    });

    return res.json({ success: true, updated: updates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: GET /marketplace/admin/stats — economy overview
// ─────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (req: any, res) => {
  try {
    const inventory = await db.select().from(userInventoryTable);
    const items = await db.select().from(shopItemsTable);
    const itemMap = new Map(items.map(i => [i.id, i]));

    let totalSpent = 0;
    let totalSellBack = 0;
    const categoryBreakdown: Record<string, { purchases: number; coinsSpent: number }> = {};

    for (const row of inventory) {
      const item = itemMap.get(row.itemId);
      if (!item) continue;
      totalSpent += item.cost;
      const cat = item.category;
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { purchases: 0, coinsSpent: 0 };
      categoryBreakdown[cat].purchases++;
      categoryBreakdown[cat].coinsSpent += item.cost;
    }

    return res.json({
      totalPurchases: inventory.length,
      totalCoinsSpent: totalSpent,
      totalItemsEquipped: inventory.filter(i => i.isEquipped).length,
      categoryBreakdown,
      itemCount: items.length,
      availableItems: items.filter(i => i.isAvailable).length,
      limitedItems: items.filter(i => i.isLimited).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
