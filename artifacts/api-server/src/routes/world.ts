import { Router } from "express";
import {
  db, usersTable, shopItemsTable, userInventoryTable,
  userSkillsTable, lifeProfilesTable, userTitlesTable, titlesTable,
  userBadgesTable, badgesTable, auditLogTable,
} from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";

const router = Router();

// ─── Theme definitions ────────────────────────────────────────────────────────
const ROOM_THEMES: Record<string, {
  id: string; name: string; tier: number;
  accentColor: string; icon: string; description: string;
}> = {
  "asset-focus-shrine": {
    id: "asset-focus-shrine", name: "Focus Shrine", tier: 1,
    accentColor: "#00D4FF", icon: "home",
    description: "A dedicated deep work environment. Distraction-free by design.",
  },
  "asset-command-terminal": {
    id: "asset-command-terminal", name: "Command Terminal", tier: 2,
    accentColor: "#F5C842", icon: "desktop-outline",
    description: "Black-glass terminal for elite operators. Built for the highest level.",
  },
  "asset-war-room": {
    id: "asset-war-room", name: "War Room", tier: 3,
    accentColor: "#FF3D71", icon: "business",
    description: "The inner sanctum. Plan, execute, and dominate your craft.",
  },
};

const DEFAULT_THEME = {
  id: null, name: "Standard Base", tier: 0,
  accentColor: "#7C5CFC", icon: "grid-outline",
  description: "Your starting point. Upgrade your command center to unlock environments.",
};

// Valid display slots and their eligible item types
const SLOT_ELIGIBILITY: Record<string, string[]> = {
  room_theme:       ["room"],
  centerpiece:      ["trophy", "prestige"],
  trophy_shelf_1:   ["trophy"],
  trophy_shelf_2:   ["trophy"],
  trophy_shelf_3:   ["trophy"],
  prestige_marker:  ["prestige"],
  // Phase 30 — Workspace zones
  desk_setup:       ["decor"],
  lifestyle_item:   ["decor"],
};

// Phase 30 — Zone-narrowing: these slots require matching roomZone on the item
const SLOT_ROOM_ZONES: Record<string, string> = {
  desk_setup:     "desk_setup",
  lifestyle_item: "lifestyle_item",
};

// ─── Phase 30 — Room Decor Seed Catalog ──────────────────────────────────────

const ROOM_DECOR_SEED = [
  {
    id: "room-decor-desk-001", slug: "minimal-desk", name: "Minimal Desk Setup",
    description: "A clean, organized surface. The foundation of a serious workspace.",
    cost: 0, category: "room", icon: "desktop-outline", rarity: "common",
    itemType: "decor", isEquippable: false, isDisplayable: true, isWorldItem: true,
    roomZone: "desk_setup", styleEffect: "Clean and organized. A solid base.",
  },
  {
    id: "room-decor-desk-002", slug: "command-desk", name: "Command Desk",
    description: "Dual-monitor setup, cable management, a premium mat. Built for focus.",
    cost: 180, category: "room", icon: "desktop-outline", rarity: "uncommon",
    itemType: "decor", isEquippable: false, isDisplayable: true, isWorldItem: true,
    roomZone: "desk_setup", styleEffect: "Professional setup. Signals serious operation.",
  },
  {
    id: "room-decor-desk-003", slug: "premium-workstation", name: "Premium Workstation",
    description: "Standing-height glass desk, ultra-wide monitor, mechanical keyboard. Elite tier.",
    cost: 380, category: "room", icon: "desktop-outline", rarity: "rare",
    itemType: "decor", isEquippable: false, isDisplayable: true, isWorldItem: true,
    roomZone: "desk_setup", styleEffect: "Elite-class workstation. Maximum operator presence.",
  },
  {
    id: "room-decor-life-001", slug: "pro-chair", name: "Ergonomic Pro Chair",
    description: "A premium ergonomic command chair. Your posture. Your position.",
    cost: 140, category: "room", icon: "accessibility-outline", rarity: "uncommon",
    itemType: "decor", isEquippable: false, isDisplayable: true, isWorldItem: true,
    roomZone: "lifestyle_item", styleEffect: "Refinement signals. Operators invest in their seat.",
  },
  {
    id: "room-decor-life-002", slug: "coffee-station", name: "Coffee Station",
    description: "A premium pour-over setup. Ritual matters.",
    cost: 85, category: "room", icon: "cafe-outline", rarity: "common",
    itemType: "decor", isEquippable: false, isDisplayable: true, isWorldItem: true,
    roomZone: "lifestyle_item", styleEffect: "Daily ritual. A signal of intention and consistency.",
  },
];

async function seedRoomDecor() {
  for (const item of ROOM_DECOR_SEED) {
    const existing = await db.select({ id: shopItemsTable.id })
      .from(shopItemsTable).where(eq(shopItemsTable.id, item.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(shopItemsTable).values({
        id: item.id, slug: item.slug, name: item.name, description: item.description,
        cost: item.cost, category: item.category, icon: item.icon, rarity: item.rarity as any,
        itemType: item.itemType, isEquippable: item.isEquippable as any, isDisplayable: item.isDisplayable,
        isWorldItem: item.isWorldItem, roomZone: item.roomZone,
        styleEffect: item.styleEffect, sortOrder: 10,
        tags: "[]", status: "active", acquisitionSource: "purchase",
      } as any);
    } else {
      await db.update(shopItemsTable).set({
        roomZone: item.roomZone, styleEffect: item.styleEffect,
        isDisplayable: true, isWorldItem: true,
      }).where(eq(shopItemsTable.id, item.id));
    }
  }
}

// Seed on startup (fire-and-forget)
seedRoomDecor().catch((e) => console.error("[world] seed error:", e.message));

// ─── Phase 30 — Room Progression State Engine ────────────────────────────────

type DeskState = "empty" | "basic" | "command" | "premium";
type AmbianceState = "dim" | "warm" | "bright" | "elite";

interface RoomState {
  roomTier: number;
  roomTierLabel: string;
  roomScore: number;
  deskState: DeskState;
  deskTier: number;
  trophiesDisplayed: number;
  hasCenterpiece: boolean;
  hasPrestigeMarker: boolean;
  hasLifestyleItem: boolean;
  ambianceState: AmbianceState;
  nextEvolutionHints: string[];
}

function computeRoomState(params: {
  slotMap: Record<string, any>;
  skills: { skillId: string; level: number }[];
  themeTier: number;
}): RoomState {
  const { slotMap, skills, themeTier } = params;

  const getSkillLevel = (id: string) => skills.find(s => s.skillId === id)?.level ?? 0;
  const financeScore  = getSkillLevel("trading")    * 0.6 + getSkillLevel("learning")  * 0.4;
  const disciplineScore = getSkillLevel("discipline") * 0.6 + getSkillLevel("focus")     * 0.4;

  const deskItem = slotMap["desk_setup"];
  const deskTier = deskItem
    ? (deskItem.itemId === "room-decor-desk-003" ? 3
     : deskItem.itemId === "room-decor-desk-002" ? 2 : 1)
    : 0;
  const deskState: DeskState = (["empty", "basic", "command", "premium"] as const)[Math.min(deskTier, 3)];

  const trophiesDisplayed = ["trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3"]
    .filter(s => slotMap[s] != null).length;
  const hasCenterpiece    = slotMap["centerpiece"] != null;
  const hasPrestigeMarker = slotMap["prestige_marker"] != null;
  const hasLifestyleItem  = slotMap["lifestyle_item"] != null;

  // Point scoring (max ≈ 122 raw → normalized to 100)
  const themePoints     = [0, 20, 35, 50][Math.min(themeTier, 3)] ?? 0;
  const deskPoints      = [0, 8, 16, 24][Math.min(deskTier, 3)] ?? 0;
  const lifestylePoints = hasLifestyleItem ? 8 : 0;
  const trophyPoints    = Math.min(trophiesDisplayed, 3) * 4;
  const cpPoints        = hasCenterpiece ? 8 : 0;
  const pmPoints        = hasPrestigeMarker ? 8 : 0;
  const financeBonus    = Math.round(Math.min(financeScore, 80) / 80 * 12);
  const disciplineBonus = Math.round(Math.min(disciplineScore, 80) / 80 * 8);

  const raw      = themePoints + deskPoints + lifestylePoints + trophyPoints + cpPoints + pmPoints + financeBonus + disciplineBonus;
  const roomScore = Math.min(100, Math.round(raw / 1.22));

  const roomTier = roomScore >= 85 ? 4 : roomScore >= 70 ? 3 : roomScore >= 50 ? 2 : roomScore >= 25 ? 1 : 0;
  const TIER_LABELS = ["Basic", "Improving", "Premium", "Refined", "Elite Command Center"] as const;
  const roomTierLabel = TIER_LABELS[roomTier];
  const ambianceState: AmbianceState = (["dim", "warm", "bright", "elite"] as const)[Math.min(roomTier, 3)];

  const hints: string[] = [];
  if (themeTier === 0)         hints.push("Activate a room theme to start evolving your workspace.");
  if (deskTier === 0)          hints.push("Add a desk setup to transform your command center.");
  if (trophiesDisplayed < 2)   hints.push("Display your earned trophies to fill your space.");
  if (!hasCenterpiece)         hints.push("Feature a centerpiece to elevate your room's presence.");
  if (financeScore < 30)       hints.push("Growing your Finance score unlocks better room ambiance.");
  if (hints.length === 0)      hints.push("Your room is thriving. Keep pushing toward Elite Command Center.");

  return {
    roomTier, roomTierLabel, roomScore,
    deskState, deskTier,
    trophiesDisplayed, hasCenterpiece, hasPrestigeMarker, hasLifestyleItem,
    ambianceState,
    nextEvolutionHints: hints.slice(0, 2),
  };
}

// ─── GET /world/room — full room state ────────────────────────────────────────
router.get("/room", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Load owned inventory with shop item details
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
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    // Active title
    const titlesRows = await db.select({
      titleId:  userTitlesTable.titleId,
      isActive: userTitlesTable.isActive,
      name:     titlesTable.name,
      rarity:   titlesTable.rarity,
      category: titlesTable.category,
    })
      .from(userTitlesTable)
      .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, userId));

    const activeTitle = titlesRows.find(t => t.isActive) ?? null;

    // Earned badges
    const badgesRows = await db.select({
      badgeId:  userBadgesTable.badgeId,
      name:     badgesTable.name,
      icon:     badgesTable.icon,
      rarity:   badgesTable.rarity,
      category: badgesTable.category,
    })
      .from(userBadgesTable)
      .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .where(eq(userBadgesTable.userId, userId));

    // Skills + arc
    const skills = await db.select()
      .from(userSkillsTable)
      .where(eq(userSkillsTable.userId, userId));

    // Life profile
    const [profile] = await db.select()
      .from(lifeProfilesTable)
      .where(eq(lifeProfilesTable.userId, userId))
      .limit(1);

    // Resolve theme from room_theme slot or fall back to highest-tier owned room
    const slotMap: Record<string, typeof inventory[0] | null> = {
      room_theme: null, centerpiece: null,
      trophy_shelf_1: null, trophy_shelf_2: null, trophy_shelf_3: null,
      prestige_marker: null,
      // Phase 30 — Workspace zones
      desk_setup: null, lifestyle_item: null,
    };

    for (const inv of inventory) {
      if (inv.displaySlot && slotMap[inv.displaySlot] !== undefined) {
        slotMap[inv.displaySlot] = inv;
      }
    }

    // Resolve active theme
    let activeTheme: { id: string | null; name: string; tier: number; accentColor: string; icon: string; description: string } = { ...DEFAULT_THEME };
    const roomSlotItem = slotMap["room_theme"];
    if (roomSlotItem && ROOM_THEMES[roomSlotItem.itemId]) {
      activeTheme = ROOM_THEMES[roomSlotItem.itemId];
    } else {
      // Auto-suggest: pick highest-tier owned room item if none slotted
      const ownedRoomItems = inventory.filter(i => i.itemType === "room" || i.category === "room");
      if (ownedRoomItems.length > 0) {
        const best = ownedRoomItems.reduce((a, b) =>
          (ROOM_THEMES[b.itemId]?.tier ?? 0) > (ROOM_THEMES[a.itemId]?.tier ?? 0) ? b : a
        );
        if (ROOM_THEMES[best.itemId]) {
          activeTheme = { ...ROOM_THEMES[best.itemId] };
        }
      }
    }

    // Items in slots (with metadata)
    const slots = Object.fromEntries(
      Object.entries(slotMap).map(([slot, inv]) => [
        slot,
        inv ? {
          itemId: inv.itemId, name: inv.name, icon: inv.icon,
          rarity: inv.rarity, itemType: inv.itemType, description: inv.description,
        } : null,
      ])
    );

    // Items owned but not displayed in any slot
    const displayedItemIds = new Set(
      Object.values(slotMap).filter(Boolean).map(i => i!.itemId)
    );
    const ownedNotDisplayed = inventory
      .filter(inv => !displayedItemIds.has(inv.itemId))
      .map(inv => ({
        itemId: inv.itemId, name: inv.name, icon: inv.icon,
        rarity: inv.rarity, itemType: inv.itemType, category: inv.category,
        isEquipped: inv.isEquipped,
      }));

    // Identity summary
    const sortedSkills = [...skills].sort((a, b) => b.level - a.level);
    const topSkillId = sortedSkills[0]?.skillId ?? null;
    const totalSessions = 0; // not needed for summary line here

    // Phase 30 — Compute room progression state
    const roomState = computeRoomState({
      slotMap,
      skills: skills.map(s => ({ skillId: s.skillId, level: s.level })),
      themeTier: activeTheme.tier,
    });

    return res.json({
      theme: activeTheme,
      slots,
      roomState,
      activeTitle: activeTitle ? { name: activeTitle.name, rarity: activeTitle.rarity, category: activeTitle.category } : null,
      earnedBadges: badgesRows.map(b => ({ badgeId: b.badgeId, name: b.name, icon: b.icon, rarity: b.rarity, category: b.category })),
      ownedNotDisplayed,
      stats: {
        totalOwned: inventory.length,
        totalDisplayed: displayedItemIds.size,
        totalBadges: badgesRows.length,
        totalTitles: titlesRows.length,
      },
      profileDepth: {
        quickStartDone: profile?.quickStartDone ?? false,
        standardDone:   profile?.standardDone ?? false,
        deepDone:       profile?.deepDone ?? false,
        mainGoal:       profile?.mainGoal ?? null,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /world/room/eligibility — what can go in each slot ──────────────────
router.get("/room/eligibility", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const inventory = await db.select({
      itemId:   userInventoryTable.itemId,
      displaySlot: userInventoryTable.displaySlot,
      name:     shopItemsTable.name,
      icon:     shopItemsTable.icon,
      rarity:   shopItemsTable.rarity,
      itemType: shopItemsTable.itemType,
      category: shopItemsTable.category,
      roomZone: shopItemsTable.roomZone,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    // For each slot, return items that can be placed there
    const eligibilityMap = Object.fromEntries(
      Object.entries(SLOT_ELIGIBILITY).map(([slot, allowedTypes]) => {
        const requiredZone = SLOT_ROOM_ZONES[slot] ?? null;
        return [
          slot,
          inventory
            .filter(inv => {
              const typeMatch = allowedTypes.includes(inv.itemType) || allowedTypes.includes(inv.category);
              if (!typeMatch) return false;
              if (requiredZone) return inv.roomZone === requiredZone;
              return true;
            })
            .map(inv => ({
              itemId: inv.itemId, name: inv.name, icon: inv.icon,
              rarity: inv.rarity, itemType: inv.itemType,
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

// ─── POST /world/room/slots — assign item to display slot ────────────────────
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

    // Verify ownership
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

    // Check type eligibility
    if (!allowedTypes.includes(ownership.itemType) && !allowedTypes.includes(ownership.category)) {
      return res.status(400).json({ error: `Item type '${ownership.itemType}' cannot be placed in slot '${slot}'` });
    }

    // Phase 30 — Check roomZone compatibility
    const requiredZone = SLOT_ROOM_ZONES[slot] ?? null;
    if (requiredZone && ownership.roomZone !== requiredZone) {
      return res.status(400).json({ error: `This item cannot be placed in the '${slot}' slot` });
    }

    // Clear any item currently in the target slot for this user
    const currentInSlot = await db.select({ id: userInventoryTable.id })
      .from(userInventoryTable)
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.displaySlot as any, slot)));

    for (const row of currentInSlot) {
      await db.update(userInventoryTable)
        .set({ displaySlot: null })
        .where(eq(userInventoryTable.id, row.id));
    }

    // Clear item from its current slot (if it was in a different slot)
    await db.update(userInventoryTable)
      .set({ displaySlot: slot })
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)));

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: userId,
      actorRole: "user",
      action: "world_slot_assigned",
      targetId: itemId,
      targetType: "shop_item",
      details: JSON.stringify({ slot }),
    });

    return res.json({ success: true, slot, itemId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /world/room/slots/:slot — clear a display slot ───────────────────
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

// ─── ADMIN: GET /world/admin/stats ───────────────────────────────────────────
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
