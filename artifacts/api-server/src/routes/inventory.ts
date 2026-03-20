import { Router } from "express";
import { db, badgesTable, userBadgesTable, titlesTable, userTitlesTable, milestoneUnlocksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { randomUUID } from "crypto";

const router = Router();

const DEFAULT_BADGES = [
  { id: "badge-focus-initiate",      name: "Focus Initiate",        description: "Complete your first focus session",       icon: "eye",            category: "focus",      rarity: "common" },
  { id: "badge-7day-discipline",     name: "7-Day Discipline",       description: "Maintain a 7-day streak",                icon: "shield",         category: "discipline", rarity: "uncommon" },
  { id: "badge-trading-apprentice",  name: "Trading Apprentice",     description: "Complete 5 trading-related missions",    icon: "trending-up",    category: "trading",    rarity: "uncommon" },
  { id: "badge-recovery-rebuilder",  name: "Recovery Rebuilder",     description: "Complete 3 recovery/reset missions",     icon: "refresh",        category: "fitness",    rarity: "common" },
  { id: "badge-command-room",        name: "Command Room",           description: "Reach Level 10 in any skill",            icon: "planet",         category: "milestone",  rarity: "rare" },
  { id: "badge-proof-master",        name: "Proof Master",           description: "Get 10 proofs approved by AI",           icon: "checkmark-done", category: "discipline", rarity: "uncommon" },
  { id: "badge-sleep-guardian",      name: "Sleep Guardian",         description: "Log sleep 7 nights in a row",            icon: "moon",           category: "sleep",      rarity: "uncommon" },
  { id: "badge-fitness-warrior",     name: "Fitness Warrior",        description: "Complete 10 fitness missions",           icon: "barbell",        category: "fitness",    rarity: "uncommon" },
  { id: "badge-learning-engine",     name: "Learning Engine",        description: "Complete 10 learning missions",          icon: "book",           category: "learning",   rarity: "uncommon" },
  { id: "badge-ai-champion",         name: "AI Mission Champion",    description: "Accept and complete 5 AI missions",      icon: "flash",          category: "ai",         rarity: "rare" },
];

const DEFAULT_TITLES = [
  { id: "title-initiate",          name: "Initiate",              description: "Starting the journey",                 category: "rank",       rarity: "common" },
  { id: "title-focus-operator",    name: "Focus Operator",        description: "Serious about deep work",              category: "focus",      rarity: "uncommon" },
  { id: "title-iron-discipline",   name: "Iron Discipline",       description: "Never breaks a streak",                category: "discipline", rarity: "rare" },
  { id: "title-market-student",    name: "Market Student",        description: "Learning the trading craft",           category: "trading",    rarity: "uncommon" },
  { id: "title-grind-architect",   name: "Grind Architect",       description: "Builds systems that work",             category: "milestone",  rarity: "rare" },
  { id: "title-recovery-mode",     name: "Recovery Mode",         description: "Respecting the reset",                 category: "fitness",    rarity: "common" },
  { id: "title-command-operator",  name: "Command Operator",      description: "Operating at elite level",             category: "milestone",  rarity: "epic" },
];

async function seedInventoryData() {
  const existingBadge = await db.select().from(badgesTable).limit(1);
  if (existingBadge.length === 0) {
    for (const badge of DEFAULT_BADGES) {
      await db.insert(badgesTable).values({ ...badge, condition: "{}" }).onConflictDoNothing();
    }
  }
  const existingTitle = await db.select().from(titlesTable).limit(1);
  if (existingTitle.length === 0) {
    for (const title of DEFAULT_TITLES) {
      await db.insert(titlesTable).values({ ...title, condition: "{}" }).onConflictDoNothing();
    }
  }
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

    await db
      .update(userTitlesTable)
      .set({ isActive: false })
      .where(eq(userTitlesTable.userId, userId));

    await db
      .update(userTitlesTable)
      .set({ isActive: true })
      .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, titleId)));

    return res.json({ status: "activated", titleId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/milestones", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const milestones = await db
      .select()
      .from(milestoneUnlocksTable)
      .where(eq(milestoneUnlocksTable.userId, userId));
    return res.json({ milestones });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(userBadgesTable)
    .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId)))
    .limit(1);
  if (existing.length > 0) return false;

  await db.insert(userBadgesTable).values({ id: randomUUID(), userId, badgeId });
  return true;
}

export async function awardTitle(userId: string, titleId: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(userTitlesTable)
    .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.titleId, titleId)))
    .limit(1);
  if (existing.length > 0) return false;

  const hasActive = await db
    .select()
    .from(userTitlesTable)
    .where(and(eq(userTitlesTable.userId, userId)))
    .limit(1);

  await db.insert(userTitlesTable).values({
    id: randomUUID(),
    userId,
    titleId,
    isActive: hasActive.length === 0,
  });
  return true;
}

export async function recordMilestone(userId: string, milestoneKey: string, details: object = {}): Promise<boolean> {
  const existing = await db
    .select()
    .from(milestoneUnlocksTable)
    .where(and(eq(milestoneUnlocksTable.userId, userId), eq(milestoneUnlocksTable.milestoneKey, milestoneKey)))
    .limit(1);
  if (existing.length > 0) return false;

  await db.insert(milestoneUnlocksTable).values({
    id: randomUUID(),
    userId,
    milestoneKey,
    details: JSON.stringify(details),
  });
  return true;
}

export default router;
