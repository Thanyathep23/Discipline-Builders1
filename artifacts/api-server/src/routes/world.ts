import { Router } from "express";
import {
  db, usersTable, shopItemsTable, userInventoryTable,
  userSkillsTable, lifeProfilesTable, userTitlesTable, titlesTable,
  userBadgesTable, badgesTable, auditLogTable, rewardTransactionsTable,
} from "@workspace/db";
import { eq, and, isNotNull, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";

const router = Router();

const ROOM_ZONES = [
  "room_theme", "desk", "coffee_station", "monitor",
  "bookshelf", "audio", "plants", "trophy_case", "lighting",
] as const;

const ROOM_ENVIRONMENTS = [
  {
    id: "env-starter-studio",
    name: "Starter Studio",
    description: "Where every operator begins. Clean walls, basic lighting, one window to the city.",
    cost: 0, minLevel: 1,
    wallStyle: "standard", windowType: "small", floorType: "concrete",
    isDefault: true,
  },
  {
    id: "env-dark-office",
    name: "Dark Office",
    description: "Blacked-out workspace. City skyline through floor-to-ceiling glass. Built for focus.",
    cost: 1000, minLevel: 8,
    wallStyle: "dark-panel", windowType: "city-skyline", floorType: "dark-wood",
    isDefault: false,
  },
  {
    id: "env-executive-suite",
    name: "Executive Suite",
    description: "Corner office energy. Panoramic views, oak paneling, and the scent of ambition.",
    cost: 5000, minLevel: 25,
    wallStyle: "oak-panel", windowType: "panoramic", floorType: "marble",
    isDefault: false,
  },
] as const;

type RoomEnvironment = typeof ROOM_ENVIRONMENTS[number];

type RoomZone = typeof ROOM_ZONES[number];

const SLOT_ELIGIBILITY: Record<string, string[]> = {
  room_theme:     ["room_decor"],
  desk:           ["room_decor"],
  coffee_station: ["room_decor"],
  monitor:        ["room_decor"],
  bookshelf:      ["room_decor"],
  audio:          ["room_decor"],
  plants:         ["room_decor"],
  trophy_case:    ["room_decor"],
  lighting:       ["room_decor"],
  centerpiece:    ["trophy", "prestige"],
  trophy_shelf_1: ["trophy"],
  trophy_shelf_2: ["trophy"],
  trophy_shelf_3: ["trophy"],
  prestige_marker:["prestige"],
};

const SLOT_ROOM_ZONES: Record<string, string> = {
  desk:           "desk",
  coffee_station: "coffee_station",
  monitor:        "monitor",
  bookshelf:      "bookshelf",
  audio:          "audio",
  plants:         "plants",
  trophy_case:    "trophy_case",
  lighting:       "lighting",
  room_theme:     "room_theme",
};

const ROOM_DECOR_SEED = [
  {
    id: "room-decor-desk-minimal", slug: "minimal-desk-setup", name: "Minimal Desk Setup",
    description: "A clean slate. Every empire starts here.",
    cost: 0, category: "room_decor", icon: "desktop-outline", rarity: "common",
    itemType: "room_decor", roomZone: "desk", minLevel: 1, sortOrder: 1,
  },
  {
    id: "room-decor-desk-oak", slug: "premium-oak-desk", name: "Premium Oak Desk",
    description: "Solid. Serious. Built to work.",
    cost: 800, category: "room_decor", icon: "desktop-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "desk", minLevel: 5, sortOrder: 2,
  },
  {
    id: "room-decor-desk-carbon", slug: "executive-carbon-desk", name: "Executive Carbon Desk",
    description: "The desk of someone who means business.",
    cost: 4500, category: "room_decor", icon: "desktop-outline", rarity: "elite",
    itemType: "room_decor", roomZone: "desk", minLevel: 25, sortOrder: 3,
  },
  {
    id: "room-decor-coffee-espresso", slug: "espresso-machine", name: "Espresso Machine",
    description: "Fuel for focus. Non-negotiable.",
    cost: 1200, category: "room_decor", icon: "cafe-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "coffee_station", minLevel: 8, sortOrder: 10,
  },
  {
    id: "room-decor-coffee-pourover", slug: "premium-pour-over", name: "Premium Pour-Over Set",
    description: "Ritual before results.",
    cost: 2800, category: "room_decor", icon: "cafe-outline", rarity: "prestige",
    itemType: "room_decor", roomZone: "coffee_station", minLevel: 18, sortOrder: 11,
  },
  {
    id: "room-decor-monitor-dual", slug: "dual-monitor-setup", name: "Dual Monitor Setup",
    description: "Double the screen. Double the output.",
    cost: 1500, category: "room_decor", icon: "tv-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "monitor", minLevel: 10, sortOrder: 20,
  },
  {
    id: "room-decor-monitor-ultrawide", slug: "ultrawide-command-screen", name: "Ultrawide Command Screen",
    description: "One screen to rule them all.",
    cost: 5000, category: "room_decor", icon: "tv-outline", rarity: "elite",
    itemType: "room_decor", roomZone: "monitor", minLevel: 30, sortOrder: 21,
  },
  {
    id: "room-decor-monitor-trading", slug: "trading-terminal-setup", name: "Trading Terminal Setup",
    description: "Where positions are opened and closed.",
    cost: 3500, category: "room_decor", icon: "tv-outline", rarity: "prestige",
    itemType: "room_decor", roomZone: "monitor", minLevel: 20, sortOrder: 22,
  },
  {
    id: "room-decor-bookshelf", slug: "minimal-bookshelf", name: "Minimal Bookshelf",
    description: "Knowledge on display.",
    cost: 600, category: "room_decor", icon: "book-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "bookshelf", minLevel: 6, sortOrder: 30,
  },
  {
    id: "room-decor-speaker", slug: "premium-speaker-system", name: "Premium Speaker System",
    description: "The soundtrack of execution.",
    cost: 2200, category: "room_decor", icon: "musical-notes-outline", rarity: "prestige",
    itemType: "room_decor", roomZone: "audio", minLevel: 15, sortOrder: 31,
  },
  {
    id: "room-decor-plants", slug: "indoor-plant-collection", name: "Indoor Plant Collection",
    description: "Life in the workspace.",
    cost: 300, category: "room_decor", icon: "leaf-outline", rarity: "common",
    itemType: "room_decor", roomZone: "plants", minLevel: 3, sortOrder: 32,
  },
  {
    id: "room-decor-trophy-case", slug: "trophy-display-case", name: "Trophy Display Case",
    description: "Evidence of the work.",
    cost: 3000, category: "room_decor", icon: "trophy-outline", rarity: "elite",
    itemType: "room_decor", roomZone: "trophy_case", minLevel: 20, sortOrder: 33,
  },
  {
    id: "room-decor-lighting-led", slug: "led-ambient-lighting", name: "LED Ambient Lighting",
    description: "Set the mood. Control the environment.",
    cost: 900, category: "room_decor", icon: "bulb-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "lighting", minLevel: 8, sortOrder: 40,
  },
  {
    id: "room-decor-lighting-arc", slug: "premium-arc-floor-lamp", name: "Premium Arc Floor Lamp",
    description: "Luxury light. Premium atmosphere.",
    cost: 2500, category: "room_decor", icon: "bulb-outline", rarity: "prestige",
    itemType: "room_decor", roomZone: "lighting", minLevel: 20, sortOrder: 41,
  },
  {
    id: "room-decor-theme-dark", slug: "dark-command-theme", name: "Dark Command Theme",
    description: "Dark. Focused. Minimal.",
    cost: 1000, category: "room_decor", icon: "moon-outline", rarity: "refined",
    itemType: "room_decor", roomZone: "room_theme", minLevel: 5, sortOrder: 50,
  },
  {
    id: "room-decor-theme-executive", slug: "executive-suite-theme", name: "Executive Suite Theme",
    description: "Corner office energy.",
    cost: 6000, category: "room_decor", icon: "business-outline", rarity: "elite",
    itemType: "room_decor", roomZone: "room_theme", minLevel: 30, sortOrder: 51,
  },
  {
    id: "room-decor-theme-trading", slug: "trading-floor-theme", name: "Trading Floor Theme",
    description: "Built for the market.",
    cost: 4500, category: "room_decor", icon: "trending-up-outline", rarity: "prestige",
    itemType: "room_decor", roomZone: "room_theme", minLevel: 25, sortOrder: 52,
  },
];

async function seedRoomDecor() {
  for (const item of ROOM_DECOR_SEED) {
    const existing = await db.select({ id: shopItemsTable.id })
      .from(shopItemsTable).where(eq(shopItemsTable.id, item.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(shopItemsTable).values({
        id: item.id, slug: item.slug, name: item.name, description: item.description,
        cost: item.cost, category: item.category, icon: item.icon, rarity: item.rarity,
        itemType: item.itemType, isEquippable: false, isDisplayable: true, isWorldItem: true,
        roomZone: item.roomZone, minLevel: item.minLevel, sortOrder: item.sortOrder,
        tags: "[]", status: "active", acquisitionSource: "purchase",
      } as any);
    } else {
      await db.update(shopItemsTable).set({
        name: item.name, description: item.description, cost: item.cost,
        roomZone: item.roomZone, rarity: item.rarity, minLevel: item.minLevel,
        isDisplayable: true, isWorldItem: true, category: item.category,
        itemType: item.itemType,
      }).where(eq(shopItemsTable.id, item.id));
    }
  }
}

seedRoomDecor().catch((e) => console.error("[world] seed error:", e.message));

const RARITY_WEIGHTS: Record<string, number> = {
  common: 3, refined: 8, prestige: 15, elite: 25, legendary: 40,
  uncommon: 5, rare: 10, epic: 20,
};

const ROOM_TIERS = [
  { min: 0,   label: "Standard Base" },
  { min: 30,  label: "Emerging Workspace" },
  { min: 75,  label: "Professional Setup" },
  { min: 150, label: "Premium Command Center" },
  { min: 250, label: "Executive Suite" },
  { min: 400, label: "Iconic Command Center" },
] as const;

const TIER_LABELS_MAP = ["Unranked", "Recruit", "Rising", "Established", "Elite", "Legendary"];

interface RoomState {
  roomTier: number;
  roomTierLabel: string;
  roomScore: number;
  placedZones: string[];
  nextEvolutionHints: string[];
}

function computeRoomScore(params: {
  placedItems: { zone: string; rarity: string; itemId: string }[];
  hasCharacterInRoom: boolean;
  hasLighting: boolean;
  hasRoomTheme: boolean;
}): RoomState {
  const { placedItems, hasCharacterInRoom, hasLighting, hasRoomTheme } = params;

  let score = 0;
  const placedZones: string[] = [];

  for (const item of placedItems) {
    score += RARITY_WEIGHTS[item.rarity] ?? 3;
    if (!placedZones.includes(item.zone)) placedZones.push(item.zone);
  }

  if (hasRoomTheme) score += 20;
  if (hasCharacterInRoom) score += 5;
  if (hasLighting) score += 8;

  let roomTier = 0;
  for (let i = ROOM_TIERS.length - 1; i >= 0; i--) {
    if (score >= ROOM_TIERS[i].min) { roomTier = i; break; }
  }

  const roomTierLabel = ROOM_TIERS[roomTier].label;

  const hints: string[] = [];
  if (!hasRoomTheme)         hints.push("Apply a room theme to set the atmosphere.");
  if (!placedZones.includes("desk"))    hints.push("Set up a desk to establish your workspace.");
  if (!placedZones.includes("monitor")) hints.push("Add a monitor setup to boost productivity.");
  if (!hasLighting)          hints.push("Install lighting to enhance the ambiance.");
  if (!hasCharacterInRoom)   hints.push("Place your character in the room for bonus points.");
  if (hints.length === 0)    hints.push("Your command center is thriving. Keep upgrading.");

  return {
    roomTier, roomTierLabel, roomScore: score,
    placedZones,
    nextEvolutionHints: hints.slice(0, 2),
  };
}

const MILESTONE_DEFS = [
  { id: "room-first-decoration", name: "First Decoration", icon: "home", check: (z: string[]) => z.length >= 1 },
  { id: "room-workspace-ready",  name: "Workspace Ready",  icon: "desktop-outline", check: (z: string[], items: any[]) => items.some(i => i.zone === "desk") && items.some(i => i.zone === "monitor") },
  { id: "room-coffee-culture",   name: "Coffee Culture",   icon: "cafe", check: (_z: string[], items: any[]) => items.some(i => i.zone === "coffee_station") },
  { id: "room-command-center-1", name: "Command Center I",  icon: "shield-checkmark", check: (_z: string[], _i: any[], tier: number) => tier >= 2 },
  { id: "room-executive-setup",  name: "Executive Setup",   icon: "star", check: (_z: string[], _i: any[], tier: number) => tier >= 4 },
  { id: "room-full-setup",       name: "Full Setup",        icon: "checkmark-done-circle", check: (z: string[]) => ["desk", "monitor", "coffee_station", "bookshelf", "lighting", "plants"].every(zone => z.includes(zone)) },
];

async function checkAndAwardMilestones(userId: string, placedZones: string[], placedItems: any[], tier: number) {
  const existingBadges = await db.select({ badgeId: userBadgesTable.badgeId })
    .from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
  const owned = new Set(existingBadges.map(b => b.badgeId));
  const awarded: string[] = [];

  for (const m of MILESTONE_DEFS) {
    if (owned.has(m.id)) continue;
    if (m.check(placedZones, placedItems, tier)) {
      const badgeExists = await db.select({ id: badgesTable.id })
        .from(badgesTable).where(eq(badgesTable.id, m.id)).limit(1);
      if (badgeExists.length === 0) {
        try {
          await db.insert(badgesTable).values({
            id: m.id, name: m.name, icon: m.icon, rarity: "rare",
            category: "room", description: `Room milestone: ${m.name}`,
          } as any);
        } catch { /* badge already exists from concurrent request */ }
      }
      const result = await db.execute(sql`
        INSERT INTO user_badges (id, user_id, badge_id, earned_at)
        VALUES (${generateId()}, ${userId}, ${m.id}, NOW())
        ON CONFLICT (user_id, badge_id) DO NOTHING
        RETURNING id
      `);
      if ((result as any).rowCount > 0 || (result as any).rows?.length > 0) {
        awarded.push(m.name);
      }
    }
  }
  return awarded;
}

async function getActiveEnvironment(userId: string): Promise<string> {
  const rows = await db.select({ details: auditLogTable.details })
    .from(auditLogTable)
    .where(and(
      eq(auditLogTable.actorId, userId),
      eq(auditLogTable.action, "room_environment_switch"),
    ))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(1);
  if (rows.length === 0) return "env-starter-studio";
  try {
    const d = JSON.parse(rows[0].details ?? "{}");
    return d.environmentId ?? "env-starter-studio";
  } catch { return "env-starter-studio"; }
}

async function getCharacterInRoom(userId: string): Promise<boolean> {
  const rows = await db.select({ details: auditLogTable.details })
    .from(auditLogTable)
    .where(and(
      eq(auditLogTable.actorId, userId),
      eq(auditLogTable.action, "room_character_toggle"),
    ))
    .orderBy(desc(auditLogTable.createdAt))
    .limit(1);
  if (rows.length === 0) return false;
  try {
    const d = JSON.parse(rows[0].details ?? "{}");
    return d.inRoom === true;
  } catch { return false; }
}

router.get("/room", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const inventory = await db.select({
      invId:       userInventoryTable.id,
      itemId:      userInventoryTable.itemId,
      isEquipped:  userInventoryTable.isEquipped,
      displaySlot: userInventoryTable.displaySlot,
      source:      userInventoryTable.source,
      name:        shopItemsTable.name,
      icon:        shopItemsTable.icon,
      rarity:      shopItemsTable.rarity,
      itemType:    shopItemsTable.itemType,
      description: shopItemsTable.description,
      category:    shopItemsTable.category,
      roomZone:    shopItemsTable.roomZone,
      cost:        shopItemsTable.cost,
      minLevel:    shopItemsTable.minLevel,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    const activeTitle = await (async () => {
      const rows = await db.select({
        titleId: userTitlesTable.titleId, isActive: userTitlesTable.isActive,
        name: titlesTable.name, rarity: titlesTable.rarity, category: titlesTable.category,
      })
        .from(userTitlesTable)
        .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
        .where(eq(userTitlesTable.userId, userId));
      return rows.find(t => t.isActive) ?? null;
    })();

    const badgesRows = await db.select({
      badgeId: userBadgesTable.badgeId, name: badgesTable.name,
      icon: badgesTable.icon, rarity: badgesTable.rarity, category: badgesTable.category,
    })
      .from(userBadgesTable)
      .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .where(eq(userBadgesTable.userId, userId));

    const [profile] = await db.select()
      .from(lifeProfilesTable)
      .where(eq(lifeProfilesTable.userId, userId))
      .limit(1);

    const allSlots = [
      ...ROOM_ZONES,
      "centerpiece", "trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3", "prestige_marker",
    ];

    const slotMap: Record<string, typeof inventory[0] | null> = {};
    for (const sl of allSlots) slotMap[sl] = null;

    for (const inv of inventory) {
      if (inv.displaySlot && slotMap[inv.displaySlot] !== undefined) {
        slotMap[inv.displaySlot] = inv;
      }
    }

    const placedItems: { zone: string; rarity: string; itemId: string }[] = [];
    for (const zone of ROOM_ZONES) {
      const item = slotMap[zone];
      if (item) placedItems.push({ zone, rarity: item.rarity, itemId: item.itemId });
    }

    const isCharacterInRoom = await getCharacterInRoom(userId);
    const activeEnvId = await getActiveEnvironment(userId);
    const activeEnv = ROOM_ENVIRONMENTS.find(e => e.id === activeEnvId) ?? ROOM_ENVIRONMENTS[0];

    const roomState = computeRoomScore({
      placedItems,
      hasCharacterInRoom: isCharacterInRoom,
      hasLighting: !!slotMap["lighting"],
      hasRoomTheme: !!slotMap["room_theme"],
    });

    const slots = Object.fromEntries(
      Object.entries(slotMap).map(([slot, inv]) => [
        slot,
        inv ? {
          itemId: inv.itemId, name: inv.name, icon: inv.icon,
          rarity: inv.rarity, itemType: inv.itemType, description: inv.description,
          roomZone: inv.roomZone,
        } : null,
      ])
    );

    const displayedItemIds = new Set(
      Object.values(slotMap).filter(Boolean).map(i => i!.itemId)
    );
    const ownedNotDisplayed = inventory
      .filter(inv => !displayedItemIds.has(inv.itemId) && inv.category === "room_decor")
      .map(inv => ({
        itemId: inv.itemId, name: inv.name, icon: inv.icon,
        rarity: inv.rarity, itemType: inv.itemType, category: inv.category,
        roomZone: inv.roomZone,
      }));

    const activeThemeName = slotMap["room_theme"]
      ? slotMap["room_theme"].name
      : "Standard Base";

    return res.json({
      themeName: activeThemeName,
      slots,
      roomState,
      isCharacterInRoom,
      activeTitle: activeTitle ? { name: activeTitle.name, rarity: activeTitle.rarity, category: activeTitle.category } : null,
      earnedBadges: badgesRows.map(b => ({ badgeId: b.badgeId, name: b.name, icon: b.icon, rarity: b.rarity, category: b.category })),
      ownedNotDisplayed,
      environment: {
        id: activeEnv.id,
        name: activeEnv.name,
        wallStyle: activeEnv.wallStyle,
        windowType: activeEnv.windowType,
        floorType: activeEnv.floorType,
      },
      stats: {
        totalOwned: inventory.filter(i => i.category === "room_decor").length,
        totalDisplayed: displayedItemIds.size,
        totalBadges: badgesRows.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/room/eligibility", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const inventory = await db.select({
      itemId:      userInventoryTable.itemId,
      displaySlot: userInventoryTable.displaySlot,
      name:        shopItemsTable.name,
      icon:        shopItemsTable.icon,
      rarity:      shopItemsTable.rarity,
      itemType:    shopItemsTable.itemType,
      category:    shopItemsTable.category,
      roomZone:    shopItemsTable.roomZone,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    const eligibilityMap = Object.fromEntries(
      Object.entries(SLOT_ELIGIBILITY).map(([slot, allowedTypes]) => {
        const requiredZone = SLOT_ROOM_ZONES[slot] ?? null;
        return [
          slot,
          inventory
            .filter(inv => {
              const typeMatch = allowedTypes.includes(inv.itemType ?? "") || allowedTypes.includes(inv.category);
              if (!typeMatch) return false;
              if (requiredZone) return inv.roomZone === requiredZone;
              return true;
            })
            .map(inv => ({
              itemId: inv.itemId, name: inv.name, icon: inv.icon,
              rarity: inv.rarity, itemType: inv.itemType, roomZone: inv.roomZone,
              isCurrentlyInSlot: inv.displaySlot === slot,
            })),
        ];
      })
    );

    return res.json({ slots: eligibilityMap });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/room/slots", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { slot, itemId } = req.body;

    if (!slot || !itemId) {
      return res.status(400).json({ error: "slot and itemId are required" });
    }

    const allowedTypes = SLOT_ELIGIBILITY[slot];
    if (!allowedTypes) {
      return res.status(400).json({ error: `Unknown slot: ${slot}` });
    }

    const [ownership] = await db.select({
      id:       userInventoryTable.id,
      itemType: shopItemsTable.itemType,
      category: shopItemsTable.category,
      roomZone: shopItemsTable.roomZone,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)))
      .limit(1);

    if (!ownership) {
      return res.status(403).json({ error: "Item not owned" });
    }

    if (!allowedTypes.includes(ownership.itemType ?? "") && !allowedTypes.includes(ownership.category ?? "")) {
      return res.status(400).json({ error: `Item cannot be placed in slot '${slot}'` });
    }

    const requiredZone = SLOT_ROOM_ZONES[slot] ?? null;
    if (requiredZone && ownership.roomZone !== requiredZone) {
      return res.status(400).json({ error: `This item cannot be placed in the '${slot}' slot` });
    }

    await db.execute(sql`
      UPDATE user_inventory SET display_slot = NULL
      WHERE user_id = ${userId} AND display_slot = ${slot}
    `);
    await db.execute(sql`
      UPDATE user_inventory SET display_slot = ${slot}
      WHERE user_id = ${userId} AND item_id = ${itemId}
    `);

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: userId, actorRole: "user",
      action: "world_slot_assigned", targetId: itemId, targetType: "shop_item",
      details: JSON.stringify({ slot }),
    });

    const allInv = await db.select({
      displaySlot: userInventoryTable.displaySlot,
      rarity: shopItemsTable.rarity,
      itemId: userInventoryTable.itemId,
      roomZone: shopItemsTable.roomZone,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(and(eq(userInventoryTable.userId, userId), isNotNull(userInventoryTable.displaySlot as any)));

    const placedItems = allInv
      .filter(i => ROOM_ZONES.includes(i.displaySlot as any))
      .map(i => ({ zone: i.displaySlot!, rarity: i.rarity, itemId: i.itemId }));
    const isCharInRoom = await getCharacterInRoom(userId);
    const rs = computeRoomScore({
      placedItems, hasCharacterInRoom: isCharInRoom,
      hasLighting: placedItems.some(p => p.zone === "lighting"),
      hasRoomTheme: placedItems.some(p => p.zone === "room_theme"),
    });

    const awarded = await checkAndAwardMilestones(
      userId, rs.placedZones, placedItems, rs.roomTier,
    );

    return res.json({ success: true, slot, itemId, roomState: rs, awardedMilestones: awarded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/room/slots/:slot", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { slot } = req.params;

    if (!SLOT_ELIGIBILITY[slot]) {
      return res.status(400).json({ error: `Unknown slot: ${slot}` });
    }

    const rows = await db.select({ id: userInventoryTable.id, itemId: userInventoryTable.itemId })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot as any, slot)));

    for (const row of rows) {
      await db.update(userInventoryTable)
        .set({ displaySlot: null })
        .where(eq(userInventoryTable.id, row.id));
    }

    return res.json({ success: true, slot, cleared: rows.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/room/toggle-character", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { inRoom } = req.body;

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: userId, actorRole: "user",
      action: "room_character_toggle", targetId: userId, targetType: "user",
      details: JSON.stringify({ inRoom: !!inRoom }),
    });

    return res.json({ success: true, isCharacterInRoom: !!inRoom });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/room/shop-items", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const zone = (req.query.zone as string) || null;

    const items = await db.select()
      .from(shopItemsTable)
      .where(eq(shopItemsTable.category, "room_decor"));

    const owned = await db.select({ itemId: userInventoryTable.itemId })
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedSet = new Set(owned.map(o => o.itemId));

    const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const filtered = zone
      ? items.filter(i => i.roomZone === zone)
      : items;

    const result = filtered.map(item => ({
      id: item.id, name: item.name, description: item.description,
      cost: item.cost, rarity: item.rarity, icon: item.icon,
      roomZone: item.roomZone, minLevel: item.minLevel,
      isOwned: ownedSet.has(item.id),
      canAfford: (user?.coinBalance ?? 0) >= item.cost,
      meetsLevel: (user?.level ?? 1) >= item.minLevel,
    }));

    return res.json({
      items: result,
      coinBalance: user?.coinBalance ?? 0,
      userLevel: user?.level ?? 1,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/room/environments", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const inventory = await db.select({ itemId: userInventoryTable.itemId })
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));
    const ownedSet = new Set(inventory.map(i => i.itemId));

    const activeEnvId = await getActiveEnvironment(userId);

    const environments = ROOM_ENVIRONMENTS.map(env => ({
      id: env.id,
      name: env.name,
      description: env.description,
      cost: env.cost,
      minLevel: env.minLevel,
      wallStyle: env.wallStyle,
      windowType: env.windowType,
      floorType: env.floorType,
      isOwned: env.isDefault || ownedSet.has(env.id),
      isActive: env.id === activeEnvId,
      isLocked: (user?.level ?? 1) < env.minLevel,
      canAfford: (user?.coinBalance ?? 0) >= env.cost,
    }));

    return res.json({
      environments,
      activeEnvironmentId: activeEnvId,
      coinBalance: user?.coinBalance ?? 0,
      userLevel: user?.level ?? 1,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/room/environments/:id/purchase", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const envId = req.params.id;

    const env = ROOM_ENVIRONMENTS.find(e => e.id === envId);
    if (!env) return res.status(404).json({ error: "Environment not found" });
    if (env.isDefault) return res.status(400).json({ error: "Starter environment is free" });

    const [user] = await db.select({ level: usersTable.level, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.level < env.minLevel)
      return res.status(403).json({ error: `Reach level ${env.minLevel} to unlock ${env.name}.` });

    const existing = await db.select({ id: userInventoryTable.id })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, envId)))
      .limit(1);
    if (existing.length > 0)
      return res.status(400).json({ error: "You already own this environment." });

    if (user.coinBalance < env.cost)
      return res.status(400).json({ error: `Insufficient coins. Need ${env.cost}c — you have ${user.coinBalance}c.` });

    const newBalance = user.coinBalance - env.cost;

    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ coinBalance: newBalance, updatedAt: new Date() })
        .where(eq(usersTable.id, userId));

      await tx.insert(userInventoryTable).values({
        id: generateId(), userId, itemId: envId,
        isEquipped: false, source: "purchase",
      });

      await tx.insert(rewardTransactionsTable).values({
        id: generateId(), userId, type: "spent", amount: env.cost,
        reason: `Purchased room environment: ${env.name}`,
        balanceAfter: newBalance,
      });
    });

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: userId, actorRole: "user",
      action: "room_environment_switch", targetId: envId, targetType: "room_environment",
      details: JSON.stringify({ environmentId: envId }),
    });

    return res.json({ success: true, newBalance, environmentId: envId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/room/environments/:id/switch", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const envId = req.params.id;

    const env = ROOM_ENVIRONMENTS.find(e => e.id === envId);
    if (!env) return res.status(404).json({ error: "Environment not found" });

    if (!env.isDefault) {
      const [ownership] = await db.select({ id: userInventoryTable.id })
        .from(userInventoryTable)
        .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, envId)))
        .limit(1);
      if (!ownership) return res.status(403).json({ error: "You do not own this environment." });
    }

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: userId, actorRole: "user",
      action: "room_environment_switch", targetId: envId, targetType: "room_environment",
      details: JSON.stringify({ environmentId: envId }),
    });

    return res.json({
      success: true,
      environmentId: envId,
      environment: {
        id: env.id, name: env.name,
        wallStyle: env.wallStyle, windowType: env.windowType, floorType: env.floorType,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/admin/stats", requireAdmin, async (req: any, res) => {
  try {
    const allSlotted = await db.select({
      userId:      userInventoryTable.userId,
      itemId:      userInventoryTable.itemId,
      displaySlot: userInventoryTable.displaySlot,
      name:        shopItemsTable.name,
      itemType:    shopItemsTable.itemType,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(isNotNull(userInventoryTable.displaySlot as any));

    const slotBreakdown: Record<string, number> = {};
    const itemUsage: Record<string, { name: string; count: number }> = {};
    for (const row of allSlotted) {
      const s = row.displaySlot ?? "unknown";
      slotBreakdown[s] = (slotBreakdown[s] ?? 0) + 1;
      itemUsage[row.itemId] = itemUsage[row.itemId]
        ? { ...itemUsage[row.itemId], count: itemUsage[row.itemId].count + 1 }
        : { name: row.name, count: 1 };
    }

    return res.json({
      totalDisplayed: allSlotted.length,
      slotBreakdown,
      itemUsage: Object.entries(itemUsage)
        .map(([id, v]) => ({ itemId: id, ...v }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
