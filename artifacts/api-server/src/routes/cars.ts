import { Router } from "express";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import {
  db, shopItemsTable, userInventoryTable, usersTable,
  rewardTransactionsTable, auditLogTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { awardBadge } from "./inventory.js";

const router = Router();

// ─── Color Variant Definitions ──────────────────────────────────────────────

export type ColorVariant = { key: string; label: string; hex: string };

export const CAR_COLOR_VARIANTS: Record<string, ColorVariant[]> = {
  "car-v2-starter": [
    { key: "graphite-grey", label: "Graphite Grey", hex: "#4A4A52" },
    { key: "white",         label: "White",         hex: "#E8E8EC" },
  ],
  "car-v2-series-m": [
    { key: "midnight-black", label: "Midnight Black", hex: "#1A1A22" },
    { key: "mineral-white",  label: "Mineral White",  hex: "#E0DFE4" },
    { key: "sapphire-blue",  label: "Sapphire Blue",  hex: "#1E3A6E" },
  ],
  "car-v2-alpine-gt": [
    { key: "arctic-silver",  label: "Arctic Silver",  hex: "#BCC3CB" },
    { key: "racing-yellow",  label: "Racing Yellow",  hex: "#E8C820" },
    { key: "deep-black",     label: "Deep Black",     hex: "#0D0D12" },
  ],
  "car-v2-continental": [
    { key: "onyx-black", label: "Onyx Black", hex: "#141418" },
    { key: "dove-white",  label: "Dove White",  hex: "#F0EDE6" },
    { key: "cognac",      label: "Cognac",      hex: "#7A4228" },
  ],
  "car-v2-phantom": [
    { key: "black-crystal",   label: "Black Crystal",   hex: "#10101A" },
    { key: "champagne-gold",  label: "Champagne Gold",  hex: "#C4A55A" },
  ],
  "car-v2-vulcan": [
    { key: "matte-black", label: "Matte Black", hex: "#1C1C22" },
    { key: "carbon-red",   label: "Carbon Red",   hex: "#8B1A1A" },
  ],
};

// ─── Car Catalog (deterministic IDs, idempotent seed) ────────────────────────

const CAR_CATALOG = [
  {
    id: "car-v2-starter", slug: "starter-ride",
    name: "Starter Ride",
    description: "Every journey starts with the first key.",
    fullDescription: "Clean lines and understated presence. The Starter Ride is where every operator begins — a statement that you've entered the game and you're here to stay.",
    cost: 500, minLevel: 5, rarity: "common", subcategory: "entry",
    icon: "car-outline", tags: '["vehicles","entry","photo-eligible"]',
  },
  {
    id: "car-v2-series-m", slug: "series-m-black",
    name: "Series M Black",
    description: "The daily driver of those who move fast.",
    fullDescription: "An executive sport sedan built for operators who demand precision and presence in equal measure. The Series M Black is the vehicle of choice for those whose mornings start before dawn.",
    cost: 2500, minLevel: 15, rarity: "rare", subcategory: "sport",
    icon: "car-sport-outline", tags: '["vehicles","sport","photo-eligible","showcase"]',
  },
  {
    id: "car-v2-alpine-gt", slug: "alpine-gt",
    name: "Alpine GT",
    description: "Built for those who treat every road as a proving ground.",
    fullDescription: "Precision-engineered performance coupe. The Alpine GT rewards discipline with raw capability — a machine that mirrors your dedication in every curve and straightaway.",
    cost: 5000, minLevel: 25, rarity: "epic", subcategory: "performance",
    icon: "car-sport-outline", tags: '["vehicles","performance","photo-eligible","showcase","prestige"]',
  },
  {
    id: "car-v2-continental", slug: "continental-s",
    name: "Continental S",
    description: "Effortless power. Unmistakable presence.",
    fullDescription: "Grand touring luxury at its finest. The Continental S is for those who have proven that discipline and taste are not mutually exclusive. Quiet authority on wheels.",
    cost: 8500, minLevel: 35, rarity: "epic", subcategory: "grandtouring",
    icon: "car-sport-outline", tags: '["vehicles","grandtouring","photo-eligible","showcase","prestige"]',
  },
  {
    id: "car-v2-phantom", slug: "phantom-noir",
    name: "Phantom Noir",
    description: "Not earned by speed. Earned by discipline.",
    fullDescription: "Ultra-luxury flagship. The Phantom Noir is reserved for those who have built something undeniable. It does not seek attention — it commands reverence.",
    cost: 15000, minLevel: 50, rarity: "legendary", subcategory: "flagship",
    isLimited: true,
    icon: "car-sport-outline", tags: '["vehicles","flagship","photo-eligible","showcase","prestige","legendary"]',
  },
  {
    id: "car-v2-vulcan", slug: "vulcan-r",
    name: "Vulcan R",
    description: "Most will never. You might.",
    fullDescription: "Track-focused hypercar. The Vulcan R exists in a category beyond aspiration. Owning it is proof that your discipline has no ceiling — a machine that few will ever touch.",
    cost: 25000, minLevel: 65, rarity: "legendary", subcategory: "hypercar",
    isLimited: true,
    icon: "car-sport-outline", tags: '["vehicles","hypercar","photo-eligible","showcase","prestige","legendary"]',
  },
];

// ─── Wheel Style Definitions ────────────────────────────────────────────────

export type WheelStyle = { key: string; label: string; cost: number; minLevel: number };

export const WHEEL_STYLES: WheelStyle[] = [
  { key: "classic",  label: "Classic",  cost: 0,   minLevel: 0 },
  { key: "sport",    label: "Sport",    cost: 500, minLevel: 10 },
  { key: "turbine",  label: "Turbine",  cost: 800, minLevel: 20 },
];

// ─── Prestige contribution by subcategory ────────────────────────────────────

const CAR_PRESTIGE_VALUES: Record<string, number> = {
  entry:         0,
  sport:         8,
  performance:  18,
  grandtouring: 25,
  flagship:     40,
  hypercar:     55,
};

// ─── Idempotent seed ──────────────────────────────────────────────────────────

async function ensureCarsSeeded() {
  for (const car of CAR_CATALOG) {
    const existing = await db.select({ id: shopItemsTable.id })
      .from(shopItemsTable).where(eq(shopItemsTable.id, car.id)).limit(1);
    if (existing.length === 0) {
      const defaultVariant = CAR_COLOR_VARIANTS[car.id]?.[0]?.key ?? null;
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
        isExclusive:  false,
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
        styleEffect:  JSON.stringify({
          class: car.subcategory,
          prestigeValue: CAR_PRESTIGE_VALUES[car.subcategory] ?? 0,
          defaultVariant,
          colorVariants: CAR_COLOR_VARIANTS[car.id] ?? [],
        }),
      } as any).onConflictDoNothing();
    }
  }
}

ensureCarsSeeded().catch((e) => console.error("[cars] seed error:", e.message));

// ─── Badge helpers ───────────────────────────────────────────────────────────

async function checkCarCollectionBadges(userId: string) {
  const inventory = await db.select({ itemId: userInventoryTable.itemId })
    .from(userInventoryTable).where(eq(userInventoryTable.userId, userId));

  const allCars = await db.select({ id: shopItemsTable.id, rarity: shopItemsTable.rarity })
    .from(shopItemsTable)
    .where(and(eq(shopItemsTable.category, "vehicle"), eq(shopItemsTable.status, "active")));

  const ownedCarIds = new Set(inventory.map(i => i.itemId));
  const ownedCars = allCars.filter(c => ownedCarIds.has(c.id));

  if (ownedCars.length >= 1) {
    await awardBadge(userId, "badge-first-wheel").catch(() => {});
  }
  if (ownedCars.length >= 3) {
    await awardBadge(userId, "badge-the-collection").catch(() => {});
  }
  if (ownedCars.some(c => c.rarity === "legendary")) {
    await awardBadge(userId, "badge-elite-garage").catch(() => {});
  }
}

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

    const ownedMap = new Map<string, typeof inventory[0]>();
    for (const inv of inventory) {
      if (allCars.some(c => c.id === inv.itemId)) {
        ownedMap.set(inv.itemId, inv);
      }
    }

    const featuredInv = inventory.find(i => i.displaySlot === "featured_car");
    const featuredCarId = featuredInv?.itemId ?? null;

    const userLevel = user?.level ?? 1;
    const coinBalance = user?.coinBalance ?? 0;

    const catalog = allCars.map((car) => {
      const invRow = ownedMap.get(car.id);
      const owned = !!invRow;
      const locked = false; // TODO: restore lock check before launch — was: userLevel < (car.minLevel ?? 0)
      const affordable = coinBalance >= car.cost;
      const tags: string[] = (() => {
        try { return JSON.parse(car.tags ?? "[]"); } catch { return []; }
      })();

      const variants = CAR_COLOR_VARIANTS[car.id] ?? [];
      const selectedVariant = invRow?.colorVariant ?? variants[0]?.key ?? null;
      const selectedWheelStyle = invRow?.wheelStyle ?? "classic";

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
        prestigeValue: CAR_PRESTIGE_VALUES[car.subcategory ?? "entry"] ?? 0,
        isPhotoEligible: tags.includes("photo-eligible"),
        isShowcaseEligible: tags.includes("showcase"),
        isOwned: owned,
        isLocked: locked,
        isFeatured: car.id === featuredCarId,
        isAffordable: affordable,
        lockReason: locked
          ? `Reach level ${car.minLevel} to unlock this vehicle.`
          : null,
        colorVariants: variants,
        selectedVariant,
        wheelStyles: WHEEL_STYLES,
        selectedWheelStyle,
      };
    });

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
      ownedCount: ownedMap.size,
      totalCount: allCars.length,
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
    const { colorVariant } = req.body ?? {};

    const [car] = await db.select().from(shopItemsTable)
      .where(and(eq(shopItemsTable.id, id), eq(shopItemsTable.category, "vehicle"))).limit(1);
    if (!car) return res.status(404).json({ error: "Car not found" });
    if (!car.isAvailable || car.status !== "active")
      return res.status(400).json({ error: "This vehicle is not available" });

    const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    // TODO: restore lock check before launch — was: if (user.level < (car.minLevel ?? 0)) { ... return 403 }
    // Level lock bypassed for testing

    if (user.coinBalance < car.cost) {
      trackEvent(Events.ITEM_PURCHASE_FAILED, userId, { itemId: id, reason: "insufficient_coins", cost: car.cost, balance: user.coinBalance, store: "cars" }).catch(() => {});
      return res.status(400).json({
        error: `Insufficient coins. You need ${car.cost} coins — you have ${user.coinBalance}.`,
      });
    }

    const existing = await db.select({ id: userInventoryTable.id })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (existing.length > 0)
      return res.status(400).json({ error: "You already own this vehicle." });

    const variants = CAR_COLOR_VARIANTS[id] ?? [];
    const selectedVariant = colorVariant && variants.some(v => v.key === colorVariant)
      ? colorVariant
      : variants[0]?.key ?? null;

    const newBalance = user.coinBalance - car.cost;
    const invId = generateId();

    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ coinBalance: newBalance, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));

      await tx.insert(userInventoryTable).values({
        id: invId, userId, itemId: id,
        isEquipped: false, source: "purchase",
        colorVariant: selectedVariant,
      });

      await tx.insert(rewardTransactionsTable).values({
        id: generateId(), userId,
        type: "spent", amount: car.cost,
        reason: `Purchased vehicle: ${car.name}`,
        balanceAfter: newBalance,
      });

      await tx.insert(auditLogTable).values({
        id: generateId(), actorId: userId,
        action: "car_purchased",
        details: JSON.stringify({ itemId: id, cost: car.cost, colorVariant: selectedVariant }),
      });
    });

    trackEvent(Events.ITEM_PURCHASED, userId, { itemId: id, cost: car.cost, category: "vehicle", store: "cars" }).catch(() => {});

    await checkCarCollectionBadges(userId).catch((e) =>
      console.error("[cars] badge check error:", e.message)
    );

    return res.json({ success: true, newBalance });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /cars/:id/feature ───────────────────────────────────────────────────

router.post("/:id/feature", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [inv] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (!inv) return res.status(403).json({ error: "You do not own this vehicle." });

    const [car] = await db.select({ id: shopItemsTable.id, category: shopItemsTable.category })
      .from(shopItemsTable).where(eq(shopItemsTable.id, id)).limit(1);
    if (!car || car.category !== "vehicle")
      return res.status(400).json({ error: "Not a vehicle item." });

    await db.update(userInventoryTable)
      .set({ displaySlot: null })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot, "featured_car")));

    await db.update(userInventoryTable)
      .set({ displaySlot: "featured_car" })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id)));

    trackEvent(Events.CAR_FEATURED, userId, { carId: id }).catch(() => {});

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

// ─── PATCH /cars/:id/variant — select color variant ─────────────────────────

router.patch("/:id/variant", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { colorVariant } = req.body ?? {};

    if (!colorVariant) return res.status(400).json({ error: "colorVariant is required" });

    const [inv] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (!inv) return res.status(403).json({ error: "You do not own this vehicle." });

    const variants = CAR_COLOR_VARIANTS[id] ?? [];
    if (!variants.some(v => v.key === colorVariant))
      return res.status(400).json({ error: "Invalid color variant for this vehicle." });

    await db.update(userInventoryTable)
      .set({ colorVariant })
      .where(eq(userInventoryTable.id, inv.id));

    return res.json({ success: true, colorVariant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /cars/:id/wheel — select wheel style ─────────────────────────────

router.patch("/:id/wheel", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { wheelStyle } = req.body ?? {};

    if (!wheelStyle) return res.status(400).json({ error: "wheelStyle is required" });

    const style = WHEEL_STYLES.find(w => w.key === wheelStyle);
    if (!style) return res.status(400).json({ error: "Invalid wheel style" });

    const [inv] = await db.select().from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, id))).limit(1);
    if (!inv) return res.status(403).json({ error: "You do not own this vehicle." });

    const carItem = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.id, id)).limit(1);
    if (!carItem.length || carItem[0].category !== "vehicle")
      return res.status(400).json({ error: "Item is not a vehicle." });

    if (style.cost > 0) {
      const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) return res.status(404).json({ error: "User not found" });

      // TODO: restore lock check before launch — was: if (user.level < style.minLevel) return 403
      // Wheel level lock bypassed for testing

      const alreadyOwned = await db.select({ id: userInventoryTable.id }).from(userInventoryTable)
        .where(and(
          eq(userInventoryTable.userId, userId),
          eq(userInventoryTable.itemId, `wheel-${wheelStyle}`),
        )).limit(1);

      if (!alreadyOwned.length) {
        if (user.coinBalance < style.cost)
          return res.status(400).json({ error: `Insufficient coins. Need ${style.cost}c.` });

        const newBalance = user.coinBalance - style.cost;

        await db.transaction(async (tx) => {
          await tx.update(usersTable)
            .set({ coinBalance: newBalance, updatedAt: new Date() })
            .where(eq(usersTable.id, userId));

          await tx.insert(userInventoryTable).values({
            id: generateId(), userId, itemId: `wheel-${wheelStyle}`,
            isEquipped: false, source: "purchase",
          });

          await tx.insert(rewardTransactionsTable).values({
            id: generateId(), userId, type: "spent", amount: style.cost,
            reason: `Purchased ${style.label} wheels`,
            balanceAfter: newBalance,
          });
        });
      }
    }

    await db.update(userInventoryTable)
      .set({ wheelStyle })
      .where(eq(userInventoryTable.id, inv.id));

    return res.json({ success: true, wheelStyle });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /cars/photo-mode — owned cars + featured car for photo mode ──────────

router.get("/photo-mode", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const inventory = await db.select().from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    const ownedCarIds = inventory.map(i => i.itemId);
    if (ownedCarIds.length === 0) {
      return res.json({ ownedCars: [], featuredCar: null });
    }

    const allCars = await db.select().from(shopItemsTable)
      .where(eq(shopItemsTable.category, "vehicle"));

    const invMap = new Map(inventory.map(i => [i.itemId, i]));

    const ownedCars = allCars
      .filter(c => ownedCarIds.includes(c.id) && c.status === "active")
      .map(c => {
        const inv = invMap.get(c.id);
        const variants = CAR_COLOR_VARIANTS[c.id] ?? [];
        return {
          id: c.id, name: c.name, rarity: c.rarity, carClass: c.subcategory,
          icon: c.icon, description: c.description,
          prestigeValue: CAR_PRESTIGE_VALUES[c.subcategory ?? "entry"] ?? 0,
          isPhotoEligible: true,
          colorVariants: variants,
          selectedVariant: inv?.colorVariant ?? variants[0]?.key ?? null,
          selectedWheelStyle: inv?.wheelStyle ?? "classic",
        };
      });

    const featuredInv = inventory.find(i => i.displaySlot === "featured_car");
    const featuredCar = ownedCars.find(c => c.id === featuredInv?.itemId) ?? ownedCars[0] ?? null;

    return res.json({ ownedCars, featuredCar });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /cars/featured-info — lightweight featured car data for profiles ────

router.get("/featured-info", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [featuredInv] = await db.select()
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot, "featured_car")))
      .limit(1);

    if (!featuredInv) return res.json({ featuredCar: null });

    const [car] = await db.select({ id: shopItemsTable.id, name: shopItemsTable.name, rarity: shopItemsTable.rarity, subcategory: shopItemsTable.subcategory })
      .from(shopItemsTable).where(eq(shopItemsTable.id, featuredInv.itemId)).limit(1);

    if (!car) return res.json({ featuredCar: null });

    return res.json({
      featuredCar: {
        id: car.id,
        name: car.name,
        rarity: car.rarity,
        carClass: car.subcategory,
        prestigeValue: CAR_PRESTIGE_VALUES[car.subcategory ?? "entry"] ?? 0,
        colorVariant: featuredInv.colorVariant,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export { CAR_PRESTIGE_VALUES };
export default router;
