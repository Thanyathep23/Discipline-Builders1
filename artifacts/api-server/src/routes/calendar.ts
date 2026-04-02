/**
 * Phase 16 — Calendar Integration Lite
 *
 * GET /api/calendar/export           — full .ics export (missions + focus sessions)
 * GET /api/calendar/missions.ics     — missions only as calendar events
 * GET /api/calendar/sessions.ics     — completed focus sessions as calendar events
 * POST /api/calendar/focus-block     — generate a suggested focus block event (.ics)
 */

import { Router } from "express";
import { db, missionsTable, focusSessionsTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

// ── ICS helpers ───────────────────────────────────────────────────────────────

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcsEvent(params: {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  categories?: string;
  url?: string;
}): string {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${params.uid}@disciplineos`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(params.dtstart)}`,
    `DTEND:${formatIcsDate(params.dtend)}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
  ];
  if (params.description) lines.push(`DESCRIPTION:${escapeIcsText(params.description)}`);
  if (params.categories) lines.push(`CATEGORIES:${params.categories}`);
  if (params.url) lines.push(`URL:${params.url}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function wrapIcs(events: string[], calName: string): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DisciplineOS//Calendar Export//EN",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:UTC",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");
  return header + "\r\n" + events.join("\r\n") + "\r\nEND:VCALENDAR";
}

// ── GET /api/calendar/missions.ics ────────────────────────────────────────────
router.get("/missions.ics", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const missions = await db
      .select()
      .from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), eq(missionsTable.status, "active")))
      .orderBy(desc(missionsTable.createdAt))
      .limit(100);

    const events = missions.map((m) => {
      const base = m.dueDate ? new Date(m.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dtstart = new Date(base);
      dtstart.setUTCHours(9, 0, 0, 0);
      const dtend = new Date(dtstart.getTime() + (m.targetDurationMinutes ?? 60) * 60 * 1000);
      return buildIcsEvent({
        uid: `mission-${m.id}`,
        summary: `[DisciplineOS] ${m.title}`,
        description: [
          m.description ?? "",
          `Category: ${m.category}`,
          `Priority: ${m.priority}`,
          `Reward potential: ${m.rewardPotential} coins`,
        ].filter(Boolean).join("\n"),
        dtstart,
        dtend,
        categories: `DisciplineOS,Mission,${m.category}`,
      });
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-missions.ics"');
    res.send(wrapIcs(events, "DisciplineOS Missions"));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/calendar/sessions.ics ───────────────────────────────────────────
router.get("/sessions.ics", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
    const sessions = await db
      .select()
      .from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "completed"), gte(focusSessionsTable.startedAt, since)))
      .orderBy(desc(focusSessionsTable.startedAt))
      .limit(100);

    const events = sessions.filter((s) => s.startedAt && s.endedAt).map((s) => {
      return buildIcsEvent({
        uid: `session-${s.id}`,
        summary: `[DisciplineOS] Focus Session`,
        description: `Duration: ${Math.round(((s.endedAt!.getTime() - s.startedAt!.getTime()) / 60000) - (s.totalPausedSeconds ?? 0) / 60)} min active\nStrictness: ${s.strictnessMode}`,
        dtstart: s.startedAt!,
        dtend: s.endedAt!,
        categories: "DisciplineOS,FocusSession",
      });
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="disciplineos-sessions.ics"');
    res.send(wrapIcs(events, "DisciplineOS Focus Sessions"));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/calendar/export ──────────────────────────────────────────────────
// Combined export: active missions + recent completed sessions
router.get("/export", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [missions, sessions] = await Promise.all([
      db.select().from(missionsTable).where(and(eq(missionsTable.userId, userId), eq(missionsTable.status, "active"))).limit(50),
      db.select().from(focusSessionsTable).where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "completed"), gte(focusSessionsTable.startedAt, since))).limit(50),
    ]);

    const missionEvents = missions.map((m) => {
      const base = m.dueDate ? new Date(m.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dtstart = new Date(base); dtstart.setUTCHours(9, 0, 0, 0);
      const dtend = new Date(dtstart.getTime() + (m.targetDurationMinutes ?? 60) * 60 * 1000);
      return buildIcsEvent({
        uid: `mission-${m.id}`,
        summary: `[Mission] ${m.title}`,
        description: `${m.description ?? ""}\nPriority: ${m.priority} | Reward: ${m.rewardPotential} coins`,
        dtstart,
        dtend,
        categories: `DisciplineOS,Mission`,
      });
    });

    const sessionEvents = sessions.filter((s) => s.startedAt && s.endedAt).map((s) => {
      return buildIcsEvent({
        uid: `session-${s.id}`,
        summary: `[Focus] Session`,
        description: `Strictness: ${s.strictnessMode}`,
        dtstart: s.startedAt!,
        dtend: s.endedAt!,
        categories: "DisciplineOS,FocusSession",
      });
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="disciplineos.ics"');
    res.send(wrapIcs([...missionEvents, ...sessionEvents], "DisciplineOS"));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/calendar/focus-block ────────────────────────────────────────────
// Generate a suggested focus block as a downloadable .ics event.
router.post("/focus-block", async (req: any, res) => {
  try {
    const { title = "Focus Block", durationMinutes = 60, startAt } = req.body ?? {};
    const clampedDuration = Math.max(15, Math.min(240, parseInt(durationMinutes) || 60));

    const dtstart = startAt ? new Date(startAt) : (() => {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      return d;
    })();

    const dtend = new Date(dtstart.getTime() + clampedDuration * 60 * 1000);

    const ics = wrapIcs([buildIcsEvent({
      uid: `focus-block-${Date.now()}`,
      summary: `[DisciplineOS] ${String(title).slice(0, 100)}`,
      description: `Scheduled focus block — ${clampedDuration} min`,
      dtstart,
      dtend,
      categories: "DisciplineOS,FocusBlock",
    })], "DisciplineOS Focus Block");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="focus-block.ics"');
    res.send(ics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
