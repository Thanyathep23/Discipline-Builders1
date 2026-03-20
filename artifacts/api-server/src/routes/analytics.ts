import { Router } from "express";
import { db, usersTable, missionsTable, focusSessionsTable, rewardTransactionsTable, proofSubmissionsTable } from "@workspace/db";
import { eq, and, gte, desc, count, sum } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getUserSkills } from "../lib/skill-engine.js";
import { resolveArc } from "../lib/arc-resolver.js";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", async (req, res) => {
  const userId = (req as any).userId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const todayMissions = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, todayStart)));

  const weeklyMissions = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, weekStart)));

  const todaySessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), gte(focusSessionsTable.startedAt, todayStart)));

  const weeklySessions = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), gte(focusSessionsTable.startedAt, weekStart)));

  function calcFocusMinutes(sessions: any[]) {
    return sessions.reduce((acc, s) => {
      if (!s.endedAt && !s.startedAt) return acc;
      const started = new Date(s.startedAt);
      const ended = s.endedAt ? new Date(s.endedAt) : new Date();
      const minutes = Math.floor((ended.getTime() - started.getTime()) / 60000) - Math.floor((s.totalPausedSeconds ?? 0) / 60);
      return acc + Math.max(0, minutes);
    }, 0);
  }

  // Active session
  const activeSessionRaw = await db.select().from(focusSessionsTable)
    .where(and(eq(focusSessionsTable.userId, userId), eq(focusSessionsTable.status, "active")))
    .limit(1);

  let activeSession = null;
  if (activeSessionRaw[0]) {
    const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, activeSessionRaw[0].missionId)).limit(1);
    const s = activeSessionRaw[0];
    const m = mission[0];
    activeSession = {
      id: s.id, userId: s.userId, missionId: s.missionId, status: s.status, strictnessMode: s.strictnessMode,
      startedAt: s.startedAt?.toISOString(), pausedAt: null, endedAt: null,
      totalPausedSeconds: s.totalPausedSeconds ?? 0,
      elapsedSeconds: Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000) - (s.totalPausedSeconds ?? 0)),
      pauseCount: s.pauseCount ?? 0, blockedAttemptCount: s.blockedAttemptCount ?? 0,
      heartbeatCount: s.heartbeatCount ?? 0, extensionConnected: s.extensionConnected ?? false,
      mission: m ? {
        id: m.id, userId: m.userId, title: m.title, description: m.description ?? null,
        category: m.category, targetDurationMinutes: m.targetDurationMinutes, priority: m.priority,
        impactLevel: m.impactLevel, dueDate: m.dueDate ?? null, purpose: m.purpose ?? null,
        requiredProofTypes: JSON.parse(m.requiredProofTypes || "[]"), status: m.status,
        rewardPotential: m.rewardPotential,
        createdAt: m.createdAt?.toISOString(), updatedAt: m.updatedAt?.toISOString(),
      } : null,
    };
  }

  const recentMissions = await db.select().from(missionsTable)
    .where(eq(missionsTable.userId, userId))
    .orderBy(desc(missionsTable.createdAt))
    .limit(5);

  const pendingProofs = await db.select().from(proofSubmissionsTable)
    .where(and(eq(proofSubmissionsTable.userId, userId), eq(proofSubmissionsTable.status, "followup_needed")));

  const userSkills = await getUserSkills(userId).catch(() => []);
  const currentArc = resolveArc(userSkills);

  res.json({
    currentArc,
    todayMissions: todayMissions.length,
    todayCompleted: todayMissions.filter(m => m.status === "completed").length,
    todayFocusMinutes: calcFocusMinutes(todaySessions),
    weeklyMissions: weeklyMissions.length,
    weeklyCompleted: weeklyMissions.filter(m => m.status === "completed").length,
    weeklyFocusMinutes: calcFocusMinutes(weeklySessions),
    currentStreak: user[0].currentStreak,
    coinBalance: user[0].coinBalance,
    level: user[0].level,
    activeSession,
    recentMissions: recentMissions.map(m => ({
      id: m.id, userId: m.userId, title: m.title, description: m.description ?? null,
      category: m.category, targetDurationMinutes: m.targetDurationMinutes, priority: m.priority,
      impactLevel: m.impactLevel, dueDate: m.dueDate ?? null, purpose: m.purpose ?? null,
      requiredProofTypes: JSON.parse(m.requiredProofTypes || "[]"), status: m.status,
      rewardPotential: m.rewardPotential,
      createdAt: m.createdAt?.toISOString(), updatedAt: m.updatedAt?.toISOString(),
    })),
    pendingProofs: pendingProofs.map(p => ({
      id: p.id, sessionId: p.sessionId, missionId: p.missionId, userId: p.userId,
      status: p.status, textSummary: p.textSummary ?? null,
      links: JSON.parse(p.links || "[]"), fileUrls: JSON.parse(p.fileUrls || "[]"),
      aiConfidenceScore: p.aiConfidenceScore ?? null, aiVerdict: p.aiVerdict ?? null,
      aiExplanation: p.aiExplanation ?? null, aiRubric: null,
      followupQuestions: p.followupQuestions ?? null,
      rewardMultiplier: p.rewardMultiplier ?? null, coinsAwarded: p.coinsAwarded ?? null,
      manualReviewNote: p.manualReviewNote ?? null,
      createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString(),
    })),
  });
});

router.get("/daily", async (req, res) => {
  const userId = (req as any).userId;
  const days = Math.min(30, parseInt(req.query.days as string ?? "7") || 7);

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dateStr = dayStart.toISOString().slice(0, 10);

    const missions = await db.select().from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, dayStart)));

    const sessions = await db.select().from(focusSessionsTable)
      .where(and(eq(focusSessionsTable.userId, userId), gte(focusSessionsTable.startedAt, dayStart)));

    const txns = await db.select().from(rewardTransactionsTable)
      .where(and(eq(rewardTransactionsTable.userId, userId), gte(rewardTransactionsTable.createdAt, dayStart)));

    const focusMinutes = sessions.reduce((acc, s) => {
      const started = new Date(s.startedAt);
      const ended = s.endedAt ? new Date(s.endedAt) : new Date();
      if (ended < dayEnd) return acc + Math.max(0, Math.floor((ended.getTime() - started.getTime()) / 60000));
      return acc;
    }, 0);

    const coinsEarned = txns.filter(t => t.type === "earned").reduce((acc, t) => acc + (t.amount ?? 0), 0);

    result.push({
      date: dateStr,
      focusMinutes,
      missionsCompleted: missions.filter(m => m.status === "completed").length,
      coinsEarned,
      streakDay: missions.filter(m => m.status === "completed").length > 0,
    });
  }

  res.json(result);
});

export default router;
