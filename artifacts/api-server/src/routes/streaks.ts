import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getStreakNote } from "../lib/gameMaster.js";
import { dispatchWebhookEvent } from "../lib/webhook-dispatcher.js";

const router = Router();

/**
 * GET /api/streaks
 * Returns current streak, longest streak, and today's activity status.
 * A "day" counts if the user completed at least one focus session
 * OR had at least one approved proof submission on that calendar day (UTC).
 * Loss-aversion is shown gently — no harsh punishment copy.
 */
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Collect all distinct UTC days the user had meaningful activity
    const result = await db.execute(sql`
      SELECT DISTINCT activity_date FROM (
        SELECT DATE(started_at) AS activity_date
        FROM focus_sessions
        WHERE user_id = ${userId}
          AND status = 'completed'
          AND started_at IS NOT NULL
        UNION
        SELECT DATE(created_at) AS activity_date
        FROM proof_submissions
        WHERE user_id = ${userId}
          AND status = 'approved'
          AND created_at IS NOT NULL
      ) AS combined
      ORDER BY activity_date DESC
    `);

    const days: string[] = (result.rows as any[]).map((r) => r.activity_date as string);

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const activeToday = days.includes(todayStr);

    // Walk backwards from today to find the current streak
    let currentStreak = 0;
    let checkDate = activeToday ? todayStr : yesterdayStr;

    for (const day of days) {
      if (day === checkDate) {
        currentStreak++;
        // Move checkDate one day back
        const d = new Date(checkDate + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else {
        break;
      }
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let runLength = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        runLength = 1;
      } else {
        const prev = new Date(days[i - 1] + "T12:00:00Z");
        const curr = new Date(days[i] + "T12:00:00Z");
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) {
          runLength++;
        } else {
          runLength = 1;
        }
      }
      if (runLength > longestStreak) longestStreak = runLength;
    }

    // Total active days
    const totalActiveDays = days.length;

    // Last active date
    const lastActiveDate = days[0] ?? null;
    const lastActiveDaysAgo = lastActiveDate
      ? Math.round((new Date(todayStr).getTime() - new Date(lastActiveDate).getTime()) / 86400000)
      : null;

    const gmNote = getStreakNote(currentStreak, activeToday);

    if (currentStreak >= 7) {
      try {
        const { awardBadge, awardTitle, recordMilestone } = await import("./inventory.js");
        await awardBadge(userId, "badge-7day-discipline");
        await awardTitle(userId, "title-discipline-builder");
        if (currentStreak >= 7) await recordMilestone(userId, "streak_7_days", { streak: currentStreak });
        dispatchWebhookEvent(userId, "streak.milestone", { streak: currentStreak, milestone: 7 }).catch(() => {});
      } catch {}
    }
    if (currentStreak >= 14) {
      try {
        const { awardBadge, awardTitle, recordMilestone } = await import("./inventory.js");
        await awardBadge(userId, "badge-14day-momentum");
        await awardTitle(userId, "title-iron-discipline");
        await awardTitle(userId, "title-momentum-keeper");
        await recordMilestone(userId, "streak_14_days", { streak: currentStreak });
        dispatchWebhookEvent(userId, "streak.milestone", { streak: currentStreak, milestone: 14 }).catch(() => {});
      } catch {}
    }

    return res.json({
      currentStreak,
      longestStreak,
      activeToday,
      totalActiveDays,
      lastActiveDate,
      lastActiveDaysAgo,
      gmNote,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
