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
};

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

    return res.json({
      theme: activeTheme,
      slots,
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
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    // For each slot, return items that can be placed there
    const eligibilityMap = Object.fromEntries(
      Object.entries(SLOT_ELIGIBILITY).map(([slot, allowedTypes]) => [
        slot,
        inventory
          .filter(inv => allowedTypes.includes(inv.itemType) || allowedTypes.includes(inv.category))
          .map(inv => ({
            itemId: inv.itemId, name: inv.name, icon: inv.icon,
            rarity: inv.rarity, itemType: inv.itemType,
            isCurrentlyInSlot: inv.displaySlot === slot,
          })),
      ])
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
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(and(eq(userInventoryTable.userId, userId), eq(userInventoryTable.itemId, itemId)))
      .limit(1);

    if (!ownership) {
      return res.status(403).json({ error: "Item not owned" });
    }

    // Check eligibility
    if (!allowedTypes.includes(ownership.itemType) && !allowedTypes.includes(ownership.category)) {
      return res.status(400).json({ error: `Item type '${ownership.itemType}' cannot be placed in slot '${slot}'` });
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
