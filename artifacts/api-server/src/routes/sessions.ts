import { Router } from "express";
import { db, focusSessionsTable, missionsTable, sessionHeartbeatsTable, timeEntriesTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { awardBadge, awardTitle, recordMilestone } from "./inventory.js";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";

const router = Router();
router.use(requireAuth);

function parseSession(s: any, mission?: any) {
  const now = new Date();
  const started = new Date(s.startedAt);
  let elapsed = Math.floor((now.getTime() - started.getTime()) / 1000) - (s.totalPausedSeconds ?? 0);
  if (s.status === "paused" && s.pausedAt) {
    elapsed = Math.floor((new Date(s.pausedAt).getTime() - started.getTime()) / 1000) - (s.totalPausedSeconds ?? 0);
  }
  if (s.endedAt) {
    elapsed = Math.floor((new Date(s.endedAt).getTime() - started.getTime()) / 1000) - (s.totalPausedSeconds ?? 0);
  }

  return {
    id: s.id,
    userId: s.userId,
    missionId: s.missionId,
    status: s.status,
    strictnessMode: s.strictnessMode,
    startedAt: s.startedAt?.toISOString(),
    pausedAt: s.pausedAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
    totalPausedSeconds: s.totalPausedSeconds ?? 0,
    elapsedSeconds: Math.max(0, elapsed),
    pauseCount: s.pauseCount ?? 0,
    blockedAttemptCount: s.blockedAttemptCount ?? 0,
    heartbeatCount: s.heartbeatCount ?? 0,
    extensionConnected: s.extensionConnected ?? false,
    mission: mission ? parseMission(mission) : null,
  };
}

function parseMission(m: any) {
  return {
    id: m.id,
    userId: m.userId,
    title: m.title,
    description: m.description ?? null,
    category: m.category,
    targetDurationMinutes: m.targetDurationMinutes,
    priority: m.priority,
    impactLevel: m.impactLevel,
    dueDate: m.dueDate ?? null,
    purpose: m.purpose ?? null,
    requiredProofTypes: JSON.parse(m.requiredProofTypes || "[]"),
    status: m.status,
    rewardPotential: m.rewardPotential,
    createdAt: m.createdAt?.toISOString(),
    updatedAt: m.updatedAt?.toISOString(),
  };
}

async function getSessionWithMission(sessionId: string, userId: string) {
  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, sessionId), eq(focusSessionsTable.userId, userId)))
    .limit(1);
  if (!sessions[0]) return null;
  const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, sessions[0].missionId)).limit(1);
  return { session: sessions[0], mission: mission[0] };
}

router.get("/", async (req, res) => {
  const userId = (req as any).userId;
  const sessions = await db.select().from(focusSessionsTable)
    .where(eq(focusSessionsTable.userId, userId));

  const withMissions = await Promise.all(sessions.map(async (s) => {
    const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, s.missionId)).limit(1);
    return parseSession(s, mission[0]);
  }));

  res.json(withMissions);
});

router.get("/active", async (req, res) => {
  const userId = (req as any).userId;
  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")))
    .limit(1);

  if (!sessions[0]) {
    const paused = await db.select().from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "paused")))
      .limit(1);
    if (!paused[0]) {
      res.json({ hasActive: false });
      return;
    }
    const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, paused[0].missionId)).limit(1);
    res.json({ hasActive: true, session: parseSession(paused[0], mission[0]) });
    return;
  }

  const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, sessions[0].missionId)).limit(1);
  res.json({ hasActive: true, session: parseSession(sessions[0], mission[0]) });
});

router.post("/start", async (req, res) => {
  const schema = z.object({
    missionId: z.string(),
    strictnessMode: z.enum(["normal", "strict", "extreme"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId;

  const existing = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")));
  if (existing.length > 0) {
    res.status(400).json({ error: "You already have an active focus session" });
    return;
  }

  const mission = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.id, parsed.data.missionId), eq(missionsTable.userId, userId)))
    .limit(1);
  if (!mission[0]) {
    res.status(400).json({ error: "Mission not found" });
    return;
  }

  const id = generateId();
  const now = new Date();
  await db.insert(focusSessionsTable).values({
    id,
    userId,
    missionId: parsed.data.missionId,
    status: "active",
    strictnessMode: parsed.data.strictnessMode,
    totalPausedSeconds: 0,
    pauseCount: 0,
    blockedAttemptCount: 0,
    heartbeatCount: 0,
    extensionConnected: false,
  });

  // Log a time entry start
  await db.insert(timeEntriesTable).values({
    id: generateId(),
    userId,
    sessionId: id,
    missionId: parsed.data.missionId,
    category: mission[0].category,
    startedAt: now,
    source: "focus_session",
  });

  const data = await getSessionWithMission(id, userId);
  trackEvent(Events.FOCUS_STARTED, userId, { missionId: parsed.data.missionId, strictnessMode: parsed.data.strictnessMode }).catch(() => {});
  res.status(201).json(parseSession(data!.session, data!.mission));
});

router.post("/:sessionId/pause", async (req, res) => {
  const userId = (req as any).userId;
  const data = await getSessionWithMission(req.params.sessionId, userId);
  if (!data) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (data.session.status !== "active") {
    res.status(400).json({ error: "Session is not active" });
    return;
  }

  const limits: Record<string, number> = { normal: 3, strict: 1, extreme: 0 };
  const limit = limits[data.session.strictnessMode] ?? 3;
  if (data.session.pauseCount >= limit) {
    res.status(400).json({ error: `Pause limit reached for ${data.session.strictnessMode} mode` });
    return;
  }

  await db.update(focusSessionsTable).set({
    status: "paused",
    pausedAt: new Date(),
    pauseCount: (data.session.pauseCount ?? 0) + 1,
  }).where(eq(focusSessionsTable.id, req.params.sessionId));

  const updated = await getSessionWithMission(req.params.sessionId, userId);
  res.json(parseSession(updated!.session, updated!.mission));
});

router.post("/:sessionId/resume", async (req, res) => {
  const userId = (req as any).userId;
  const data = await getSessionWithMission(req.params.sessionId, userId);
  if (!data) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (data.session.status !== "paused") {
    res.status(400).json({ error: "Session is not paused" });
    return;
  }

  const pausedAt = data.session.pausedAt ? new Date(data.session.pausedAt) : new Date();
  const pausedDuration = Math.floor((Date.now() - pausedAt.getTime()) / 1000);
  const newTotalPaused = (data.session.totalPausedSeconds ?? 0) + pausedDuration;

  await db.update(focusSessionsTable).set({
    status: "active",
    pausedAt: null,
    totalPausedSeconds: newTotalPaused,
  }).where(eq(focusSessionsTable.id, req.params.sessionId));

  const updated = await getSessionWithMission(req.params.sessionId, userId);
  res.json(parseSession(updated!.session, updated!.mission));
});

router.post("/:sessionId/stop", async (req, res) => {
  const schema = z.object({
    reason: z.enum(["completed", "abandoned", "emergency"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const userId = (req as any).userId;
  const data = await getSessionWithMission(req.params.sessionId, userId);
  if (!data) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const now = new Date();
  const finalStatus = parsed.data.reason === "completed" ? "completed" : "abandoned";
  await db.update(focusSessionsTable).set({
    status: finalStatus,
    endedAt: now,
  }).where(eq(focusSessionsTable.id, req.params.sessionId));

  // Close out the time entry for this session
  const startedAt = data.session.startedAt ? new Date(data.session.startedAt) : now;
  const totalPaused = data.session.totalPausedSeconds ?? 0;
  const rawDuration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  const durationSeconds = Math.max(0, rawDuration - totalPaused);

  await db.update(timeEntriesTable)
    .set({ endedAt: now, durationSeconds })
    .where(eq(timeEntriesTable.sessionId, req.params.sessionId));

  const updated = await getSessionWithMission(req.params.sessionId, userId);
  res.json(parseSession(updated!.session, updated!.mission));

  const evt = finalStatus === "completed" ? Events.FOCUS_COMPLETED : Events.FOCUS_ABANDONED;
  trackEvent(evt, userId, { sessionId: req.params.sessionId, durationSeconds, reason: parsed.data.reason }).catch(() => {});

  if (finalStatus === "completed") {
    try {
      const [{ value: completedCount }] = await db.select({ value: count() })
        .from(focusSessionsTable)
        .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "completed")));
      const n = Number(completedCount);
      if (n === 1) {
        await awardBadge(userId, "badge-focus-initiate");
        await awardTitle(userId, "title-focus-initiate");
        await recordMilestone(userId, "first_session_completed");
      }
      if (n === 1) await awardTitle(userId, "title-initiate");
    } catch {}
  }
});

router.post("/:sessionId/heartbeat", async (req, res) => {
  const schema = z.object({
    source: z.enum(["mobile", "web", "extension"]).default("mobile"),
    meta: z.record(z.unknown()).optional(),
  });
  const body = schema.safeParse(req.body);
  const source = body.success ? body.data.source : "mobile";
  const meta = body.success ? (body.data.meta ?? {}) : {};

  const userId = (req as any).userId;
  const sessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.id, req.params.sessionId), eq(focusSessionsTable.userId, userId)))
    .limit(1);

  if (!sessions[0]) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Increment counter
  await db.update(focusSessionsTable).set({
    heartbeatCount: (sessions[0].heartbeatCount ?? 0) + 1,
    lastHeartbeatAt: new Date(),
    extensionConnected: source === "extension" ? true : sessions[0].extensionConnected,
  }).where(eq(focusSessionsTable.id, req.params.sessionId));

  // Persist to session_heartbeats for audit trail
  await db.insert(sessionHeartbeatsTable).values({
    id: generateId(),
    sessionId: req.params.sessionId,
    userId,
    source,
    meta: JSON.stringify(meta),
  });

  res.json({ message: "Heartbeat recorded", count: (sessions[0].heartbeatCount ?? 0) + 1 });
});

export default router;
