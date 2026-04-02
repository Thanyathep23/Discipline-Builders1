import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { db, userSkillsTable, badgesTable, userBadgesTable, titlesTable, userTitlesTable, lifeProfilesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getUserSkills } from "../lib/skill-engine.js";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { trackEvent, Events } from "../lib/telemetry.js";

const router = Router();

const RANK_ORDER = ["Gray", "Green", "Blue", "Purple", "Gold", "Red"];
const SKILL_META: Record<string, { label: string; color: string; icon: string }> = {
  focus:      { label: "Focus",      color: "#7C5CFC", icon: "eye-outline"         },
  discipline: { label: "Discipline", color: "#FF3D71", icon: "shield-outline"       },
  learning:   { label: "Learning",   color: "#00D4FF", icon: "book-outline"         },
  sleep:      { label: "Sleep",      color: "#7B68EE", icon: "moon-outline"         },
  fitness:    { label: "Fitness",    color: "#00E676", icon: "barbell-outline"       },
  trading:    { label: "Trading",    color: "#F5C842", icon: "trending-up-outline"  },
};

const ARC_META: Record<string, { icon: string; subtitle: string }> = {
  "Genesis Arc":             { icon: "planet",       subtitle: "The beginning of the journey" },
  "Focus Recovery Arc":      { icon: "eye",          subtitle: "Reclaiming deep work capacity" },
  "Discipline Reset Arc":    { icon: "shield",       subtitle: "Rebuilding consistency" },
  "Energy Rebuild Arc":      { icon: "barbell",      subtitle: "Restoring physical performance" },
  "Learning Momentum Arc":   { icon: "book",         subtitle: "Accelerating knowledge growth" },
  "Trading Apprentice Arc":  { icon: "trending-up",  subtitle: "Mastering the market craft" },
};

/**
 * GET /api/share/snapshot
 * Returns a curated, privacy-safe snapshot of the user's progress for sharing.
 * No email, no raw proof files, no finance values, no private notes.
 */
router.get("/snapshot", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // --- 1. User basics (safe subset only — no email exposed) ---
    const [user] = await db
      .select({ username: usersTable.username, level: usersTable.level, xp: usersTable.xp, coinBalance: usersTable.coinBalance })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    // --- 2. Skills ---
    const skills = await getUserSkills(userId);
    const sortedSkills = [...skills].sort((a, b) => b.level - a.level || b.xp - a.xp);
    const topSkill = sortedSkills[0] ?? null;
    const topSkills = sortedSkills.slice(0, 3).map((s) => ({
      skillId: s.skillId,
      label: SKILL_META[s.skillId]?.label ?? s.skillId,
      color: SKILL_META[s.skillId]?.color ?? "#9E9E9E",
      icon: SKILL_META[s.skillId]?.icon ?? "star-outline",
      level: s.level,
      rank: s.rank,
      progressPct: s.progressPct,
    }));

    // --- 3. Arc ---
    const [profile] = await db
      .select({ currentArc: lifeProfilesTable.currentArc, arcXpSnapshot: lifeProfilesTable.arcXpSnapshot })
      .from(lifeProfilesTable)
      .where(eq(lifeProfilesTable.userId, userId))
      .limit(1);

    const persistedArc = profile?.currentArc ?? null;
    const arcXpSnapshot: Record<string, number> = JSON.parse(profile?.arcXpSnapshot ?? "{}");
    const gatingResult = resolveArcWithEvidenceGating(skills, persistedArc, arcXpSnapshot);
    const arcName = gatingResult.newArcName ?? persistedArc ?? null;
    const arcMeta = arcName ? (ARC_META[arcName] ?? { icon: "navigate", subtitle: "Current growth arc" }) : null;
    const currentArc = arcName
      ? { name: arcName, icon: arcMeta!.icon, subtitle: arcMeta!.subtitle }
      : null;

    // --- 4. Streak ---
    const streakResult = await db.execute(sql`
      SELECT DISTINCT activity_date FROM (
        SELECT DATE(started_at) AS activity_date
        FROM focus_sessions
        WHERE user_id = ${userId} AND status = 'completed' AND started_at IS NOT NULL
        UNION
        SELECT DATE(created_at) AS activity_date
        FROM proof_submissions
        WHERE user_id = ${userId} AND status = 'approved' AND created_at IS NOT NULL
      ) AS combined
      ORDER BY activity_date DESC
    `);
    const days: string[] = (streakResult.rows as any[]).map((r) => r.activity_date as string);
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const activeToday = days.includes(todayStr);
    let currentStreak = 0;
    let checkDate = activeToday ? todayStr : yesterdayStr;
    for (const day of days) {
      if (day === checkDate) {
        currentStreak++;
        const d = new Date(checkDate + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else break;
    }
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: string | null = null;
    for (const day of [...days].reverse()) {
      if (!prevDate) { tempStreak = 1; }
      else {
        const prev = new Date(prevDate + "T12:00:00Z");
        const curr = new Date(day + "T12:00:00Z");
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
      prevDate = day;
    }

    // --- 5. Level / XP from users table ---
    const level = user?.level ?? 1;
    const xp = user?.xp ?? 0;
    // XP required for the next level uses a simple progression formula
    const xpToNextLevel = Math.round(100 * Math.pow(1.15, level - 1));

    // --- 6. Active title ---
    const earnedTitles = await db.select().from(userTitlesTable).where(eq(userTitlesTable.userId, userId));
    const activeTitleRecord = earnedTitles.find((t) => t.isActive);
    let activeTitle: { name: string; rarity: string } | null = null;
    if (activeTitleRecord) {
      const [titleDef] = await db.select().from(titlesTable).where(eq(titlesTable.id, activeTitleRecord.titleId)).limit(1);
      if (titleDef) activeTitle = { name: titleDef.name, rarity: titleDef.rarity };
    }

    // --- 7. Recent earned badges (max 5, no sensitive data) ---
    const earnedBadges = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)).orderBy(desc(userBadgesTable.earnedAt)).limit(5);
    const allBadgeDefs = await db.select().from(badgesTable);
    const badgeDefMap = new Map(allBadgeDefs.map((b) => [b.id, b]));
    const recentBadges = earnedBadges.map((eb) => {
      const def = badgeDefMap.get(eb.badgeId);
      return def ? { name: def.name, icon: def.icon, rarity: def.rarity, category: def.category } : null;
    }).filter(Boolean).slice(0, 5);

    // --- 8. Weekly focus time (last 7 days) ---
    const weekResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60), 0)::int AS focus_minutes,
        COUNT(*) FILTER (WHERE status = 'completed') AS sessions_completed
      FROM focus_sessions
      WHERE user_id = ${userId}
        AND started_at >= NOW() - INTERVAL '7 days'
        AND started_at IS NOT NULL
    `).catch(() => ({ rows: [] }));
    const weekRow = (weekResult.rows as any[])[0] ?? {};
    const weeklyFocusMinutes = parseInt(weekRow.focus_minutes ?? "0", 10);
    const weeklySessionsCompleted = parseInt(weekRow.sessions_completed ?? "0", 10);

    // --- 9. Total sessions ---
    const totalResult = await db.execute(sql`
      SELECT COUNT(*) AS total FROM focus_sessions WHERE user_id = ${userId} AND status = 'completed'
    `).catch(() => ({ rows: [] }));
    const totalSessions = parseInt((totalResult.rows as any[])[0]?.total ?? "0", 10);

    // --- 10. Build identity summary line ---
    const parts: string[] = [];
    if (currentStreak >= 14) parts.push(`${currentStreak}-day streak operator`);
    else if (currentStreak >= 7) parts.push(`7-day consistency builder`);
    else if (currentStreak >= 3) parts.push(`building momentum`);
    if (topSkill) {
      const labels: Record<string, string> = {
        focus: "focus specialist", discipline: "discipline builder",
        learning: "knowledge seeker", trading: "market student",
        fitness: "performance builder", sleep: "recovery optimizer",
      };
      parts.push(labels[topSkill.skillId] ?? `${topSkill.skillId} developer`);
    }
    if (arcName) parts.push(`on the ${arcName}`);
    if (totalSessions >= 50) parts.push("veteran operator");
    else if (totalSessions >= 20) parts.push("seasoned practitioner");
    const identitySummaryLine =
      parts.length === 0
        ? "Beginning the discipline journey"
        : (parts.join(" · ").charAt(0).toUpperCase() + parts.join(" · ").slice(1));

    // --- Return curated snapshot ---
    trackEvent(Events.SHARE_CARD_VIEWED, userId).catch(() => {});
    return res.json({
      username: user?.username ?? "Operator",
      activeTitle,
      identitySummaryLine,
      currentArc,
      topSkills,
      topSkill: topSkill
        ? {
            skillId: topSkill.skillId,
            label: SKILL_META[topSkill.skillId]?.label ?? topSkill.skillId,
            color: SKILL_META[topSkill.skillId]?.color ?? "#9E9E9E",
            icon: SKILL_META[topSkill.skillId]?.icon ?? "star-outline",
            level: topSkill.level,
            rank: topSkill.rank,
            progressPct: topSkill.progressPct,
          }
        : null,
      streak: { current: currentStreak, longest: longestStreak, activeToday },
      level,
      xp,
      xpToNextLevel,
      recentBadges,
      weeklyFocusMinutes,
      weeklySessionsCompleted,
      totalSessions,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
