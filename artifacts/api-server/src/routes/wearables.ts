import { Router } from "express";
import { requireAuth, generateId } from "../lib/auth.js";
import { db, shopItemsTable, userInventoryTable, usersTable } from "@workspace/db";
import { eq, and, isNotNull, inArray } from "drizzle-orm";

const router = Router();

// ── Wearable catalog (deterministic IDs — idempotent seed) ────────────────────

const WEARABLE_ITEMS = [
  // TOPS
  { id: "wearable-top-white-001",    slug: "executive-white",    name: "Executive White",    description: "The clean starter look. White premium shirt, the foundation of any style.",                  cost: 0,    category: "cosmetic", icon: "shirt-outline",    rarity: "common",   itemType: "cosmetic", wearableSlot: "top",       minLevel: 0, styleEffect: "A clean starter look. The foundation of your style." },
  { id: "wearable-top-grey-002",     slug: "premium-grey",       name: "Premium Grey",       description: "Elevated from starter. A premium grey shirt signals progress and taste.",                     cost: 250,  category: "cosmetic", icon: "shirt-outline",    rarity: "uncommon", itemType: "cosmetic", wearableSlot: "top",       minLevel: 3, styleEffect: "Elevated from starter. Professional and refined." },
  { id: "wearable-top-charcoal-003", slug: "refined-charcoal",   name: "Refined Charcoal",   description: "Dark fitted sophistication. Charcoal signals discipline and refined taste.",                  cost: 500,  category: "cosmetic", icon: "shirt-outline",    rarity: "rare",     itemType: "cosmetic", wearableSlot: "top",       minLevel: 6, styleEffect: "Dark fitted sophistication. Discipline and taste made visible." },
  { id: "wearable-top-black-004",    slug: "elite-black",        name: "Elite Black",        description: "Peak minimalist presence. The elite-tier visual identity of those who have arrived.",         cost: 1000, category: "cosmetic", icon: "shirt-outline",    rarity: "epic",     itemType: "cosmetic", wearableSlot: "top",       minLevel: 9, styleEffect: "Peak minimalist presence. Elite-tier visual identity." },
  // WATCHES
  { id: "wearable-watch-classic-001", slug: "classic-watch",     name: "Classic Watch",      description: "A clean timepiece. The first lifestyle signal. Timekeeping as identity.",                    cost: 200,  category: "cosmetic", icon: "watch-outline",    rarity: "uncommon", itemType: "cosmetic", wearableSlot: "watch",     minLevel: 2, styleEffect: "Timekeeping as a lifestyle signal. Elevates your wrist." },
  { id: "wearable-watch-refined-002", slug: "refined-timepiece", name: "Refined Timepiece",  description: "A statement of discipline and lifestyle. Noticed by those who care.",                         cost: 500,  category: "cosmetic", icon: "watch-outline",    rarity: "rare",     itemType: "cosmetic", wearableSlot: "watch",     minLevel: 5, styleEffect: "A statement of discipline and lifestyle. Noticed by those who care." },
  { id: "wearable-watch-elite-003",   slug: "elite-chronograph", name: "Elite Chronograph",  description: "Collector-grade presence. An elite-tier timepiece that signals mastery.",                     cost: 1200, category: "cosmetic", icon: "watch-outline",    rarity: "epic",     itemType: "cosmetic", wearableSlot: "watch",     minLevel: 8, styleEffect: "Collector-grade presence. Earned, never given." },
  // ACCESSORIES
  { id: "wearable-acc-chain-001",     slug: "gold-chain",        name: "Gold Chain",         description: "Subtle status at the collar. A finance and lifestyle signal worn with confidence.",           cost: 300,  category: "cosmetic", icon: "link-outline",     rarity: "rare",     itemType: "cosmetic", wearableSlot: "accessory", minLevel: 4, styleEffect: "Subtle status at the collar. Finance/Lifestyle signal." },
  { id: "wearable-acc-pin-002",       slug: "elite-lapel-pin",   name: "Elite Lapel Pin",    description: "A distinguished elite marker. Prestige made visible in the smallest detail.",                 cost: 600,  category: "cosmetic", icon: "diamond-outline",  rarity: "epic",     itemType: "cosmetic", wearableSlot: "accessory", minLevel: 7, styleEffect: "Distinguished elite marker. Prestige made visible." },
];

// ── Seed wearables (idempotent) ───────────────────────────────────────────────

async function ensureWearablesSeeded() {
  const existing = await db
    .select({ id: shopItemsTable.id })
    .from(shopItemsTable)
    .where(isNotNull(shopItemsTable.wearableSlot));
  const existingIds = new Set(existing.map((r) => r.id));

  for (const item of WEARABLE_ITEMS) {
    if (!existingIds.has(item.id)) {
      await db.insert(shopItemsTable).values({
        ...item,
        isAvailable:   true,
        isEquippable:  true,
        isDisplayable: false,
        isProfileItem: false,
        isWorldItem:   false,
        isLimited:     false,
        isExclusive:   false,
        isPremiumOnly: false,
        sellBackValue: Math.floor(item.cost * 0.3),
        sortOrder:     0,
        acquisitionSource: "purchase",
        tags:          JSON.stringify(["wearable", item.wearableSlot]),
        status:        "active",
      }).onConflictDoNothing();
    }
  }
}

// Run seed on startup
ensureWearablesSeeded().catch(console.error);

// ── GET /wearables — list all wearable items with ownership/equipped state ────

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get user level
    const [user] = await db
      .select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const userLevel = user?.level ?? 1;

    // All wearable items
    const items = await db
      .select()
      .from(shopItemsTable)
      .where(and(isNotNull(shopItemsTable.wearableSlot), eq(shopItemsTable.isAvailable, true)));

    // User ownership
    const owned = await db
      .select()
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedMap = new Map<string, typeof owned[0]>();
    for (const o of owned) ownedMap.set(o.itemId, o);

    const result = items.map((item) => {
      const inv = ownedMap.get(item.id) ?? null;
      return {
        id:           item.id,
        slug:         item.slug,
        name:         item.name,
        description:  item.description,
        styleEffect:  item.styleEffect,
        cost:         item.cost,
        rarity:       item.rarity,
        wearableSlot: item.wearableSlot,
        minLevel:     item.minLevel,
        icon:         item.icon,
        isOwned:      inv !== null,
        isEquipped:   inv?.isEquipped ?? false,
        isLocked:     userLevel < (item.minLevel ?? 0),
        isAffordable: (user?.coinBalance ?? 0) >= item.cost,
        isPremiumOnly: item.isPremiumOnly,
      };
    });

    // Group by slot
    const grouped = {
      top:       result.filter((i) => i.wearableSlot === "top"),
      watch:     result.filter((i) => i.wearableSlot === "watch"),
      accessory: result.filter((i) => i.wearableSlot === "accessory"),
    };

    return res.json({ items: result, grouped, userLevel, coinBalance: user?.coinBalance ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
