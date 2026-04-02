import { Router } from "express";
import {
  db,
  showcaseSettingsTable,
  usersTable,
  userTitlesTable,
  titlesTable,
  userSkillsTable,
  userBadgesTable,
  badgesTable,
  lifeProfilesTable,
  circleMembersTable,
  userInventoryTable,
  shopItemsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, generateId } from "../lib/auth.js";

const router = Router();

// ── GET my showcase settings ───────────────────────────────────────────────
router.get("/settings", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [settings] = await db
      .select()
      .from(showcaseSettingsTable)
      .where(eq(showcaseSettingsTable.userId, userId))
      .limit(1);

    if (!settings) {
      return res.json({
        showTitle: false, showArc: false, showSkills: false,
        showBadges: false, showStreak: false, showLevel: false,
      });
    }

    return res.json({
      showTitle: settings.showTitle,
      showArc: settings.showArc,
      showSkills: settings.showSkills,
      showBadges: settings.showBadges,
      showStreak: settings.showStreak,
      showLevel: settings.showLevel,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT my showcase settings ───────────────────────────────────────────────
router.put("/settings", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { showTitle, showArc, showSkills, showBadges, showStreak, showLevel } = req.body as {
      showTitle?: boolean; showArc?: boolean; showSkills?: boolean;
      showBadges?: boolean; showStreak?: boolean; showLevel?: boolean;
    };

    const [existing] = await db
      .select({ id: showcaseSettingsTable.id })
      .from(showcaseSettingsTable)
      .where(eq(showcaseSettingsTable.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(showcaseSettingsTable)
        .set({
          showTitle: showTitle ?? false,
          showArc: showArc ?? false,
          showSkills: showSkills ?? false,
          showBadges: showBadges ?? false,
          showStreak: showStreak ?? false,
          showLevel: showLevel ?? false,
          updatedAt: new Date(),
        })
        .where(eq(showcaseSettingsTable.userId, userId));
    } else {
      await db.insert(showcaseSettingsTable).values({
        id: generateId(),
        userId,
        showTitle: showTitle ?? false,
        showArc: showArc ?? false,
        showSkills: showSkills ?? false,
        showBadges: showBadges ?? false,
        showStreak: showStreak ?? false,
        showLevel: showLevel ?? false,
      });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET another user's showcase (circle members only) ─────────────────────
// Caller must share at least one active circle with the target user.
router.get("/:targetUserId", requireAuth, async (req: any, res) => {
  try {
    const callerId = req.user.id;
    const { targetUserId } = req.params;

    if (callerId === targetUserId) {
      // Self — return full snapshot regardless
      return buildAndReturnShowcase(targetUserId, res, true);
    }

    // Verify shared circle membership
    const callerCircles = await db
      .select({ circleId: circleMembersTable.circleId })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.userId, callerId),
          eq(circleMembersTable.status, "active"),
        )
      );
    const callerCircleIds = new Set(callerCircles.map((m) => m.circleId));

    const targetCircles = await db
      .select({ circleId: circleMembersTable.circleId })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.userId, targetUserId),
          eq(circleMembersTable.status, "active"),
        )
      );
    const sharedCircle = targetCircles.some((m) => callerCircleIds.has(m.circleId));

    if (!sharedCircle) {
      return res.status(403).json({ error: "You must share a circle to view this showcase." });
    }

    return buildAndReturnShowcase(targetUserId, res, false);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

async function buildAndReturnShowcase(userId: string, res: any, isSelf: boolean) {
  const [settings] = await db
    .select()
    .from(showcaseSettingsTable)
    .where(eq(showcaseSettingsTable.userId, userId))
    .limit(1);

  const [user] = await db
    .select({ username: usersTable.username, level: usersTable.level })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [profile] = await db
    .select({ currentArc: lifeProfilesTable.currentArc })
    .from(lifeProfilesTable)
    .where(eq(lifeProfilesTable.userId, userId))
    .limit(1);

  const showTitle  = isSelf || (settings?.showTitle ?? false);
  const showArc    = isSelf || (settings?.showArc ?? false);
  const showSkills = isSelf || (settings?.showSkills ?? false);
  const showBadges = isSelf || (settings?.showBadges ?? false);
  const showLevel  = isSelf || (settings?.showLevel ?? false);

  // Active title
  let activeTitle: { name: string; rarity: string } | null = null;
  if (showTitle) {
    const earnedTitles = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId));
    const active = earnedTitles.find((t) => t.isActive);
    if (active) {
      const [td] = await db.select().from(titlesTable).where(eq(titlesTable.id, active.titleId)).limit(1);
      if (td) activeTitle = { name: td.name, rarity: td.rarity };
    }
  }

  // Skills
  let topSkills: { skillId: string; level: number; rank: string }[] = [];
  if (showSkills) {
    const skills = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    topSkills = skills
      .sort((a, b) => b.level - a.level)
      .slice(0, 3)
      .map((s) => ({ skillId: s.skillId, level: s.level, rank: s.rank }));
  }

  // Recent badges
  let recentBadges: { name: string; icon: string; rarity: string }[] = [];
  if (showBadges) {
    const earnedBadges = await db
      .select()
      .from(userBadgesTable)
      .where(eq(userBadgesTable.userId, userId))
      .orderBy(desc(userBadgesTable.earnedAt))
      .limit(5);
    const allBadgeDefs = await db.select().from(badgesTable);
    const defMap = new Map(allBadgeDefs.map((b) => [b.id, b]));
    recentBadges = earnedBadges
      .map((eb) => {
        const def = defMap.get(eb.badgeId);
        return def ? { name: def.name, icon: def.icon, rarity: def.rarity } : null;
      })
      .filter(Boolean) as { name: string; icon: string; rarity: string }[];
  }

  // Equipped profile items (cosmetics/prestige with isProfileItem flag)
  let equippedProfileItems: { id: string; name: string; icon: string; rarity: string; itemType: string }[] = [];
  try {
    const profileInventory = await db.select({
      itemId:   userInventoryTable.itemId,
      name:     shopItemsTable.name,
      icon:     shopItemsTable.icon,
      rarity:   shopItemsTable.rarity,
      itemType: shopItemsTable.itemType,
    })
      .from(userInventoryTable)
      .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
      .where(and(
        eq(userInventoryTable.userId, userId),
        eq(userInventoryTable.isEquipped, true),
        eq(shopItemsTable.isProfileItem, true),
      ));
    equippedProfileItems = profileInventory.map(i => ({
      id: i.itemId, name: i.name, icon: i.icon, rarity: i.rarity, itemType: i.itemType,
    }));
  } catch {
    // non-critical
  }

  return res.json({
    username: user?.username ?? "Operator",
    level: showLevel ? (user?.level ?? 1) : null,
    currentArc: showArc ? (profile?.currentArc ?? null) : null,
    activeTitle,
    topSkills,
    recentBadges,
    equippedProfileItems,
    settings: isSelf
      ? {
          showTitle: settings?.showTitle ?? false,
          showArc: settings?.showArc ?? false,
          showSkills: settings?.showSkills ?? false,
          showBadges: settings?.showBadges ?? false,
          showStreak: settings?.showStreak ?? false,
          showLevel: settings?.showLevel ?? false,
        }
      : undefined,
  });
}

export default router;
