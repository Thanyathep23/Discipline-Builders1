import { Router } from "express";
import { requireAuth, generateId } from "../lib/auth.js";
import {
  db, shopItemsTable, userInventoryTable, usersTable,
  rewardTransactionsTable, auditLogTable,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

// ─── Car Catalog (deterministic IDs, idempotent seed) ────────────────────────

const CAR_CATALOG = [
  {
    id: "car-starter-001", slug: "urban-runner",
    name: "Urban Runner",
    description: "The beginning of the collection. Clean, capable, and already setting you apart.",
    fullDescription: "Every great collection starts with a first entry. The Urban Runner is fast enough to feel the potential and sharp enough to represent your starting point with pride.",
    cost: 0, minLevel: 0, rarity: "common", subcategory: "starter",
    icon: "car-outline", tags: '["vehicles","starter","photo-eligible"]',
  },
  {
    id: "car-rising-001", slug: "midnight-sedan",
    name: "Midnight Sedan",
    description: "A dark, polished executive sedan. Your first real upgrade.",
    fullDescription: "The Midnight Sedan signals progress. Sleek lines, a commanding presence, and a subtlety that most will miss — but those with taste will recognize immediately.",
    cost: 350, minLevel: 3, rarity: "uncommon", subcategory: "rising",
    icon: "car-outline", tags: '["vehicles","rising","photo-eligible"]',
  },
  {
    id: "car-rising-002", slug: "obsidian-coupe",
    name: "Obsidian Coupe",
    description: "A two-door statement. Earned through consistent execution.",
    fullDescription: "The Obsidian Coupe doesn't ask for attention — it commands it. A refined step forward in your collection.",
    cost: 650, minLevel: 5, rarity: "uncommon", subcategory: "rising",
    icon: "car-outline", tags: '["vehicles","rising","photo-eligible"]',
  },
  {
    id: "car-executive-001", slug: "executive-gt",
    name: "Executive GT",
    description: "Grand tourer for those building a serious lifestyle.",
    fullDescription: "Performance without apology. The Executive GT is what happens when ambition becomes tangible. Reserved for operators who have proven they belong here.",
    cost: 1200, minLevel: 8, rarity: "rare", subcategory: "executive",
    icon: "car-sport-outline", tags: '["vehicles","executive","photo-eligible","showcase"]',
  },
  {
    id: "car-executive-002", slug: "carbon-series",
    name: "Carbon Series",
    description: "Track-refined. Street-registered. Reserved for disciplined minds.",
    fullDescription: "The Carbon Series strips everything unnecessary and keeps only what matters. A performance machine built for those who have internalized the same philosophy.",
    cost: 1800, minLevel: 11, rarity: "rare", subcategory: "executive",
    icon: "car-sport-outline", tags: '["vehicles","executive","photo-eligible","showcase"]',
  },
  {
    id: "car-elite-001", slug: "shadow-supercar",
    name: "Shadow Supercar",
    description: "Few will own this. Fewer deserve it. A prestige landmark.",
    fullDescription: "The Shadow Supercar is a different category entirely. Owning it means you have crossed the threshold most only dream about. A statement no title or watch can make alone.",
    cost: 3000, minLevel: 15, rarity: "epic", subcategory: "elite",
    icon: "car-sport-outline", tags: '["vehicles","elite","photo-eligible","showcase","prestige"]',
  },
  {
    id: "car-elite-002", slug: "titanium-rsx",
    name: "Titanium RSX",
    description: "Limited production. Maximum statement. The pinnacle of the elite class.",
    fullDescription: "The Titanium RSX was not designed to be common. Every detail is measured. Every surface intentional. Rare by design, exclusive by merit.",
    cost: 5000, minLevel: 20, rarity: "epic", subcategory: "elite",
    isLimited: true,
    icon: "car-sport-outline", tags: '["vehicles","elite","photo-eligible","showcase","prestige","limited"]',
  },
  {
    id: "car-prestige-001", slug: "black-signature",
    name: "Black Signature",
    description: "The pinnacle. Reserved for those who have built the real thing.",
    fullDescription: "The Black Signature is not purchased with haste. It is a singular statement — the capstone of a discipline-driven life. Reserved for those who have built something real and can prove it.",
    cost: 8000, minLevel: 25, rarity: "legendary", subcategory: "prestige",
    isLimited: true, isExclusive: false,
    icon: "car-sport-outline", tags: '["vehicles","prestige","photo-eligible","showcase","prestige","legendary"]',
  },
];

// ─── Prestige contribution by subcategory ────────────────────────────────────

const CAR_PRESTIGE_VALUES: Record<string, number> = {
  starter:   0,
  rising:    5,
  executive: 12,
  elite:     22,
  prestige:  40,
};

// ─── Idempotent seed ──────────────────────────────────────────────────────────

async function ensureCarsSeeded() {
  for (const car of CAR_CATALOG) {
    const existing = await db.select({ id: shopItemsTable.id })
      .from(shopItemsTable).where(eq(shopItemsTable.id, car.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(shopItemsTable).values({
        id:           car.id,
        slug:         car.slug,
        name:         car.name,
        description:  car.description,
        fullDescription: car.fullDescription,
        cost:         car.cost,
        category:     "vehicle",
        icon:         car.icon,
        rarity:       car.rarity as any,
        itemType:     "car",
        subcategory:  car.subcategory,
        minLevel:     car.minLevel,
        tags:         car.tags,
        isLimited:    (car as any).isLimited ?? false,
        isExclusive:  (car as any).isExclusive ?? false,
        isAvailable:  true,
        isEquippable: false,
        isDisplayable: true,
        isProfileItem: true,
        isWorldItem:   false,
        isPremiumOnly: false,
        sellBackValue: Math.floor(car.cost * 0.2),
        sortOrder:    CAR_CATALOG.indexOf(car) * 10,
        acquisitionSource: "purchase",
        status:       "active",
        styleEffect:  `${car.subcategory.charAt(0).toUpperCase() + car.subcategory.slice(1)}-class vehicle. Prestige value: ${CAR_PRESTIGE_VALUES[car.subcategory] ?? 0}.`,
      } as any).onConflictDoNothing();
    }
  }
}

ensureCarsSeeded().catch((e) => console.error("[cars] seed error:", e.message));

// ─── GET /cars — full catalog with per-user state ────────────────────────────

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db
      .select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const allCars = await db.select().from(shopItemsTable)
      .where(and(eq(shopItemsTable.category, "vehicle"), eq(shopItemsTable.status, "active")));

    const inventory = await db.select().from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    const ownedIds = new Set(inventory.filter(i => {
      const car = allCars.find(c => c.id === i.itemId);
      return car !== undefined;
    }).map(i => i.itemId));

    const featuredInv = inventory.find(i => i.displaySlot === "featured_car");
    const featuredCarId = featuredInv?.itemId ?? null;

    const userLevel = user?.level ?? 1;
    const coinBalance = user?.coinBalance ?? 0;

    const catalog = allCars.map((car) => {
      const owned = ownedIds.has(car.id);
      const locked = userLevel < (car.minLevel ?? 0);
      const affordable = coinBalance >= car.cost;
      const tags: string[] = (() => {
        try { return JSON.parse(car.tags ?? "[]"); } catch { return []; }
      })();

      return {
        id: car.id, slug: car.slug, name: car.name,
        description: car.description,
        fullDescription: car.fullDescription,
        cost: car.cost,
        rarity: car.rarity,
        carClass: car.subcategory,
        minLevel: car.minLevel,
        icon: car.icon,
        isLimited: car.isLimited,
        isExclusive: car.isExclusive,
        styleEffect: car.styleEffect,
        prestigeValue: CAR_PRESTIGE_VALUES[car.subcategory ?? "starter"] ?? 0,
        isPhotoEligible: tags.includes("photo-eligible"),
        isShowcaseEligible: tags.includes("showcase"),
        isOwned: owned,
        isLocked: locked,
        isFeatured: car.id === featuredCarId,
        isAffordable: affordable,
        lockReason: locked
          ? `Reach level ${car.minLevel} to unlock this vehicle.`
          : null,
      };
    });

    // Sort: owned first, then by sortOrder
    catalog.sort((a, b) => {
      if (a.isOwned !== b.isOwned) return a.isOwned ? -1 : 1;
      const ai = allCars.findIndex(c => c.id === a.id);
      const bi = allCars.findIndex(c => c.id === b.id);
      return (allCars[ai]?.sortOrder ?? 0) - (allCars[bi]?.sortOrder ?? 0);
    });

    const featuredCar = catalog.find(c => c.isFeatured) ?? null;

    return res.json({
      catalog,
      featuredCar,
      userLevel,
      coinBalance,
      ownedCount: ownedIds.size,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /cars/:id/purchase ─────────────────────────────────────────────────

router.post("/:id/purchase", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [car] = await db.select().from(shopItemsTable)
      .where(and(eq(shopItemsTable.id, id), eq(shopItemsTable.category, "vehicle"))).limit(1);
    if (!car) return res.status(404).json({ error: "Car not found" });
    if (!car.isAvailable || car.status !== "active")
      return res.status(400).json({ error: "This vehicle is not available" });

    const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.level < (car.minLevel ?? 0))
      return res.status(403).json({
        error: `You need to reach level ${car.minLevel} to purchase this vehicle.`,
      });

    if (user.coinBalance < car.cost)
      return res.status(400).json({
        error: `Insufficient coins. You need ${car.cost} coins — you have ${user.coinBalance}.`,
      });

    const existing = await db.select({ id: userInventoryTable.id })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (existing.length > 0)
      return res.status(400).json({ error: "You already own this vehicle." });

    // Deduct coins
    await db.update(usersTable)
      .set({ coinBalance: user.coinBalance - car.cost, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Add to inventory
    const invId = generateId();
    await db.insert(userInventoryTable).values({
      id: invId, userId, itemId: id,
      isEquipped: false, source: "purchase",
    });

    // Log transaction
    await db.insert(rewardTransactionsTable).values({
      id: generateId(), userId,
      type: "spend", amount: car.cost,
      reason: `Purchased vehicle: ${car.name}`,
      balanceAfter: user.coinBalance - car.cost,
      metadata: JSON.stringify({ itemId: id, itemName: car.name }),
    } as any).catch(() => {});

    await db.insert(auditLogTable).values({
      id: generateId(), userId,
      action: "car_purchased",
      metadata: JSON.stringify({ itemId: id, cost: car.cost }),
    } as any).catch(() => {});

    return res.json({ success: true, newBalance: user.coinBalance - car.cost });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /cars/:id/feature ───────────────────────────────────────────────────

router.post("/:id/feature", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const [inv] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (!inv) return res.status(403).json({ error: "You do not own this vehicle." });

    const [car] = await db.select({ id: shopItemsTable.id, category: shopItemsTable.category })
      .from(shopItemsTable).where(eq(shopItemsTable.id, id)).limit(1);
    if (!car || car.category !== "vehicle")
      return res.status(400).json({ error: "Not a vehicle item." });

    // Clear any previously featured car
    await db.update(userInventoryTable)
      .set({ displaySlot: null })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot, "featured_car")));

    // Feature this car
    await db.update(userInventoryTable)
      .set({ displaySlot: "featured_car" })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id)));

    return res.json({ success: true, featuredCarId: id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /cars/feature — unfeature ────────────────────────────────────────

router.delete("/feature", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await db.update(userInventoryTable)
      .set({ displaySlot: null })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot, "featured_car")));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /cars/photo-mode — owned cars + featured car for photo mode ──────────

router.get("/photo-mode", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const inventory = await db.select({
      itemId: userInventoryTable.itemId,
      displaySlot: userInventoryTable.displaySlot,
    }).from(userInventoryTable).where(eq(userInventoryTable.userId, userId));

    const ownedCarIds = inventory.map(i => i.itemId);
    if (ownedCarIds.length === 0) {
      return res.json({ ownedCars: [], featuredCar: null });
    }

    const allCars = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.category, "vehicle"));

    const ownedCars = allCars
      .filter(c => ownedCarIds.includes(c.id))
      .map(c => ({
        id: c.id, name: c.name, rarity: c.rarity, carClass: c.subcategory,
        icon: c.icon, styleEffect: c.styleEffect,
        prestigeValue: CAR_PRESTIGE_VALUES[c.subcategory ?? "starter"] ?? 0,
        isPhotoEligible: true,
      }));

    const featuredInv = inventory.find(i => i.displaySlot === "featured_car");
    const featuredCar = ownedCars.find(c => c.id === featuredInv?.itemId) ?? ownedCars[0] ?? null;

    return res.json({ ownedCars, featuredCar });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
