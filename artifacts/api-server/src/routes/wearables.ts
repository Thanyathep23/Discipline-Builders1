import { Router } from "express";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { db, shopItemsTable, userInventoryTable, usersTable, rewardTransactionsTable, auditLogTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

const router = Router();

interface WardrobeItemDef {
  id: string;
  slug: string;
  name: string;
  description: string;
  cost: number;
  category: string;
  icon: string;
  rarity: string;
  itemType: string;
  wearableSlot: string;
  minLevel: number;
  styleEffect: string;
  series: string;
  glbFile?: string;
}

const WARDROBE_ITEMS: WardrobeItemDef[] = [
  // ── WATCHES (sorted by minLevel ascending) ──
  {
    id: "wardrobe-watch-apple-ultra", slug: "apple-watch-ultra", name: "Apple Watch Ultra 2",
    description: "The most rugged Apple Watch ever. Built for those who push limits.",
    cost: 4500, category: "fashion", icon: "watch-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 2,
    styleEffect: "Prestige +3",
    series: "Smart Watch",
    glbFile: "apple_watch_ultra_2.glb",
  },
  {
    id: "wardrobe-watch-timex", slug: "timex-expedition", name: "Timex Expedition",
    description: "Built for those who show up. Rain or shine. Every single day.",
    cost: 5000, category: "fashion", icon: "watch-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 3,
    styleEffect: "Prestige +3",
    series: "Field Watch",
    glbFile: "timex_expedition_watch.glb",
  },
  {
    id: "wardrobe-watch-seiko", slug: "seiko-prospex", name: "Seiko Prospex",
    description: "Japanese precision. The diver's choice since 1965. Earned, not bought.",
    cost: 12000, category: "fashion", icon: "watch-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 8,
    styleEffect: "Prestige +7",
    series: "Diver's Watch",
    glbFile: "seiko_watch.glb",
  },
  {
    id: "wardrobe-watch-chrono-sport", slug: "chronograph-sport", name: "Chronograph Sport",
    description: "Measure every second. In business and in life, timing is everything.",
    cost: 18000, category: "fashion", icon: "watch-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 12,
    styleEffect: "Prestige +9",
    series: "Sport Chronograph",
    glbFile: "chronograph_watch.glb",
  },
  {
    id: "wardrobe-watch-dress", slug: "classic-dress-watch", name: "Classic Dress Watch",
    description: "The boardroom demands refinement. This watch opens doors.",
    cost: 22000, category: "fashion", icon: "watch-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 15,
    styleEffect: "Prestige +11",
    series: "Dress Watch",
    glbFile: "hand_watch.glb",
  },
  {
    id: "wardrobe-watch-breitling", slug: "breitling-superocean-44", name: "Breitling Superocean 44",
    description: "Instruments for professionals. Swiss-made for those who mean business.",
    cost: 45000, category: "fashion", icon: "watch-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 28,
    styleEffect: "Prestige +20",
    series: "Professional Diver",
    glbFile: "breitling_superocean_automatic_44.glb",
  },
  {
    id: "wardrobe-watch-rolex", slug: "rolex-datejust", name: "Rolex Datejust",
    description: "The most recognised watch in the world. A symbol of achievement since 1945.",
    cost: 85000, category: "fashion", icon: "watch-outline", rarity: "legendary", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 45,
    styleEffect: "Prestige +38",
    series: "Luxury Icon",
    glbFile: "rolex_datejust.glb",
  },
  {
    id: "wardrobe-watch-patek", slug: "patek-philippe-calatrava", name: "Patek Philippe Calatrava",
    description: "You never actually own a Patek Philippe. You merely look after it for the next generation.",
    cost: 150000, category: "fashion", icon: "watch-outline", rarity: "legendary", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 60,
    styleEffect: "Prestige +55",
    series: "Haute Horlogerie",
    glbFile: "patek_philippe.glb",
  },
  {
    id: "wardrobe-watch-rm", slug: "richard-mille-rm011", name: "Richard Mille RM 011",
    description: "The ultimate flex. $1M on your wrist. Reserved for those who've truly made it.",
    cost: 220000, category: "fashion", icon: "watch-outline", rarity: "legendary", itemType: "cosmetic",
    wearableSlot: "watch", minLevel: 70,
    styleEffect: "Prestige +70",
    series: "Ultra Luxury",
    glbFile: "richard_mille_rm011.glb",
  },

  // ── CLOTHING — TOPS ──
  {
    id: "wardrobe-top-starter", slug: "starter-white-shirt", name: "Starter White Shirt",
    description: "Every story starts somewhere.",
    cost: 0, category: "fashion", icon: "shirt-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 1,
    styleEffect: "Default starter appearance",
    series: "Starter Collection",
    glbFile: "shirt_for_men.glb",
  },
  {
    id: "wardrobe-top-hoodie", slug: "premium-hoodie-s1", name: "Premium Hoodie — Series 1",
    description: "Elevated casual. Never basic.",
    cost: 800, category: "fashion", icon: "shirt-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 8,
    styleEffect: "Casual tier outfit",
    series: "Elevated Essentials",
    glbFile: "stylized_hoodie_jacket.glb",
  },
  {
    id: "wardrobe-top-silk", slug: "silk-business-shirt", name: "Silk Business Shirt",
    description: "Cut for the boardroom. Worn for the life.",
    cost: 2800, category: "fashion", icon: "shirt-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "top", minLevel: 18,
    styleEffect: "Outfit tier upgrade",
    series: "Executive Line",
    glbFile: "elegant_clothing_set.glb",
  },

  // ── CLOTHING — OUTERWEAR ──
  {
    id: "wardrobe-outer-cashmere", slug: "milano-cashmere-coat", name: "Milano Cashmere Coat",
    description: "The coat that doesn't need a logo.",
    cost: 6000, category: "fashion", icon: "shirt-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "outerwear", minLevel: 30,
    styleEffect: "Outfit tier upgrade to Refined",
    series: "Milano Collection",
    glbFile: "black_puffy_jacket.glb",
  },
  {
    id: "wardrobe-suit-exec", slug: "executive-suit-midnight", name: "Executive Suit — Midnight",
    description: "The uniform of those who close.",
    cost: 9000, category: "fashion", icon: "shirt-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "outerwear", minLevel: 40,
    styleEffect: "Strongest outfit upgrade, prestige signal",
    series: "Executive Line",
    glbFile: "mens_clothing_game.glb",
  },

  // ── CLOTHING — BOTTOMS ──
  {
    id: "wardrobe-bottom-starter", slug: "dark-denim-premium", name: "Dark Denim Premium",
    description: "The foundation.",
    cost: 0, category: "fashion", icon: "shirt-outline", rarity: "common", itemType: "cosmetic",
    wearableSlot: "bottom", minLevel: 1,
    styleEffect: "Default starter appearance",
    series: "Starter Collection",
  },
  {
    id: "wardrobe-bottom-trouser", slug: "technical-slim-trouser", name: "Technical Slim Trouser",
    description: "Precision tailoring. Zero compromise.",
    cost: 1500, category: "fashion", icon: "shirt-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "bottom", minLevel: 12,
    styleEffect: "Lower outfit refinement upgrade",
    series: "Tailored Series",
  },

  // ── ACCESSORIES ──
  {
    id: "wardrobe-acc-bifold", slug: "leather-bifold-milano", name: "Leather Bifold — Milano",
    description: "Slim. Black. No logo needed.",
    cost: 600, category: "fashion", icon: "diamond-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 10,
    styleEffect: "Subtle lifestyle signal",
    series: "Milano Collection",
  },
  {
    id: "wardrobe-acc-pocket", slug: "silk-pocket-square", name: "Silk Pocket Square — Midnight",
    description: "The 10% that makes 100% of the impression.",
    cost: 400, category: "fashion", icon: "diamond-outline", rarity: "uncommon", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 15,
    styleEffect: "Outfit detail upgrade on suited looks",
    series: "Executive Line",
  },
  {
    id: "wardrobe-acc-cardcase", slug: "carbon-fiber-card-case", name: "Carbon Fiber Card Case",
    description: "Details signal status before you speak.",
    cost: 1200, category: "fashion", icon: "diamond-outline", rarity: "rare", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 22,
    styleEffect: "Lifestyle signal upgrade",
    series: "Carbon Atelier",
  },
  {
    id: "wardrobe-acc-ring", slug: "titanium-ring-zero", name: "Titanium Ring — Zero",
    description: "Unmarked. Immovable.",
    cost: 3500, category: "fashion", icon: "diamond-outline", rarity: "epic", itemType: "cosmetic",
    wearableSlot: "accessory", minLevel: 38,
    styleEffect: "Prestige signal on hands layer",
    series: "Atelier Collection",
  },
];

const STARTER_ITEM_IDS = ["wardrobe-top-starter", "wardrobe-bottom-starter", "wardrobe-watch-apple-ultra"];

const watchItemsWithGlb = WARDROBE_ITEMS.filter(
  (i): i is WardrobeItemDef & { glbFile: string } => i.wearableSlot === "watch" && !!i.glbFile
);

export const WATCH_GLB_MAP: Record<string, string> = Object.fromEntries(
  watchItemsWithGlb.map((i) => [i.name, i.glbFile])
);

export const WARDROBE_GLB_MAP = new Map(
  WARDROBE_ITEMS.filter((i): i is WardrobeItemDef & { glbFile: string } => !!i.glbFile).map((i) => [i.id, i.glbFile])
);

const DEPRECATED_WATCH_IDS = [
  "wardrobe-watch-starter", "wardrobe-watch-chrono", "wardrobe-watch-mariner",
  "wardrobe-watch-royal", "wardrobe-watch-geneve", "wardrobe-watch-carbon",
];

const HARD_DELETE_WATCH_IDS = [
  "wearable-watch-classic-001", "wearable-watch-refined-002", "wearable-watch-elite-003",
];

async function ensureWardrobeSeeded() {
  const existing = await db
    .select({ id: shopItemsTable.id })
    .from(shopItemsTable)
    .where(isNotNull(shopItemsTable.wearableSlot));
  const existingIds = new Set(existing.map((r) => r.id));

  for (const oldId of DEPRECATED_WATCH_IDS) {
    if (existingIds.has(oldId)) {
      await db.update(shopItemsTable)
        .set({ isAvailable: false, status: "archived" })
        .where(eq(shopItemsTable.id, oldId));
    }
  }

  for (const deleteId of HARD_DELETE_WATCH_IDS) {
    if (existingIds.has(deleteId)) {
      await db.delete(userInventoryTable).where(eq(userInventoryTable.itemId, deleteId));
      await db.delete(shopItemsTable).where(eq(shopItemsTable.id, deleteId));
    }
  }

  for (const item of WARDROBE_ITEMS) {
    const { glbFile: _glb, ...dbFields } = item;
    if (!existingIds.has(item.id)) {
      await db.insert(shopItemsTable).values({
        ...dbFields,
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

    const BANNED_WATCH_NAMES = ["Classic Watch", "Refined Timepiece", "Elite Chronograph"];
    const rawItems = await db
      .select()
      .from(shopItemsTable)
      .where(and(isNotNull(shopItemsTable.wearableSlot), eq(shopItemsTable.isAvailable, true)));
    const items = rawItems.filter((i) => !BANNED_WATCH_NAMES.includes(i.name ?? ""));

    const owned = await db
      .select()
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedMap = new Map<string, typeof owned[0]>();
    for (const o of owned) ownedMap.set(o.itemId, o);

    const result = items.map((item) => {
      const inv = ownedMap.get(item.id) ?? null;
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
        glbFile: WARDROBE_GLB_MAP.get(item.id) ?? null,
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
      slots[item.wearableSlot] = {
        id: item.id,
        slug: item.slug,
        name: item.name,
        rarity: item.rarity,
        series: item.series,
        wearableSlot: item.wearableSlot,
        styleEffect: item.styleEffect,
      };
    }

    return res.json({ slots });
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
