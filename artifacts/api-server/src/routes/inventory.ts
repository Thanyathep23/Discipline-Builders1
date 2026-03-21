import { Router } from "express";
import {
  db, badgesTable, userBadgesTable, titlesTable, userTitlesTable,
  milestoneUnlocksTable, userSkillsTable, lifeProfilesTable,
  shopItemsTable, userInventoryTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { randomUUID } from "crypto";
import { emitActivityForUser } from "../lib/circle-activity.js";
import { dispatchWebhookEvent } from "../lib/webhook-dispatcher.js";

// ─── Slot eligibility map (mirrors world.ts) ────────────────────────────────
const SLOT_ELIGIBILITY_BY_TYPE: Record<string, string[]> = {
  room:     ["room_theme"],
  trophy:   ["trophy_shelf_1", "trophy_shelf_2", "trophy_shelf_3", "centerpiece"],
  prestige: ["prestige_marker", "centerpiece"],
};

function getApplicableSurfaces(item: any): string[] {
  const surfaces: string[] = [];
  if (item.isEquippable) surfaces.push("character");
  if (item.isWorldItem)  surfaces.push("world");
  if (item.isProfileItem) surfaces.push("profile");
  return surfaces;
}

function getApplicationMode(item: any): string {
  if (item.isEquippable && item.isDisplayable) return "equip_and_display";
  if (item.isEquippable) return "equip";
  if (item.isDisplayable) return "display";
  return "passive";
}

function getSlotEligibility(item: any): string[] {
  return SLOT_ELIGIBILITY_BY_TYPE[item.itemType] ?? SLOT_ELIGIBILITY_BY_TYPE[item.category] ?? [];
}

const router = Router();

const DEFAULT_BADGES = [
  { id: "badge-focus-initiate",      name: "Focus Initiate",        description: "Complete your first focus session",              icon: "eye",            category: "focus",      rarity: "common"   },
  { id: "badge-7day-discipline",     name: "7-Day Discipline",       description: "Maintain a 7-day streak",                        icon: "shield",         category: "discipline", rarity: "uncommon" },
  { id: "badge-14day-momentum",      name: "Momentum Keeper",        description: "Maintain a 14-day streak",                       icon: "flame",          category: "discipline", rarity: "rare"     },
  { id: "badge-trading-apprentice",  name: "Trading Apprentice",     description: "Complete 5 trading-related missions",             icon: "trending-up",    category: "trading",    rarity: "uncommon" },
  { id: "badge-recovery-rebuilder",  name: "Recovery Rebuilder",     description: "Complete 3 recovery or fitness missions",         icon: "refresh",        category: "fitness",    rarity: "common"   },
  { id: "badge-command-room",        name: "Command Room",           description: "Reach Level 10 in any skill",                    icon: "planet",         category: "milestone",  rarity: "rare"     },
  { id: "badge-proof-master",        name: "Proof Master",           description: "Get 10 proofs approved by AI",                   icon: "checkmark-done", category: "discipline", rarity: "uncommon" },
  { id: "badge-sleep-guardian",      name: "Sleep Guardian",         description: "Log sleep 7 nights in a row",                    icon: "moon",           category: "sleep",      rarity: "uncommon" },
  { id: "badge-fitness-warrior",     name: "Fitness Warrior",        description: "Complete 10 fitness missions",                   icon: "barbell",        category: "fitness",    rarity: "uncommon" },
  { id: "badge-learning-engine",     name: "Learning Engine",        description: "Complete 10 learning missions",                  icon: "book",           category: "learning",   rarity: "uncommon" },
  { id: "badge-ai-champion",         name: "AI Mission Champion",    description: "Accept and complete 5 AI missions",              icon: "flash",          category: "ai",         rarity: "rare"     },
  { id: "badge-chain-finisher",      name: "Chain Finisher",         description: "Complete your first quest chain",                icon: "git-branch",     category: "milestone",  rarity: "uncommon" },
  { id: "badge-arc-survivor",        name: "Arc Survivor",           description: "Progress through a full arc cycle",             icon: "navigate",       category: "milestone",  rarity: "rare"     },
  { id: "badge-first-ai-mission",    name: "AI Operator",            description: "Accept your first AI-generated mission",         icon: "hardware-chip",  category: "ai",         rarity: "common"   },
  { id: "badge-comeback",            name: "Comeback",               description: "Resume after a 3+ day break and complete a session", icon: "arrow-up-circle", category: "fitness", rarity: "common" },
];

const DEFAULT_TITLES = [
  { id: "title-initiate",            name: "Initiate",              description: "Starting the discipline journey",              category: "rank",       rarity: "common"   },
  { id: "title-focus-initiate",      name: "Focus Initiate",        description: "First steps into real deep work",              category: "focus",      rarity: "common"   },
  { id: "title-focus-operator",      name: "Focus Operator",        description: "Serious about sustained deep work",            category: "focus",      rarity: "uncommon" },
  { id: "title-discipline-builder",  name: "Discipline Builder",    description: "Building consistency one day at a time",       category: "discipline", rarity: "uncommon" },
  { id: "title-iron-discipline",     name: "Iron Discipline",       description: "14+ day streak — unbreakable consistency",     category: "discipline", rarity: "rare"     },
  { id: "title-momentum-keeper",     name: "Momentum Keeper",       description: "Sustained momentum across 14+ days",           category: "discipline", rarity: "rare"     },
  { id: "title-market-student",      name: "Market Student",        description: "Serious about learning the trading craft",     category: "trading",    rarity: "uncommon" },
  { id: "title-trading-apprentice",  name: "Trading Apprentice",    description: "Consistent trading practice and review",       category: "trading",    rarity: "uncommon" },
  { id: "title-recovery-rebuilder",  name: "Recovery Rebuilder",    description: "Respecting recovery as part of performance",   category: "fitness",    rarity: "common"   },
  { id: "title-learning-climber",    name: "Learning Climber",      description: "Knowledge accumulation at scale",              category: "learning",   rarity: "uncommon" },
  { id: "title-arc-survivor",        name: "Arc Survivor",          description: "Navigated a full arc challenge",               category: "milestone",  rarity: "rare"     },
  { id: "title-proof-master",        name: "Proof Master",          description: "Evidence-backed performer",                    category: "discipline", rarity: "rare"     },
  { id: "title-grind-architect",     name: "Grind Architect",       description: "Builds high-performance systems",              category: "milestone",  rarity: "rare"     },
  { id: "title-command-operator",    name: "Command Operator",      description: "Operating at the elite tier",                  category: "milestone",  rarity: "epic"     },
];

const SYMBOLIC_SHOP_ITEMS = [
  { id: "asset-focus-trophy",     name: "Focus Trophy",          description: "A symbolic trophy for committed deep work",           cost: 80,  category: "trophy",   icon: "trophy",          isAvailable: true },
  { id: "asset-discipline-medal", name: "Discipline Medal",      description: "Awarded to those who build real discipline",          cost: 120, category: "trophy",   icon: "medal",           isAvailable: true },
  { id: "asset-focus-shrine",     name: "Focus Shrine",          description: "A room upgrade — the dedicated work environment",      cost: 200, category: "room",     icon: "home",            isAvailable: true },
  { id: "asset-command-terminal", name: "Command Terminal",      description: "Elite workspace upgrade for serious operators",        cost: 350, category: "room",     icon: "desktop-outline", isAvailable: true },
  { id: "asset-gold-ribbon",      name: "Gold Ribbon",           description: "A prestige marker for top performers",                cost: 250, category: "cosmetic", icon: "ribbon",          isAvailable: true },
  { id: "asset-proof-vault",      name: "Proof Vault",           description: "A symbolic vault for verified excellence",             cost: 180, category: "trophy",   icon: "lock-closed",     isAvailable: true },
];

async function seedInventoryData() {
  for (const badge of DEFAULT_BADGES) {
    await db.insert(badgesTable).values({ ...badge, condition: "{}" }).onConflictDoNothing();
  }
  for (const title of DEFAULT_TITLES) {
    await db.insert(titlesTable).values({ ...title, condition: "{}" }).onConflictDoNothing();
  }
  for (const item of SYMBOLIC_SHOP_ITEMS) {
    await db.insert(shopItemsTable).values(item).onConflictDoNothing();
  }
}

function buildIdentitySummaryLine(
  topSkillId: string | null,
  arc: string | null,
  streak: number,
  totalSessions: number,
  activeTitle: string | null,
): string {
  const parts: string[] = [];

  if (streak >= 14) {
    parts.push(`${streak}-day streak operator`);
  } else if (streak >= 7) {
    parts.push(`7-day consistency builder`);
  } else if (streak >= 3) {
    parts.push(`building momentum`);
  }

  if (topSkillId) {
    const labels: Record<string, string> = {
      focus: "focus specialist", discipline: "discipline builder",
      learning: "knowledge seeker", trading: "market student",
      fitness: "performance builder", sleep: "recovery optimizer",
    };
    parts.push(labels[topSkillId] ?? `${topSkillId} developer`);
  }

  if (arc) {
    parts.push(`on the ${arc} arc`);
  }

  if (totalSessions >= 50) {
    parts.push("veteran operator");
  } else if (totalSessions >= 20) {
    parts.push("seasoned practitioner");
  } else if (totalSessions === 0) {
    return "Ready to begin the discipline journey";
  }

  if (parts.length === 0) return "Beginning the discipline journey";

  const line = parts.join(" · ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function buildNextMilestoneHint(
  earnedBadgeIds: Set<string>,
  streak: number,
  approvedProofs: number,
  completedSessions: number,
  aiMissionsAccepted: number,
): string {
  if (!earnedBadgeIds.has("badge-focus-initiate") && completedSessions === 0) {
    return "Complete your first focus session to unlock the Focus Initiate badge";
  }
  if (!earnedBadgeIds.has("badge-7day-discipline") && streak < 7) {
    const needed = 7 - streak;
    return `${needed} more day${needed === 1 ? "" : "s"} of streak to unlock 7-Day Discipline badge`;
  }
  if (!earnedBadgeIds.has("badge-proof-master") && approvedProofs < 10) {
    const needed = 10 - approvedProofs;
    return `${needed} more approved proof${needed === 1 ? "" : "s"} to unlock Proof Master badge`;
  }
  if (!earnedBadgeIds.has("badge-14day-momentum") && streak < 14) {
    const needed = 14 - streak;
    return `${needed} more day${needed === 1 ? "" : "s"} of streak to unlock Momentum Keeper badge`;
  }
  if (!earnedBadgeIds.has("badge-ai-champion") && aiMissionsAccepted < 5) {
    const needed = 5 - aiMissionsAccepted;
    return `Complete ${needed} more AI mission${needed === 1 ? "" : "s"} to unlock AI Mission Champion badge`;
  }
  return "Keep pushing — more milestones await";
}

router.get("/badges", requireAuth, async (req: any, res) => {
  try {
    await seedInventoryData();
    const userId = req.user.id;
    const allBadges = await db.select().from(badgesTable);
    const earned = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
    const earnedIds = new Set(earned.map((e) => e.badgeId));

    return res.json({
      badges: allBadges.map((b) => ({
        ...b,
        earned: earnedIds.has(b.id),
        earnedAt: earned.find((e) => e.badgeId === b.id)?.earnedAt ?? null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/titles", requireAuth, async (req: any, res) => {
  try {
    await seedInventoryData();
    const userId = req.user.id;
    const allTitles = await db.select().from(titlesTable);
    const earned = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId));
    const earnedMap = new Map(earned.map((e) => [e.titleId, e]));

    return res.json({
      titles: allTitles.map((t) => ({
        ...t,
        earned: earnedMap.has(t.id),
        isActive: earnedMap.get(t.id)?.isActive ?? false,
        earnedAt: earnedMap.get(t.id)?.earnedAt ?? null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/titles/:titleId/activate", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { titleId } = req.params;

    const [userTitle] = await db
      .select()
      .from(userTitlesTable)
      .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, titleId)))
      .limit(1);

    if (!userTitle) return res.status(403).json({ error: "Title not earned" });

    await db.update(userTitlesTable).set({ isActive: false }).where(eq(userTitlesTable.userId, userId));
    await db.update(userTitlesTable).set({ isActive: true }).where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, titleId)));

    return res.json({ status: "activated", titleId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/milestones", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const milestones = await db.select().from(milestoneUnlocksTable).where(eq(milestoneUnlocksTable.userId, userId));
    return res.json({ milestones });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/assets", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const allSymbolic = await db.select().from(shopItemsTable).where(
      eq(shopItemsTable.isAvailable, true),
    );
    const symbolic = allSymbolic.filter((i) => ["trophy", "room", "cosmetic"].includes(i.category));
    const purchased = await db.select().from(userInventoryTable).where(eq(userInventoryTable.userId, userId));
    const purchasedIds = new Set(purchased.map((p) => p.itemId));

    const milestoneAssets = await db.select().from(milestoneUnlocksTable)
      .where(eq(milestoneUnlocksTable.userId, userId));
    const milestoneTrophies = milestoneAssets
      .filter((m) => m.milestoneKey.startsWith("asset_"))
      .map((m) => ({
        id: m.milestoneKey,
        name: (JSON.parse(m.details || "{}")).name ?? m.milestoneKey,
        description: (JSON.parse(m.details || "{}")).description ?? "",
        icon: (JSON.parse(m.details || "{}")).icon ?? "ribbon",
        category: "milestone-trophy",
        owned: true,
        source: "milestone",
        earnedAt: m.unlockedAt,
      }));

    return res.json({
      assets: [
        ...symbolic.map((i) => ({
          ...i,
          owned: purchasedIds.has(i.id),
          source: "shop",
        })),
        ...milestoneTrophies,
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /inventory/applied-state ─────────────────────────────────────────
// Returns a consolidated view of how items are applied across all surfaces.
router.get("/applied-state", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Load full inventory with shop item metadata
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
      category:    shopItemsTable.category,
      isEquippable:  shopItemsTable.isEquippable,
      isDisplayable: shopItemsTable.isDisplayable,
      isWorldItem:   shopItemsTable.isWorldItem,
      isProfileItem: shopItemsTable.isProfileItem,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(eq(userInventoryTable.userId, userId));

    // Active title
    const userTitles = await db.select({
      titleId:  userTitlesTable.titleId,
      isActive: userTitlesTable.isActive,
      name:     titlesTable.name,
      rarity:   titlesTable.rarity,
    })
      .from(userTitlesTable)
      .innerJoin(titlesTable, eq(userTitlesTable.titleId, titlesTable.id))
      .where(eq(userTitlesTable.userId, userId));

    const activeTitle = userTitles.find(t => t.isActive) ?? null;

    // Earned badges (top 3 for profile)
    const earnedBadges = await db.select({
      badgeId: userBadgesTable.badgeId,
      name:    badgesTable.name,
      icon:    badgesTable.icon,
      rarity:  badgesTable.rarity,
    })
      .from(userBadgesTable)
      .innerJoin(badgesTable, eq(userBadgesTable.badgeId, badgesTable.id))
      .where(eq(userBadgesTable.userId, userId));

    // Classify items by surface
    const characterItems = inventory.filter(i => i.isEquipped && i.isEquippable);
    const worldSlottedItems = inventory.filter(i => i.displaySlot != null);
    const profileItems = inventory.filter(i => i.isEquipped && i.isProfileItem);
    const storedItems = inventory.filter(i =>
      !i.isEquipped && i.displaySlot == null
    );

    // Build slot map for world surface
    const worldSlots: Record<string, any> = {};
    for (const inv of worldSlottedItems) {
      if (inv.displaySlot) {
        worldSlots[inv.displaySlot] = {
          itemId: inv.itemId, name: inv.name, icon: inv.icon,
          rarity: inv.rarity, itemType: inv.itemType,
        };
      }
    }

    const enrichInv = (inv: any) => ({
      itemId:    inv.itemId,
      name:      inv.name,
      icon:      inv.icon,
      rarity:    inv.rarity,
      itemType:  inv.itemType,
      category:  inv.category,
      surfaces:  getApplicableSurfaces(inv),
      applicationMode: getApplicationMode(inv),
      slotEligibility: getSlotEligibility(inv),
      displaySlot: inv.displaySlot ?? null,
      isEquipped:  inv.isEquipped,
    });

    return res.json({
      character: {
        activeTitle: activeTitle ? { id: activeTitle.titleId, name: activeTitle.name, rarity: activeTitle.rarity } : null,
        equippedItems: characterItems.map(enrichInv),
      },
      world: {
        slots: worldSlots,
        slottedCount: worldSlottedItems.length,
      },
      profile: {
        equippedItems: profileItems.map(enrichInv),
        activeTitle:   activeTitle ? { id: activeTitle.titleId, name: activeTitle.name, rarity: activeTitle.rarity } : null,
        featuredBadges: earnedBadges.slice(0, 3).map(b => ({
          id: b.badgeId, name: b.name, icon: b.icon, rarity: b.rarity,
        })),
      },
      storage: storedItems.map(enrichInv),
      summary: {
        totalOwned:    inventory.length,
        totalEquipped: characterItems.length,
        totalDisplayed: worldSlottedItems.length,
        totalStored:   storedItems.length,
        hasActiveTitle: !!activeTitle,
        totalBadges:   earnedBadges.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/identity", requireAuth, async (req: any, res) => {
  try {
    await seedInventoryData();
    const userId = req.user.id;

    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const currentArc = profile?.currentArc ?? null;

    const skills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    const sorted = [...skills].sort((a, b) => b.level - a.level || b.xp - a.xp);
    const topStrengths = sorted.slice(0, 2).map((s) => ({ skillId: s.skillId, level: s.level, rank: s.rank }));
    const weakZones = sorted.slice(-2).reverse().map((s) => ({ skillId: s.skillId, level: s.level, rank: s.rank }));
    const topSkillId = sorted[0]?.skillId ?? null;

    const earnedTitles = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId));
    const activeTitleRow = earnedTitles.find((t) => t.isActive);
    let activeTitle: any = null;
    if (activeTitleRow) {
      const [titleDef] = await db.select().from(titlesTable).where(eq(titlesTable.id, activeTitleRow.titleId)).limit(1);
      if (titleDef) activeTitle = { ...titleDef, earnedAt: activeTitleRow.earnedAt };
    }

    const earnedBadges = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
    const earnedBadgeIds = new Set(earnedBadges.map((b) => b.badgeId));

    const recentBadge = earnedBadges.sort((a, b) =>
      new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
    )[0] ?? null;
    const recentTitle = earnedTitles.sort((a, b) =>
      new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
    )[0] ?? null;

    let recentUnlock: any = null;
    if (recentBadge && recentTitle) {
      recentUnlock = new Date(recentBadge.earnedAt) > new Date(recentTitle.earnedAt)
        ? { type: "badge", id: recentBadge.badgeId, earnedAt: recentBadge.earnedAt }
        : { type: "title", id: recentTitle.titleId, earnedAt: recentTitle.earnedAt };
    } else if (recentBadge) {
      recentUnlock = { type: "badge", id: recentBadge.badgeId, earnedAt: recentBadge.earnedAt };
    } else if (recentTitle) {
      recentUnlock = { type: "title", id: recentTitle.titleId, earnedAt: recentTitle.earnedAt };
    }

    if (recentUnlock) {
      const [{ missionsTable }] = [await import("@workspace/db")];
      if (recentUnlock.type === "badge") {
        const [def] = await db.select().from(badgesTable).where(eq(badgesTable.id, recentUnlock.id)).limit(1);
        if (def) recentUnlock.name = def.name;
        recentUnlock.icon = def?.icon ?? "ribbon";
      } else {
        const [def] = await db.select().from(titlesTable).where(eq(titlesTable.id, recentUnlock.id)).limit(1);
        if (def) recentUnlock.name = def.name;
        recentUnlock.icon = "ribbon";
      }
    }

    const { missionsTable, focusSessionsTable, proofSubmissionsTable, aiMissionsTable } = await import("@workspace/db");
    const { count, eq: eqOp, and: andOp } = await import("drizzle-orm");

    const [{ value: sessionCount }] = await db.select({ value: count() }).from(focusSessionsTable)
      .where(andOp(eqOp(focusSessionsTable.userId, userId), eqOp(focusSessionsTable.status, "completed")));
    const [{ value: approvedProofsCount }] = await db.select({ value: count() }).from(proofSubmissionsTable)
      .where(andOp(eqOp(proofSubmissionsTable.userId, userId), eqOp(proofSubmissionsTable.status, "approved")));
    const [{ value: aiMissionsAcceptedCount }] = await db.select({ value: count() }).from(aiMissionsTable)
      .where(andOp(eqOp(aiMissionsTable.userId, userId), eqOp(aiMissionsTable.status, "accepted")));

    const streak = profile ? 0 : 0;
    const { usersTable } = await import("@workspace/db");
    const [userRow] = await db.select({ currentStreak: usersTable.currentStreak, longestStreak: usersTable.longestStreak })
      .from(usersTable).where(eqOp(usersTable.id, userId)).limit(1);

    const identitySummaryLine = buildIdentitySummaryLine(
      topSkillId,
      currentArc,
      userRow?.currentStreak ?? 0,
      Number(sessionCount),
      activeTitle?.name ?? null,
    );

    const nextMilestoneHint = buildNextMilestoneHint(
      earnedBadgeIds,
      userRow?.currentStreak ?? 0,
      Number(approvedProofsCount),
      Number(sessionCount),
      Number(aiMissionsAcceptedCount),
    );

    return res.json({
      activeTitle,
      currentArc,
      topStrengths,
      weakZones,
      recentUnlock,
      identitySummaryLine,
      nextMilestoneHint,
      earnedBadgeCount: earnedBadges.length,
      earnedTitleCount: earnedTitles.length,
      currentStreak: userRow?.currentStreak ?? 0,
      longestStreak: userRow?.longestStreak ?? 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const existing = await db.select().from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId))).limit(1);
  if (existing.length > 0) return false;
  await db.insert(userBadgesTable).values({ id: randomUUID(), userId, badgeId });

  // Emit to circles (fire-and-forget)
  const [badgeDef] = await db.select().from(badgesTable).where(eq(badgesTable.id, badgeId)).limit(1).catch(() => [null]);
  if (badgeDef) {
    emitActivityForUser(userId, "badge_earned", {
      label: badgeDef.name,
      icon: badgeDef.icon ?? "ribbon",
      color: "#F5C842",
      rarity: badgeDef.rarity,
    }).catch(() => {});
    // Phase 16 — Webhook dispatch
    dispatchWebhookEvent(userId, "badge.unlocked", {
      badgeId,
      name: badgeDef.name,
      rarity: badgeDef.rarity,
      icon: badgeDef.icon ?? "ribbon",
    }).catch(() => {});
  }

  return true;
}

export async function awardTitle(userId: string, titleId: string): Promise<boolean> {
  const existing = await db.select().from(userTitlesTable)
    .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, titleId))).limit(1);
  if (existing.length > 0) return false;

  const hasActive = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId)).limit(1);

  await db.insert(userTitlesTable).values({
    id: randomUUID(),
    userId,
    titleId,
    isActive: hasActive.length === 0,
  });

  // Emit to circles (fire-and-forget)
  const [titleDef] = await db.select().from(titlesTable).where(eq(titlesTable.id, titleId)).limit(1).catch(() => [null]);
  if (titleDef) {
    emitActivityForUser(userId, "title_unlocked", {
      label: titleDef.name,
      icon: "ribbon",
      color: "#9C27B0",
      rarity: titleDef.rarity,
    }).catch(() => {});
    // Phase 16 — Webhook dispatch
    dispatchWebhookEvent(userId, "title.unlocked", {
      titleId,
      name: titleDef.name,
      rarity: titleDef.rarity,
    }).catch(() => {});
  }

  return true;
}

export async function recordMilestone(userId: string, milestoneKey: string, details: object = {}): Promise<boolean> {
  const existing = await db.select().from(milestoneUnlocksTable)
    .where(and(eq(milestoneUnlocksTable.userId, userId), eq(milestoneUnlocksTable.milestoneKey, milestoneKey))).limit(1);
  if (existing.length > 0) return false;
  await db.insert(milestoneUnlocksTable).values({ id: randomUUID(), userId, milestoneKey, details: JSON.stringify(details) });
  return true;
}

export default router;
