import { Router } from "express";
import { requireAuth, generateId } from "../lib/auth.js";
import { db, shopItemsTable, userInventoryTable, usersTable, rewardTransactionsTable, auditLogTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

const router = Router();

const WARDROBE_ITEMS = [
  // ── WATCHES ──
  {
    id: "wardrobe-watch-starter", slug: "starter-timepiece", name: "Starter Timepiece",
    description: "Time is your only real asset.",
    cost: 200, category: "fashion", icon: "watch-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 1,
    styleEffect: "Basic watch presence on wrist",
    series: "Entry Series",
    colorVariants: JSON.stringify([
      { key: "white", label: "White", hex: "#F0F0F0" },
      { key: "black", label: "Black", hex: "#1A1A1A" },
    ]),
  },
  {
    id: "wardrobe-watch-chrono", slug: "chrono-sport-38", name: "Chrono Sport 38",
    description: "Track every second of your ascent.",
    cost: 900, category: "fashion", icon: "watch-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 8,
    styleEffect: "Lifestyle signal +1",
    series: "Chrono Collection",
    colorVariants: JSON.stringify([
      { key: "white", label: "White", hex: "#F0F0F0" },
      { key: "black", label: "Black", hex: "#1A1A1A" },
    ]),
  },
  {
    id: "wardrobe-watch-mariner", slug: "mariner-black-40", name: "Mariner Black 40",
    description: "Depth-rated. Board-room ready.",
    cost: 1200, category: "fashion", icon: "watch-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 10,
    styleEffect: "Lifestyle signal +1",
    series: "Mariner Collection",
    colorVariants: JSON.stringify([
      { key: "black", label: "Black", hex: "#1A1A1A" },
      { key: "blue", label: "Blue", hex: "#1565C0" },
      { key: "green", label: "Green", hex: "#2E7D32" },
    ]),
  },
  {
    id: "wardrobe-watch-royal", slug: "royal-series-41", name: "Royal Series 41",
    description: "The watch that changed what luxury meant.",
    cost: 3500, category: "fashion", icon: "watch-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 20,
    styleEffect: "Lifestyle signal +2, prestige accent",
    series: "Royal Collection",
    colorVariants: JSON.stringify([
      { key: "silver", label: "Silver", hex: "#C0C0C0" },
      { key: "black", label: "Black", hex: "#1A1A1A" },
      { key: "blue", label: "Blue", hex: "#1565C0" },
    ]),
  },
  {
    id: "wardrobe-watch-geneve", slug: "geneve-perpetual", name: "Genève Perpetual",
    description: "You don't own it. You keep it for the next generation.",
    cost: 7500, category: "fashion", icon: "watch-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 35,
    styleEffect: "Prestige accent, elite overlay marker",
    series: "Genève Heritage",
    colorVariants: JSON.stringify([
      { key: "white", label: "White", hex: "#F5F5F0" },
      { key: "champagne", label: "Champagne", hex: "#F5E6CA" },
      { key: "midnight", label: "Midnight", hex: "#0D1B2A" },
    ]),
  },
  {
    id: "wardrobe-watch-carbon", slug: "carbon-rm-series", name: "Carbon RM Series",
    description: "Worn by those who move faster than the market.",
    cost: 18000, category: "fashion", icon: "watch-outline", rarity: "legendary", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 50,
    styleEffect: "Strongest prestige overlay, elite aura",
    series: "Carbon Atelier",
    colorVariants: JSON.stringify([
      { key: "carbon", label: "Carbon", hex: "#2C2C2C" },
      { key: "orange", label: "Orange", hex: "#FF6D00" },
      { key: "green", label: "Green", hex: "#00E676" },
    ]),
  },

  // ── CLOTHING — TOPS ──
  {
    id: "wardrobe-top-starter", slug: "starter-white-shirt", name: "Starter White Shirt",
    description: "Every story starts somewhere.",
    cost: 0, category: "fashion", icon: "shirt-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 1,
    styleEffect: "Default starter appearance",
    series: "Starter Collection",
    colorVariants: JSON.stringify([
      { key: "white", label: "White", hex: "#F0F0F0" },
    ]),
  },
  {
    id: "wardrobe-top-hoodie", slug: "premium-hoodie-s1", name: "Premium Hoodie — Series 1",
    description: "Elevated casual. Never basic.",
    cost: 800, category: "fashion", icon: "shirt-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 8,
    styleEffect: "Casual tier outfit",
    series: "Elevated Essentials",
    colorVariants: JSON.stringify([
      { key: "black", label: "Black", hex: "#1A1A1A" },
      { key: "cream", label: "Cream", hex: "#F5F0E8" },
      { key: "slate", label: "Slate", hex: "#4A4A5A" },
    ]),
  },
  {
    id: "wardrobe-top-silk", slug: "silk-business-shirt", name: "Silk Business Shirt",
    description: "Cut for the boardroom. Worn for the life.",
    cost: 2800, category: "fashion", icon: "shirt-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 18,
    styleEffect: "Outfit tier upgrade",
    series: "Executive Line",
    colorVariants: JSON.stringify([
      { key: "white", label: "White", hex: "#F8F8FF" },
      { key: "lightblue", label: "Light Blue", hex: "#B3D4FC" },
      { key: "palepink", label: "Pale Pink", hex: "#F8D7DA" },
    ]),
  },

  // ── CLOTHING — OUTERWEAR ──
  {
    id: "wardrobe-outer-cashmere", slug: "milano-cashmere-coat", name: "Milano Cashmere Coat",
    description: "The coat that doesn't need a logo.",
    cost: 6000, category: "fashion", icon: "shirt-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "outerwear", minLevel: 30,
    styleEffect: "Outfit tier upgrade to Refined",
    series: "Milano Collection",
    colorVariants: JSON.stringify([
      { key: "camel", label: "Camel", hex: "#C19A6B" },
      { key: "charcoal", label: "Charcoal", hex: "#36363C" },
      { key: "ivory", label: "Ivory", hex: "#FFFFF0" },
    ]),
  },
  {
    id: "wardrobe-suit-exec", slug: "executive-suit-midnight", name: "Executive Suit — Midnight",
    description: "The uniform of those who close.",
    cost: 9000, category: "fashion", icon: "shirt-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "outerwear", minLevel: 40,
    styleEffect: "Strongest outfit upgrade, prestige signal",
    series: "Executive Line",
    colorVariants: JSON.stringify([
      { key: "midnight", label: "Midnight Navy", hex: "#0D1B2A" },
      { key: "charcoal", label: "Charcoal", hex: "#36363C" },
      { key: "black", label: "Black", hex: "#1A1A1A" },
    ]),
  },

  // ── CLOTHING — BOTTOMS ──
  {
    id: "wardrobe-bottom-starter", slug: "dark-denim-premium", name: "Dark Denim Premium",
    description: "The foundation.",
    cost: 0, category: "fashion", icon: "shirt-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "bottom", minLevel: 1,
    styleEffect: "Default starter appearance",
    series: "Starter Collection",
    colorVariants: JSON.stringify([
      { key: "black", label: "Black", hex: "#1A1A1A" },
      { key: "indigo", label: "Dark Indigo", hex: "#1A237E" },
    ]),
  },
  {
    id: "wardrobe-bottom-trouser", slug: "technical-slim-trouser", name: "Technical Slim Trouser",
    description: "Precision tailoring. Zero compromise.",
    cost: 1500, category: "fashion", icon: "shirt-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "bottom", minLevel: 12,
    styleEffect: "Lower outfit refinement upgrade",
    series: "Tailored Series",
    colorVariants: JSON.stringify([
      { key: "navy", label: "Navy", hex: "#0D1B2A" },
      { key: "charcoal", label: "Charcoal", hex: "#36363C" },
      { key: "black", label: "Black", hex: "#1A1A1A" },
    ]),
  },

  // ── ACCESSORIES ──
  {
    id: "wardrobe-acc-bifold", slug: "leather-bifold-milano", name: "Leather Bifold — Milano",
    description: "Slim. Black. No logo needed.",
    cost: 600, category: "fashion", icon: "diamond-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 10,
    styleEffect: "Subtle lifestyle signal",
    series: "Milano Collection",
    colorVariants: JSON.stringify([
      { key: "black", label: "Black", hex: "#1A1A1A" },
    ]),
  },
  {
    id: "wardrobe-acc-pocket", slug: "silk-pocket-square", name: "Silk Pocket Square — Midnight",
    description: "The 10% that makes 100% of the impression.",
    cost: 400, category: "fashion", icon: "diamond-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 15,
    styleEffect: "Outfit detail upgrade on suited looks",
    series: "Executive Line",
    colorVariants: JSON.stringify([
      { key: "midnight", label: "Midnight", hex: "#0D1B2A" },
    ]),
  },
  {
    id: "wardrobe-acc-cardcase", slug: "carbon-fiber-card-case", name: "Carbon Fiber Card Case",
    description: "Details signal status before you speak.",
    cost: 1200, category: "fashion", icon: "diamond-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 22,
    styleEffect: "Lifestyle signal upgrade",
    series: "Carbon Atelier",
    colorVariants: JSON.stringify([
      { key: "carbon", label: "Carbon", hex: "#2C2C2C" },
    ]),
  },
  {
    id: "wardrobe-acc-ring", slug: "titanium-ring-zero", name: "Titanium Ring — Zero",
    description: "Unmarked. Immovable.",
    cost: 3500, category: "fashion", icon: "diamond-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 38,
    styleEffect: "Prestige signal on hands layer",
    series: "Atelier Collection",
    colorVariants: JSON.stringify([
      { key: "titanium", label: "Titanium", hex: "#8A8A8A" },
    ]),
  },
];

const STARTER_ITEM_IDS = ["wardrobe-top-starter", "wardrobe-bottom-starter", "wardrobe-watch-starter"];

async function ensureWardrobeSeeded() {
  const existing = await db
    .select({ id: shopItemsTable.id })
    .from(shopItemsTable)
    .where(isNotNull(shopItemsTable.wearableSlot));
  const existingIds = new Set(existing.map((r) => r.id));

  for (const item of WARDROBE_ITEMS) {
    if (!existingIds.has(item.id)) {
      await db.insert(shopItemsTable).values({
        ...item,
        isAvailable: true,
        isEquippable: true,
        isDisplayable: false,
        isProfileItem: false,
        isWorldItem: false,
        isLimited: false,
        isExclusive: false,
        isPremiumOnly: false,
        sellBackValue: Math.floor(item.cost * 0.25),
        sortOrder: 0,
        acquisitionSource: "purchase",
        tags: JSON.stringify(["wardrobe", item.wearableSlot]),
        status: "active",
      }).onConflictDoNothing();
    } else {
      await db.update(shopItemsTable)
        .set({
          series: item.series,
          colorVariants: item.colorVariants,
          name: item.name,
          description: item.description,
          cost: item.cost,
          rarity: item.rarity,
          minLevel: item.minLevel,
          styleEffect: item.styleEffect,
          wearableSlot: item.wearableSlot,
        })
        .where(eq(shopItemsTable.id, item.id));
    }
  }
}

ensureWardrobeSeeded().catch(console.error);

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db
      .select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const userLevel = user?.level ?? 1;
    const coinBalance = user?.coinBalance ?? 0;

    const items = await db
      .select()
      .from(shopItemsTable)
      .where(and(isNotNull(shopItemsTable.wearableSlot), eq(shopItemsTable.isAvailable, true)));

    const owned = await db
      .select()
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedMap = new Map<string, typeof owned[0]>();
    for (const o of owned) ownedMap.set(o.itemId, o);

    const result = items.map((item) => {
      const inv = ownedMap.get(item.id) ?? null;
      let variants: { key: string; label: string; hex: string }[] = [];
      try { variants = JSON.parse(item.colorVariants ?? "[]"); } catch {}
      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        styleEffect: item.styleEffect,
        cost: item.cost,
        rarity: item.rarity,
        wearableSlot: item.wearableSlot,
        minLevel: item.minLevel,
        icon: item.icon,
        series: item.series ?? null,
        colorVariants: variants,
        selectedVariant: inv?.colorVariant ?? variants[0]?.key ?? null,
        isOwned: inv !== null,
        isEquipped: inv?.isEquipped ?? false,
        isLocked: userLevel < (item.minLevel ?? 0),
        canAfford: coinBalance >= item.cost,
        isPremiumOnly: item.isPremiumOnly,
      };
    });

    const grouped = {
      watch: result.filter((i) => i.wearableSlot === "watch").sort((a, b) => a.cost - b.cost),
      top: result.filter((i) => i.wearableSlot === "top").sort((a, b) => a.cost - b.cost),
      outerwear: result.filter((i) => i.wearableSlot === "outerwear").sort((a, b) => a.cost - b.cost),
      bottom: result.filter((i) => i.wearableSlot === "bottom").sort((a, b) => a.cost - b.cost),
      accessory: result.filter((i) => i.wearableSlot === "accessory").sort((a, b) => a.cost - b.cost),
    };

    return res.json({ items: result, grouped, userLevel, coinBalance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/equipped", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const equipped = await db
      .select()
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.isEquipped, true)));

    const itemIds = equipped.map((e) => e.itemId);
    if (itemIds.length === 0) {
      return res.json({ slots: { watch: null, top: null, outerwear: null, bottom: null, accessory: null } });
    }

    const items = await db
      .select()
      .from(shopItemsTable)
      .where(inArray(shopItemsTable.id, itemIds));

    const itemMap = new Map(items.map((i) => [i.id, i]));

    const slots: Record<string, any> = { watch: null, top: null, outerwear: null, bottom: null, accessory: null };
    for (const inv of equipped) {
      const item = itemMap.get(inv.itemId);
      if (!item || !item.wearableSlot) continue;
      let variants: { key: string; label: string; hex: string }[] = [];
      try { variants = JSON.parse(item.colorVariants ?? "[]"); } catch {}
      slots[item.wearableSlot] = {
        id: item.id,
        slug: item.slug,
        name: item.name,
        rarity: item.rarity,
        series: item.series,
        wearableSlot: item.wearableSlot,
        styleEffect: item.styleEffect,
        colorVariants: variants,
        selectedVariant: inv.colorVariant ?? variants[0]?.key ?? null,
      };
    }

    return res.json({ slots });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:itemId/variant", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { variant } = req.body ?? {};

    if (!variant || typeof variant !== "string") {
      return res.status(400).json({ error: "variant is required" });
    }

    const [item] = await db
      .select()
      .from(shopItemsTable)
      .where(eq(shopItemsTable.id, itemId))
      .limit(1);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let variants: { key: string }[] = [];
    try { variants = JSON.parse(item.colorVariants ?? "[]"); } catch {}
    if (!variants.some((v) => v.key === variant)) {
      return res.status(400).json({ error: "Invalid variant" });
    }

    const [inv] = await db
      .select()
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)))
      .limit(1);
    if (!inv) return res.status(403).json({ error: "You do not own this item" });

    await db.update(userInventoryTable)
      .set({ colorVariant: variant })
      .where(eq(userInventoryTable.id, inv.id));

    return res.json({ success: true, variant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/ensure-starters", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const owned = await db
      .select({ itemId: userInventoryTable.itemId })
      .from(userInventoryTable)
      .where(and(
        eq(userInventoryTable.userId, userId),
        inArray(userInventoryTable.itemId, STARTER_ITEM_IDS),
      ));
    const ownedSet = new Set(owned.map((o) => o.itemId));

    for (const sid of STARTER_ITEM_IDS) {
      if (!ownedSet.has(sid)) {
        await db.insert(userInventoryTable).values({
          id: generateId(),
          userId,
          itemId: sid,
          isEquipped: false,
          source: "starter",
        }).onConflictDoNothing();
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
