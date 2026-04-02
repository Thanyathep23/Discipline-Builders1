import { Router } from "express";
import {
  db, usersTable, shopItemsTable, userInventoryTable,
  rewardTransactionsTable, auditLogTable, catalogCategoriesTable,
} from "@workspace/db";
import { checkUserPremium } from "./premium.js";
import { eq, and, asc, desc, or, ilike, inArray, isNull, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { isKilled } from "../lib/kill-switches.js";
import { WARDROBE_PRESTIGE_MAP } from "./wearables.js";
import { z } from "zod";

const router = Router();

// ─────────────────────────────────────────────────────────
// HARDCODED SEED — 13 items preserved from Phase 17
// Phase 22: seeded with slug, status, tags, equip/display flags
// ─────────────────────────────────────────────────────────
const MARKETPLACE_ITEMS = [
  { id: "asset-focus-trophy",     name: "Focus Trophy",       description: "A symbolic trophy for committed deep work. Displayed in your command center.",                       cost: 80,   category: "trophy",   icon: "trophy",           rarity: "uncommon", itemType: "trophy",   isLimited: false, sellBackValue: 20,  sortOrder: 10, featuredOrder: null, slug: "focus-trophy",    tags: '["trophies","focus"]',    isEquippable: true,  isDisplayable: true,  isWorldItem: true,  isProfileItem: false },
  { id: "asset-discipline-medal", name: "Discipline Medal",   description: "Awarded to those who build real, lasting discipline.",                                               cost: 120,  category: "trophy",   icon: "medal",            rarity: "rare",     itemType: "trophy",   isLimited: false, sellBackValue: 30,  sortOrder: 20, featuredOrder: 1,    slug: "discipline-medal", tags: '["trophies","discipline"]', isEquippable: true,  isDisplayable: true,  isWorldItem: true,  isProfileItem: true  },
  { id: "asset-proof-vault",      name: "Proof Vault",        description: "A symbolic vault for verified excellence. Signifies a high proof approval rate.",                   cost: 180,  category: "trophy",   icon: "lock-closed",      rarity: "rare",     itemType: "trophy",   isLimited: false, sellBackValue: 45,  sortOrder: 30, featuredOrder: null, slug: "proof-vault",     tags: '["trophies","proof"]',    isEquippable: true,  isDisplayable: true,  isWorldItem: true,  isProfileItem: false },
  { id: "asset-chain-breaker",    name: "Chain Breaker",      description: "For operators who complete the hardest quest chains under pressure.",                               cost: 280,  category: "trophy",   icon: "git-branch",       rarity: "epic",     itemType: "trophy",   isLimited: false, sellBackValue: 0,   sortOrder: 40, featuredOrder: 2,    slug: "chain-breaker",   tags: '["trophies","quests"]',   isEquippable: true,  isDisplayable: true,  isWorldItem: false, isProfileItem: true  },
  { id: "asset-iron-log",         name: "Iron Log",           description: "30 consecutive sessions logged. Undeniable proof of relentless execution.",                        cost: 320,  category: "trophy",   icon: "barbell",          rarity: "epic",     itemType: "trophy",   isLimited: true,  sellBackValue: 0,   sortOrder: 50, featuredOrder: null, slug: "iron-log",        tags: '["trophies","streak","limited"]', isEquippable: true, isDisplayable: true, isWorldItem: true, isProfileItem: true },
  { id: "asset-focus-shrine",     name: "Focus Shrine",       description: "A command center upgrade — the dedicated deep work environment. Serious operators only.",          cost: 200,  category: "room",     icon: "home",             rarity: "rare",     itemType: "room",     isLimited: false, sellBackValue: 50,  sortOrder: 10, featuredOrder: null, slug: "focus-shrine",    tags: '["room","environment"]',  isEquippable: false, isDisplayable: true,  isWorldItem: true,  isProfileItem: false },
  { id: "asset-command-terminal", name: "Command Terminal",   description: "Elite workspace upgrade. A black-glass terminal for operators at the highest level.",              cost: 350,  category: "room",     icon: "desktop-outline",  rarity: "epic",     itemType: "room",     isLimited: false, sellBackValue: 0,   sortOrder: 20, featuredOrder: 3,    slug: "command-terminal", tags: '["room","environment","prestige"]', isEquippable: false, isDisplayable: true, isWorldItem: true, isProfileItem: false },
  { id: "asset-war-room",         name: "War Room",           description: "The inner sanctum. Reserved for those who plan, execute, and dominate their craft.",              cost: 600,  category: "room",     icon: "business",         rarity: "legendary", itemType: "room",   isLimited: true,  sellBackValue: 0,   sortOrder: 30, featuredOrder: null, slug: "war-room",        tags: '["room","environment","limited","legendary"]', isEquippable: false, isDisplayable: true, isWorldItem: true, isProfileItem: false },
  { id: "asset-gold-ribbon",      name: "Gold Ribbon",        description: "A prestige marker worn by top performers. Displayed on your profile header.",                     cost: 250,  category: "cosmetic", icon: "ribbon",           rarity: "rare",     itemType: "cosmetic", isLimited: false, sellBackValue: 60,  sortOrder: 10, featuredOrder: null, slug: "gold-ribbon",     tags: '["cosmetic","profile"]',  isEquippable: true,  isDisplayable: true,  isWorldItem: false, isProfileItem: true  },
  { id: "asset-silver-frame",     name: "Silver Frame",       description: "A profile frame for consistent mid-tier performers. Clean, earned, visible.",                     cost: 150,  category: "cosmetic", icon: "images-outline",   rarity: "uncommon", itemType: "cosmetic", isLimited: false, sellBackValue: 35,  sortOrder: 20, featuredOrder: null, slug: "silver-frame",    tags: '["cosmetic","profile"]',  isEquippable: true,  isDisplayable: false, isWorldItem: false, isProfileItem: true  },
  { id: "asset-command-badge",    name: "Command Badge",      description: "An operator badge worn on the profile. Indicates command-level discipline.",                      cost: 200,  category: "cosmetic", icon: "shield-checkmark", rarity: "rare",     itemType: "cosmetic", isLimited: false, sellBackValue: 50,  sortOrder: 30, featuredOrder: null, slug: "command-badge",   tags: '["cosmetic","profile","badge"]', isEquippable: true, isDisplayable: false, isWorldItem: false, isProfileItem: true },
  { id: "asset-prestige-seal",    name: "Prestige Seal",      description: "A first-cycle prestige marker. Shows you have completed a full discipline arc.",                  cost: 400,  category: "prestige", icon: "star",             rarity: "epic",     itemType: "prestige", isLimited: false, sellBackValue: 0,   sortOrder: 10, featuredOrder: 4,    slug: "prestige-seal",   tags: '["prestige","identity"]', isEquippable: true,  isDisplayable: true,  isWorldItem: false, isProfileItem: true  },
  { id: "asset-apex-marker",      name: "Apex Marker",        description: "Reserved for multi-cycle prestige. You have proven mastery across multiple arcs.",               cost: 800,  category: "prestige", icon: "flame",            rarity: "legendary", itemType: "prestige", isLimited: true, sellBackValue: 0,   sortOrder: 20, featuredOrder: null, slug: "apex-marker",     tags: '["prestige","identity","limited","legendary"]', isEquippable: true, isDisplayable: true, isWorldItem: false, isProfileItem: true },
  { id: "asset-operator-sigil",   name: "Operator Sigil",     description: "A rare exclusive sigil. Not for sale to most — earned through extreme consistency.",             cost: 500,  category: "prestige", icon: "planet",           rarity: "epic",     itemType: "prestige", isLimited: true, isExclusive: true, sellBackValue: 0, sortOrder: 30, featuredOrder: null, slug: "operator-sigil",  tags: '["prestige","exclusive","identity"]', isEquippable: true, isDisplayable: true, isWorldItem: false, isProfileItem: true },
];

// Default catalog categories seed
const DEFAULT_CATEGORIES = [
  { id: "cat-all",       slug: "all",       name: "All",              parentId: null, icon: "grid-outline",        sortOrder: 0  },
  { id: "cat-trophy",    slug: "trophy",    name: "Trophies",         parentId: null, icon: "trophy-outline",      sortOrder: 10 },
  { id: "cat-room",      slug: "room",      name: "Room / Workspace", parentId: null, icon: "home-outline",        sortOrder: 20 },
  { id: "cat-cosmetic",  slug: "cosmetic",  name: "Cosmetics",        parentId: null, icon: "color-palette-outline", sortOrder: 30 },
  { id: "cat-prestige",  slug: "prestige",  name: "Prestige / Identity", parentId: null, icon: "star-outline",     sortOrder: 40 },
  { id: "cat-watches",   slug: "watches",   name: "Watches",          parentId: null, icon: "time-outline",        sortOrder: 50 },
  { id: "cat-vehicles",  slug: "vehicles",  name: "Vehicles",         parentId: null, icon: "car-outline",         sortOrder: 60 },
  { id: "cat-jewelry",   slug: "jewelry",   name: "Jewelry",          parentId: null, icon: "diamond-outline",     sortOrder: 70 },
  { id: "cat-fashion",   slug: "fashion",   name: "Fashion / Style",  parentId: null, icon: "shirt-outline",       sortOrder: 80 },
  { id: "cat-lifestyle", slug: "lifestyle", name: "Lifestyle",        parentId: null, icon: "cafe-outline",        sortOrder: 90 },
  { id: "cat-limited",   slug: "limited",   name: "Limited / Event",  parentId: null, icon: "timer-outline",       sortOrder: 100 },
  { id: "cat-premium",   slug: "premium",   name: "Premium / Exclusive", parentId: null, icon: "diamond-outline",  sortOrder: 110 },
];

async function seedMarketplace() {
  for (const item of MARKETPLACE_ITEMS) {
    const { isExclusive, ...rest } = item as any;
    await db.insert(shopItemsTable).values({
      ...rest,
      isAvailable: true,
      isExclusive: isExclusive ?? false,
      acquisitionSource: "purchase",
      status: "active",
      featuredOrder: (item as any).featuredOrder ?? null,
    }).onConflictDoNothing();
    // Update Phase 22 fields for existing items (slug, tags, flags)
    await db.update(shopItemsTable)
      .set({
        slug: rest.slug,
        tags: rest.tags,
        isEquippable: rest.isEquippable,
        isDisplayable: rest.isDisplayable,
        isWorldItem: rest.isWorldItem,
        isProfileItem: rest.isProfileItem,
        status: "active",
      })
      .where(and(eq(shopItemsTable.id, rest.id)));
  }
  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(catalogCategoriesTable).values(cat).onConflictDoNothing();
  }
}

// ─────────────────────────────────────────────────────────
// Helper: build visibility filter for storefront
// Active = status 'active' AND isAvailable AND
//   (no availableFrom OR availableFrom <= now) AND
//   (no availableUntil OR availableUntil >= now)
// ─────────────────────────────────────────────────────────
function isStorefrontVisible(item: any, now: Date): boolean {
  if (!item.isAvailable) return false;
  if (item.status !== "active") return false;
  if (item.availableFrom && new Date(item.availableFrom) > now) return false;
  if (item.availableUntil && new Date(item.availableUntil) < now) return false;
  return true;
}

// ─────────────────────────────────────────────────────────
// GET /marketplace/catalog/categories — storefront categories
// ─────────────────────────────────────────────────────────
router.get("/catalog/categories", requireAuth, async (_req, res) => {
  try {
    const cats = await db.select().from(catalogCategoriesTable)
      .where(eq(catalogCategoriesTable.isActive, true))
      .orderBy(asc(catalogCategoriesTable.sortOrder));
    return res.json({ categories: cats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /marketplace — browse with filtering/sorting/search
// ─────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: any, res) => {
  try {
    await seedMarketplace();
    const userId = req.user.id;
    const category    = (req.query.category as string | undefined) ?? "all";
    const subcategory = req.query.subcategory as string | undefined;
    const tag         = req.query.tag as string | undefined;
    const sort        = (req.query.sort as string | undefined) ?? "featured";
    const search      = req.query.search as string | undefined;
    const rarity      = req.query.rarity as string | undefined;
    const premiumOnly = req.query.premiumOnly === "true";
    const limitedOnly = req.query.limitedOnly === "true";

    const [user] = await db.select({ coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const balance = user?.coinBalance ?? 0;
    const isPremium = await checkUserPremium(userId);

    const allItems = await db.select().from(shopItemsTable);
    const now = new Date();
    let visible = allItems.filter(i => isStorefrontVisible(i, now));

    // Category filter
    if (category && category !== "all") {
      visible = visible.filter(i => i.category === category);
    }
    // Subcategory filter
    if (subcategory) {
      visible = visible.filter(i => i.subcategory === subcategory);
    }
    // Tag filter (tags stored as JSON array string)
    if (tag) {
      visible = visible.filter(i => {
        try { return (JSON.parse(i.tags ?? "[]") as string[]).includes(tag); } catch { return false; }
      });
    }
    // Rarity filter
    if (rarity) {
      visible = visible.filter(i => i.rarity === rarity);
    }
    // Premium filter
    if (premiumOnly) {
      visible = visible.filter(i => i.isPremiumOnly);
    }
    // Limited filter
    if (limitedOnly) {
      visible = visible.filter(i => i.isLimited);
    }
    // Search
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      visible = visible.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.tags ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    const RARITY_ORDER: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    if (sort === "price_asc")   visible.sort((a, b) => a.cost - b.cost);
    else if (sort === "price_desc") visible.sort((a, b) => b.cost - a.cost);
    else if (sort === "rarity")     visible.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 5) - (RARITY_ORDER[b.rarity] ?? 5));
    else if (sort === "newest")     visible.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else                            visible.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)); // featured/default

    const owned = await db.select().from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedMap = new Map(owned.map(o => [o.itemId, o]));

    const featured = allItems
      .filter(i => isStorefrontVisible(i, now) && i.featuredOrder !== null && i.featuredOrder !== undefined)
      .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99));

    const cats = await db.select().from(catalogCategoriesTable)
      .where(eq(catalogCategoriesTable.isActive, true))
      .orderBy(asc(catalogCategoriesTable.sortOrder));

    const enrichItem = (item: typeof allItems[0]) => {
      const ownership = ownedMap.get(item.id);
      const applicableSurfaces: string[] = [];
      if (item.isEquippable) applicableSurfaces.push("character");
      if (item.isWorldItem)  applicableSurfaces.push("world");
      if (item.isProfileItem) applicableSurfaces.push("profile");
      let applicationMode = "passive";
      if (item.isEquippable && item.isDisplayable) applicationMode = "equip_and_display";
      else if (item.isEquippable) applicationMode = "equip";
      else if (item.isDisplayable) applicationMode = "display";
      return {
        ...item,
        tags: (() => { try { return JSON.parse(item.tags ?? "[]"); } catch { return []; } })(),
        owned: ownedMap.has(item.id),
        isEquipped: ownership?.isEquipped ?? false,
        displaySlot: ownership?.displaySlot ?? null,
        canAfford: balance >= item.cost,
        isSellable: item.sellBackValue > 0,
        premiumLocked: item.isPremiumOnly && !isPremium,
        applicableSurfaces,
        applicationMode,
      };
    };

    return res.json({
      items: visible.map(enrichItem),
      featured: featured.map(enrichItem),
      coinBalance: balance,
      isPremium,
      categories: cats.map(c => ({ slug: c.slug, name: c.name, icon: c.icon, parentId: c.parentId })),
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
    const isPremium = await checkUserPremium(userId);

    const [ownership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);

    const now = new Date();
    const visible = isStorefrontVisible(item, now);

    // Compute application model fields
    const applicableSurfaces: string[] = [];
    if (item.isEquippable) applicableSurfaces.push("character");
    if (item.isWorldItem)  applicableSurfaces.push("world");
    if (item.isProfileItem) applicableSurfaces.push("profile");

    let applicationMode = "passive";
    if (item.isEquippable && item.isDisplayable) applicationMode = "equip_and_display";
    else if (item.isEquippable) applicationMode = "equip";
    else if (item.isDisplayable) applicationMode = "display";

    const SLOT_BY_TYPE: Record<string, string[]> = {
      room:     ["room_theme"],
      trophy:   ["trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3", "centerpiece"],
      prestige: ["prestige_marker", "centerpiece"],
    };
    const slotEligibility = SLOT_BY_TYPE[item.itemType] ?? SLOT_BY_TYPE[item.category] ?? [];

    // Current display slot if owned
    const displaySlot = ownership?.displaySlot ?? null;

    return res.json({
      ...item,
      tags: (() => { try { return JSON.parse(item.tags ?? "[]"); } catch { return []; } })(),
      owned: !!ownership,
      isEquipped: ownership?.isEquipped ?? false,
      displaySlot,
      acquiredAt: ownership?.redeemedAt ?? null,
      source: ownership?.source ?? null,
      canAfford: balance >= item.cost,
      isSellable: item.sellBackValue > 0 && !!ownership,
      coinBalance: balance,
      premiumLocked: item.isPremiumOnly && !isPremium,
      isVisible: visible,
      applicableSurfaces,
      applicationMode,
      slotEligibility,
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
    if (await isKilled("kill_marketplace_purchases")) {
      return res.status(503).json({ error: "Marketplace purchases are temporarily unavailable." });
    }
    const userId = req.user.id;
    const { itemId } = req.params;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(400).json({ error: "Item not found" });

    const now = new Date();
    if (!isStorefrontVisible(item, now)) {
      return res.status(400).json({ error: "Item not available" });
    }

    if (item.isPremiumOnly) {
      const isPremium = await checkUserPremium(userId);
      if (!isPremium) {
        return res.status(403).json({ error: "premium_required", message: "This item requires an active premium membership." });
      }
    }

    const [existingOwnership] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId))).limit(1);
    if (existingOwnership) {
      return res.status(409).json({ error: "You already own this item" });
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const prestigeReq = WARDROBE_PRESTIGE_MAP.get(itemId) ?? 0;
    if (prestigeReq > 0 && (user.prestigeTier ?? 0) < prestigeReq) {
      return res.status(403).json({ error: `This item requires Prestige ${prestigeReq}.`, prestigeRequired: prestigeReq });
    }

    if ((item.minLevel ?? 0) > 0 && (user.level ?? 1) < (item.minLevel ?? 0)) {
      return res.status(403).json({ error: `This item requires Level ${item.minLevel}.`, minLevel: item.minLevel, userLevel: user.level ?? 1 });
    }

    const devMode = req.query.devMode === "true" && process.env.NODE_ENV !== "production";
    if (!devMode && user.coinBalance < item.cost) {
      trackEvent(Events.ITEM_PURCHASE_FAILED, userId, { itemId, reason: "insufficient_coins", cost: item.cost, balance: user.coinBalance, store: "marketplace" }).catch(() => {});
      return res.status(400).json({ error: "Insufficient coins", required: item.cost, balance: user.coinBalance });
    }

    const beforeBalance = user.coinBalance;
    const newBalance = devMode ? user.coinBalance : (user.coinBalance - item.cost);

    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ coinBalance: newBalance, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));

      await tx.insert(userInventoryTable).values({
        id: generateId(),
        userId,
        itemId: item.id,
        isEquipped: false,
        source: "purchase",
      });

      await tx.insert(rewardTransactionsTable).values({
        id: generateId(),
        userId,
        type: "spent",
        amount: item.cost,
        xpAmount: 0,
        reason: `Purchased: ${item.name}`,
        balanceAfter: newBalance,
      });

      await tx.insert(auditLogTable).values({
        id: generateId(),
        actorId: userId,
        actorRole: "user",
        action: "marketplace_purchase",
        targetId: item.id,
        targetType: "shop_item",
        details: JSON.stringify({ cost: item.cost, newBalance, category: item.category, rarity: item.rarity, itemType: item.itemType }),
      });
    });

    console.log(`[Purchase] item=${item.name} user=${userId} before=${beforeBalance} after=${newBalance} cost=${item.cost}`);
    trackEvent(Events.ITEM_PURCHASED, userId, { itemId: item.id, cost: item.cost, category: item.category, store: "marketplace" }).catch(() => {});

    return res.json({
      success: true,
      newBalance,
      item: { id: item.id, name: item.name, description: item.description, category: item.category, icon: item.icon, rarity: item.rarity, itemType: item.itemType, isEquipped: false },
    });
  } catch (err: any) {
    if (err.code === "23505" || (err.message && err.message.includes("unique"))) {
      return res.status(409).json({ error: "You already own this item" });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/equip
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

    if (!item.isEquippable) {
      return res.status(400).json({ error: "This item cannot be equipped" });
    }

    // Level + prestige lock enforcement for wearable items
    const prestigeReq = WARDROBE_PRESTIGE_MAP.get(itemId) ?? 0;
    if ((item.minLevel ?? 0) > 0 || prestigeReq > 0) {
      const [userRow] = await db.select({ level: usersTable.level, prestigeTier: usersTable.prestigeTier }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if ((userRow?.level ?? 1) < (item.minLevel ?? 0)) {
        return res.status(403).json({ error: `This item requires level ${item.minLevel}.`, requiredLevel: item.minLevel });
      }
      if (prestigeReq > 0 && (userRow?.prestigeTier ?? 0) < prestigeReq) {
        return res.status(403).json({ error: `This item requires Prestige ${prestigeReq}.`, prestigeRequired: prestigeReq });
      }
    }

    // Phase 29 — Wearable slot mutual exclusivity: unequip same slot first
    if (item.wearableSlot) {
      const sameSlotItems = await db
        .select({ id: shopItemsTable.id })
        .from(shopItemsTable)
        .where(eq(shopItemsTable.wearableSlot, item.wearableSlot));
      const sameSlotIds = sameSlotItems.map((i) => i.id).filter((id) => id !== itemId);
      if (sameSlotIds.length > 0) {
        await db
          .update(userInventoryTable)
          .set({ isEquipped: false })
          .where(and(eq(userInventoryTable.userId, userId), inArray(userInventoryTable.itemId, sameSlotIds)));
      }
    } else if (["cosmetic", "prestige"].includes(item.itemType)) {
      // Legacy type-based mutual exclusivity for non-wearable cosmetics
      const sameTypeItems = await db.select({ id: userInventoryTable.id, itemId: userInventoryTable.itemId })
        .from(userInventoryTable).where(eq(userInventoryTable.userId, userId));
      const sameTypeItemIds = await db.select({ id: shopItemsTable.id })
        .from(shopItemsTable).where(eq(shopItemsTable.itemType, item.itemType));
      const sameTypeSet = new Set(sameTypeItemIds.map(i => i.id));
      for (const owned of sameTypeItems) {
        if (sameTypeSet.has(owned.itemId) && owned.itemId !== itemId) {
          await db.update(userInventoryTable).set({ isEquipped: false }).where(eq(userInventoryTable.id, owned.id));
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

    trackEvent(Events.ITEM_EQUIPPED, userId, { itemId, category: item.category, slot: item.wearableSlot }).catch(() => {});
    if (item.wearableSlot) {
      trackEvent(Events.WARDROBE_EQUIPPED, userId, { itemId, slot: item.wearableSlot }).catch(() => {});
    }

    return res.json({ success: true, itemId, isEquipped: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /marketplace/:itemId/unequip
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
// POST /marketplace/:itemId/sell
// ─────────────────────────────────────────────────────────
router.post("/:itemId/sell", requireAuth, async (req: any, res) => {
  try {
    if (await isKilled("kill_marketplace_purchases")) {
      return res.status(503).json({ error: "Marketplace transactions are temporarily unavailable." });
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
// ADMIN: GET /marketplace/admin/items
// ─────────────────────────────────────────────────────────
router.get("/admin/items", requireAdmin, async (_req, res) => {
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
        tags: (() => { try { return JSON.parse(i.tags ?? "[]"); } catch { return []; } })(),
        purchaseCount: purchaseCounts.get(i.id) ?? 0,
        equippedCount: equippedCounts.get(i.id) ?? 0,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: POST /marketplace/admin/items — create product
// ─────────────────────────────────────────────────────────
const createItemSchema = z.object({
  name:             z.string().min(2).max(100),
  description:      z.string().min(1).max(500),
  fullDescription:  z.string().max(2000).optional(),
  cost:             z.number().int().min(1),
  category:         z.string().min(1),
  subcategory:      z.string().optional(),
  icon:             z.string().min(1).default("gift"),
  rarity:           z.enum(["common", "uncommon", "rare", "epic", "legendary"]).default("common"),
  itemType:         z.string().min(1).default("cosmetic"),
  tags:             z.array(z.string()).default([]),
  status:           z.enum(["draft", "active", "inactive", "scheduled", "expired", "archived"]).default("draft"),
  isAvailable:      z.boolean().default(false),
  isLimited:        z.boolean().default(false),
  isExclusive:      z.boolean().default(false),
  isPremiumOnly:    z.boolean().default(false),
  isEquippable:     z.boolean().default(true),
  isDisplayable:    z.boolean().default(false),
  isProfileItem:    z.boolean().default(false),
  isWorldItem:      z.boolean().default(false),
  sellBackValue:    z.number().int().min(0).default(0),
  sortOrder:        z.number().int().default(0),
  featuredOrder:    z.number().int().nullable().optional(),
  acquisitionSource: z.string().default("purchase"),
  previewImage:     z.string().url().optional(),
  availableFrom:    z.string().datetime().optional(),
  availableUntil:   z.string().datetime().optional(),
  eventId:          z.string().optional(),
  contentPackId:    z.string().optional(),
  slug:             z.string().regex(/^[a-z0-9-]+$/).optional(),
});

router.post("/admin/items", requireAdmin, async (req: any, res) => {
  try {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }
    const d = parsed.data;

    // Validate: sellBackValue must be < cost if nonzero
    if (d.sellBackValue > 0 && d.sellBackValue >= d.cost) {
      return res.status(400).json({ error: "sellBackValue must be less than cost" });
    }
    // Validate: exclusive/limited items cannot have sell-back
    if ((d.isExclusive || d.isLimited || d.itemType === "prestige") && d.sellBackValue > 0) {
      return res.status(400).json({ error: "Exclusive, limited, or prestige items cannot have sellBackValue" });
    }
    // Validate scheduling window
    if (d.availableFrom && d.availableUntil && new Date(d.availableFrom) >= new Date(d.availableUntil)) {
      return res.status(400).json({ error: "availableFrom must be before availableUntil" });
    }

    const id = generateId();
    const slug = d.slug ?? id;

    // Ensure slug is unique
    const [existingSlug] = await db.select({ id: shopItemsTable.id })
      .from(shopItemsTable).where(eq(shopItemsTable.slug, slug)).limit(1);
    if (existingSlug) {
      return res.status(409).json({ error: "Slug already in use" });
    }

    await db.insert(shopItemsTable).values({
      id,
      slug,
      name: d.name,
      description: d.description,
      fullDescription: d.fullDescription ?? null,
      cost: d.cost,
      category: d.category,
      subcategory: d.subcategory ?? null,
      icon: d.icon,
      rarity: d.rarity,
      itemType: d.itemType,
      tags: JSON.stringify(d.tags),
      status: d.status,
      isAvailable: d.status === "active" ? d.isAvailable : false,
      isLimited: d.isLimited,
      isExclusive: d.isExclusive,
      isPremiumOnly: d.isPremiumOnly,
      isEquippable: d.isEquippable,
      isDisplayable: d.isDisplayable,
      isProfileItem: d.isProfileItem,
      isWorldItem: d.isWorldItem,
      sellBackValue: d.sellBackValue,
      sortOrder: d.sortOrder,
      featuredOrder: d.featuredOrder ?? null,
      acquisitionSource: d.acquisitionSource,
      previewImage: d.previewImage ?? null,
      availableFrom: d.availableFrom ? new Date(d.availableFrom) : null,
      availableUntil: d.availableUntil ? new Date(d.availableUntil) : null,
      eventId: d.eventId ?? null,
      contentPackId: d.contentPackId ?? null,
      updatedAt: new Date(),
    });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: (req as any).user?.id ?? "admin",
      actorRole: "admin",
      action: "catalog_item_created",
      targetId: id,
      targetType: "shop_item",
      details: JSON.stringify({ name: d.name, category: d.category, status: d.status, cost: d.cost }),
    });

    return res.status(201).json({ success: true, id, slug });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Slug already in use" });
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: PATCH /marketplace/admin/items/:itemId — full edit
// ─────────────────────────────────────────────────────────
const updateItemSchema = z.object({
  name:             z.string().min(2).max(100).optional(),
  description:      z.string().max(500).optional(),
  fullDescription:  z.string().max(2000).nullable().optional(),
  cost:             z.number().int().min(1).optional(),
  category:         z.string().optional(),
  subcategory:      z.string().nullable().optional(),
  icon:             z.string().optional(),
  rarity:           z.enum(["common", "uncommon", "rare", "epic", "legendary"]).optional(),
  itemType:         z.string().optional(),
  tags:             z.array(z.string()).optional(),
  status:           z.enum(["draft", "active", "inactive", "scheduled", "expired", "archived"]).optional(),
  isAvailable:      z.boolean().optional(),
  isLimited:        z.boolean().optional(),
  isExclusive:      z.boolean().optional(),
  isPremiumOnly:    z.boolean().optional(),
  isEquippable:     z.boolean().optional(),
  isDisplayable:    z.boolean().optional(),
  isProfileItem:    z.boolean().optional(),
  isWorldItem:      z.boolean().optional(),
  sellBackValue:    z.number().int().min(0).optional(),
  sortOrder:        z.number().int().optional(),
  featuredOrder:    z.number().int().nullable().optional(),
  previewImage:     z.string().url().nullable().optional(),
  availableFrom:    z.string().datetime().nullable().optional(),
  availableUntil:   z.string().datetime().nullable().optional(),
  eventId:          z.string().nullable().optional(),
  contentPackId:    z.string().nullable().optional(),
}).strict();

router.patch("/admin/items/:itemId", requireAdmin, async (req: any, res) => {
  try {
    const { itemId } = req.params;
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const d = parsed.data;
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (d.name !== undefined)            updates.name = d.name;
    if (d.description !== undefined)     updates.description = d.description;
    if (d.fullDescription !== undefined) updates.fullDescription = d.fullDescription;
    if (d.cost !== undefined)            updates.cost = d.cost;
    if (d.category !== undefined)        updates.category = d.category;
    if (d.subcategory !== undefined)     updates.subcategory = d.subcategory;
    if (d.icon !== undefined)            updates.icon = d.icon;
    if (d.rarity !== undefined)          updates.rarity = d.rarity;
    if (d.itemType !== undefined)        updates.itemType = d.itemType;
    if (d.tags !== undefined)            updates.tags = JSON.stringify(d.tags);
    if (d.status !== undefined)          updates.status = d.status;
    if (d.isAvailable !== undefined)     updates.isAvailable = d.isAvailable;
    if (d.isLimited !== undefined)       updates.isLimited = d.isLimited;
    if (d.isExclusive !== undefined)     updates.isExclusive = d.isExclusive;
    if (d.isPremiumOnly !== undefined)   updates.isPremiumOnly = d.isPremiumOnly;
    if (d.isEquippable !== undefined)    updates.isEquippable = d.isEquippable;
    if (d.isDisplayable !== undefined)   updates.isDisplayable = d.isDisplayable;
    if (d.isProfileItem !== undefined)   updates.isProfileItem = d.isProfileItem;
    if (d.isWorldItem !== undefined)     updates.isWorldItem = d.isWorldItem;
    if (d.sellBackValue !== undefined)   updates.sellBackValue = d.sellBackValue;
    if (d.sortOrder !== undefined)       updates.sortOrder = d.sortOrder;
    if (d.featuredOrder !== undefined)   updates.featuredOrder = d.featuredOrder;
    if (d.previewImage !== undefined)    updates.previewImage = d.previewImage;
    if (d.availableFrom !== undefined)   updates.availableFrom = d.availableFrom ? new Date(d.availableFrom) : null;
    if (d.availableUntil !== undefined)  updates.availableUntil = d.availableUntil ? new Date(d.availableUntil) : null;
    if (d.eventId !== undefined)         updates.eventId = d.eventId;
    if (d.contentPackId !== undefined)   updates.contentPackId = d.contentPackId;

    // Validate after merge
    const effectiveCost       = updates.cost ?? item.cost;
    const effectiveSellBack   = updates.sellBackValue ?? item.sellBackValue;
    const effectiveExclusive  = updates.isExclusive ?? item.isExclusive;
    const effectiveLimited    = updates.isLimited ?? item.isLimited;
    const effectiveItemType   = updates.itemType ?? item.itemType;

    if (effectiveSellBack > 0 && effectiveSellBack >= effectiveCost) {
      return res.status(400).json({ error: "sellBackValue must be less than cost" });
    }
    if ((effectiveExclusive || effectiveLimited || effectiveItemType === "prestige") && effectiveSellBack > 0) {
      return res.status(400).json({ error: "Exclusive, limited, or prestige items cannot have sellBackValue" });
    }

    const effectiveFrom  = updates.availableFrom  ?? item.availableFrom;
    const effectiveUntil = updates.availableUntil ?? item.availableUntil;
    if (effectiveFrom && effectiveUntil && new Date(effectiveFrom) >= new Date(effectiveUntil)) {
      return res.status(400).json({ error: "availableFrom must be before availableUntil" });
    }

    if (Object.keys(updates).length <= 1) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await db.update(shopItemsTable).set(updates).where(eq(shopItemsTable.id, itemId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: (req as any).user?.id ?? "admin",
      actorRole: "admin",
      action: "catalog_item_updated",
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
// ADMIN: DELETE /marketplace/admin/items/:itemId — archive
// ─────────────────────────────────────────────────────────
router.delete("/admin/items/:itemId", requireAdmin, async (req: any, res) => {
  try {
    const { itemId } = req.params;

    const [item] = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    // Soft-archive rather than hard delete to preserve inventory references
    await db.update(shopItemsTable)
      .set({ status: "archived", isAvailable: false, updatedAt: new Date() })
      .where(eq(shopItemsTable.id, itemId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: (req as any).user?.id ?? "admin",
      actorRole: "admin",
      action: "catalog_item_archived",
      targetId: itemId,
      targetType: "shop_item",
      details: JSON.stringify({ name: item.name }),
    });

    return res.json({ success: true, archived: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: GET /marketplace/admin/categories
// ─────────────────────────────────────────────────────────
router.get("/admin/categories", requireAdmin, async (_req, res) => {
  try {
    const cats = await db.select().from(catalogCategoriesTable)
      .orderBy(asc(catalogCategoriesTable.sortOrder));
    return res.json({ categories: cats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: POST /marketplace/admin/categories — create category
// ─────────────────────────────────────────────────────────
const createCatSchema = z.object({
  slug:      z.string().regex(/^[a-z0-9-]+$/),
  name:      z.string().min(1).max(80),
  parentId:  z.string().nullable().optional(),
  icon:      z.string().default("grid-outline"),
  sortOrder: z.number().int().default(0),
});

router.post("/admin/categories", requireAdmin, async (req: any, res) => {
  try {
    const parsed = createCatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }
    const d = parsed.data;
    const id = `cat-${d.slug}`;

    await db.insert(catalogCategoriesTable).values({
      id,
      slug: d.slug,
      name: d.name,
      parentId: d.parentId ?? null,
      icon: d.icon,
      sortOrder: d.sortOrder,
      isActive: true,
    });

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: (req as any).user?.id ?? "admin",
      actorRole: "admin",
      action: "catalog_category_created",
      targetId: id,
      targetType: "catalog_category",
      details: JSON.stringify({ slug: d.slug, name: d.name }),
    });

    return res.status(201).json({ success: true, id });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Category slug already exists" });
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: PATCH /marketplace/admin/categories/:catId
// ─────────────────────────────────────────────────────────
router.patch("/admin/categories/:catId", requireAdmin, async (req: any, res) => {
  try {
    const { catId } = req.params;
    const { name, icon, sortOrder, isActive, parentId } = req.body;

    const [cat] = await db.select().from(catalogCategoriesTable)
      .where(eq(catalogCategoriesTable.id, catId)).limit(1);
    if (!cat) return res.status(404).json({ error: "Category not found" });

    const updates: Record<string, any> = {};
    if (name !== undefined)      updates.name = String(name).slice(0, 80);
    if (icon !== undefined)      updates.icon = String(icon);
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    if (isActive !== undefined)  updates.isActive = Boolean(isActive);
    if (parentId !== undefined)  updates.parentId = parentId === null ? null : String(parentId);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    await db.update(catalogCategoriesTable).set(updates).where(eq(catalogCategoriesTable.id, catId));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN: GET /marketplace/admin/stats
// ─────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const inventory = await db.select().from(userInventoryTable);
    const items = await db.select().from(shopItemsTable);
    const itemMap = new Map(items.map(i => [i.id, i]));

    let totalSpent = 0;
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
      availableItems: items.filter(i => i.isAvailable && i.status === "active").length,
      draftItems: items.filter(i => i.status === "draft").length,
      archivedItems: items.filter(i => i.status === "archived").length,
      limitedItems: items.filter(i => i.isLimited).length,
      premiumItems: items.filter(i => i.isPremiumOnly).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
