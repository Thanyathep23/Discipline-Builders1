import { Router } from "express";
import {
  db, usersTable, auditLogTable, focusSessionsTable,
  missionsTable, userInventoryTable, featureFlagsTable,
} from "@workspace/db";
import { eq, and, count, gte, desc } from "drizzle-orm";
import { requireAdmin, generateId } from "../lib/auth.js";
import { getUserSkills } from "../lib/skill-engine.js";
import { resolveArc } from "../lib/arc-resolver.js";
import { computePrestigeState } from "../lib/prestige-engine.js";
import { computeAdaptiveChallenge } from "../lib/adaptive-challenge.js";
import { setFlag, getFlag } from "../lib/feature-flags.js";
import { z } from "zod";

// ─── Recommendation surface control keys (stored as feature flags) ────────────
const REC_SURFACE_KEYS = [
  { key: "rec_surface_next_best_action", label: "Next Best Action", description: "Home screen next-best-action card" },
  { key: "rec_surface_mission_recs",     label: "Mission Recommendations", description: "AI-suggested missions for each user" },
  { key: "rec_surface_store_merch",      label: "Smart Merchandising", description: "Personalized store item recommendations" },
  { key: "rec_surface_comeback",         label: "Comeback / Recovery", description: "Recovery recommendations for lapsed users" },
  { key: "rec_surface_prestige_nudge",   label: "Prestige Nudges", description: "Prompts to prestige when user is ready" },
] as const;

const REC_WEIGHT_KEYS = [
  { key: "rec_weight_store_push",      label: "Store Push Aggressiveness", defaultValue: "50", min: 0, max: 100, description: "Higher = more store recommendations surfaced (0-100)" },
  { key: "rec_weight_comeback_push",   label: "Comeback Push Strength",    defaultValue: "50", min: 0, max: 100, description: "Higher = more recovery prompts for lapsed users (0-100)" },
  { key: "rec_weight_mission_variety", label: "Mission Variety Bias",      defaultValue: "50", min: 0, max: 100, description: "Higher = more varied mission types recommended (0-100)" },
] as const;

const router = Router();
router.use(requireAdmin);

const SKILL_NAMES: Record<string, string> = {
  focus: "Focus", discipline: "Discipline", sleep: "Sleep",
  fitness: "Fitness", learning: "Learning", trading: "Trading",
};

// ─── GET /admin/recommendations/stats ────────────────────────────────────────
// Aggregate recommendation event metrics from audit_log.

router.get("/stats", async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days ?? 7), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [impressions, clicks, dismissals, notRelevant] = await Promise.all([
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "recommendation_shown"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "recommendation_clicked"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "recommendation_dismissed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "recommendation_not_relevant"), gte(auditLogTable.createdAt, since))),
    ]);

    const totalImpressions = Number(impressions[0]?.n ?? 0);
    const totalClicks = Number(clicks[0]?.n ?? 0);
    const totalDismissals = Number(dismissals[0]?.n ?? 0);
    const totalNotRelevant = Number(notRelevant[0]?.n ?? 0);
    const ctr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 100) : null;
    const dismissRate = totalImpressions > 0 ? Math.round((totalDismissals / totalImpressions) * 100) : null;

    // Recent individual events for inspector
    const recentEvents = await db
      .select({ action: auditLogTable.action, details: auditLogTable.details, createdAt: auditLogTable.createdAt })
      .from(auditLogTable)
      .where(and(
        gte(auditLogTable.createdAt, since),
        // action starts with "recommendation_" — filter in JS since drizzle doesn't have LIKE on text easily
      ))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(100);

    const recEvents = recentEvents.filter((e) => e.action.startsWith("recommendation_"));

    // Aggregate by type from details JSON
    const clicksByType: Record<string, number> = {};
    const dismissalsByType: Record<string, number> = {};
    for (const e of recEvents) {
      let parsed: any = {};
      try { parsed = JSON.parse(e.details ?? "{}"); } catch { /**/ }
      const type = parsed.type ?? "unknown";
      if (e.action === "recommendation_clicked") clicksByType[type] = (clicksByType[type] ?? 0) + 1;
      if (e.action === "recommendation_dismissed") dismissalsByType[type] = (dismissalsByType[type] ?? 0) + 1;
    }

    res.json({
      windowDays: days,
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        dismissals: totalDismissals,
        notRelevant: totalNotRelevant,
        ctr,
        dismissRate,
      },
      clicksByType,
      dismissalsByType,
      recentEvents: recEvents.slice(0, 20).map((e) => ({
        action: e.action,
        details: e.details ? JSON.parse(e.details) : null,
        at: e.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/recommendations/:userId — debug inspector ─────────────────────
// Returns the full recommendation payload for a specific user + key signal state.

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const { level, coinBalance, prestigeTier, currentStreak } = user;

    const [{ sessionCount }] = await db
      .select({ sessionCount: count() })
      .from(focusSessionsTable)
      .where(eq(focusSessionsTable.userId, userId));

    const sc = Number(sessionCount);
    const userTier = sc < 3 ? "new" : (level < 10 && sc < 20) ? "intermediate" : "advanced";

    const skills = await getUserSkills(userId);
    const sortedByStrength = [...skills].sort((a, b) =>
      a.level !== b.level ? a.level - b.level : a.totalXpEarned - b.totalXpEarned
    );
    const weakest = sortedByStrength[0] ?? null;
    const totalXpAcrossSkills = skills.reduce((s, sk) => s + sk.totalXpEarned, 0);
    const avgLevel = skills.length > 0 ? skills.reduce((s, sk) => s + sk.level, 0) / skills.length : 1;

    const skillsForArc = skills.map((s) => ({ skillId: s.skillId, level: s.level, xp: s.xp, totalXpEarned: s.totalXpEarned }));
    const arc = resolveArc(skillsForArc);

    const prestige = computePrestigeState(prestigeTier, totalXpAcrossSkills, level);

    let challenge = null;
    try { challenge = await computeAdaptiveChallenge(userId); } catch { /**/ }

    const [{ missionCount }] = await db
      .select({ missionCount: count() })
      .from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), eq(missionsTable.status, "active")));

    const [{ ownedCount }] = await db
      .select({ ownedCount: count() })
      .from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    // Recent recommendation events for this user
    const recentUserEvents = await db
      .select({ action: auditLogTable.action, details: auditLogTable.details, createdAt: auditLogTable.createdAt })
      .from(auditLogTable)
      .where(and(
        eq(auditLogTable.actorId, userId),
        gte(auditLogTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      ))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(50);

    const userRecEvents = recentUserEvents
      .filter((e) => e.action.startsWith("recommendation_"))
      .slice(0, 10)
      .map((e) => ({
        action: e.action,
        details: e.details ? JSON.parse(e.details) : null,
        at: e.createdAt,
      }));

    res.json({
      userId,
      debug: {
        userTier,
        level,
        coinBalance,
        prestigeTier,
        currentStreak,
        sessionCount: sc,
        totalXpAcrossSkills,
        avgSkillLevel: Math.round(avgLevel * 10) / 10,
        weakestSkill: weakest ? { skillId: weakest.skillId, name: SKILL_NAMES[weakest.skillId] ?? weakest.skillId, level: weakest.level, xp: weakest.xp, xpToNext: weakest.xpToNextLevel } : null,
        arc: { name: arc.name, theme: arc.theme },
        prestige: {
          currentTier: prestige.currentTier,
          currentLabel: prestige.currentLabel,
          nextTier: prestige.nextTier?.label ?? null,
          readinessScore: prestige.readinessScore,
          readinessSummary: prestige.readinessSummary,
        },
        challenge: challenge ? {
          isOverloaded: challenge.isOverloaded,
          recentCompletionRate: challenge.recentCompletionRate,
          avgProofQuality: challenge.avgProofQuality,
          recentStreak: challenge.recentStreak,
          adaptiveDifficultyScore: challenge.adaptiveDifficultyScore,
        } : null,
        activeMissionCount: Number(missionCount),
        inventoryItemCount: Number(ownedCount),
      },
      recentRecommendationEvents: userRecEvents,
      note: "To see the full live recommendation payload, call GET /api/guidance/recommendations as this user (or run it with their session token).",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/recommendations/controls ────────────────────────────────────
// Returns current recommendation surface on/off states and weight values.

router.get("/controls", async (_req, res) => {
  try {
    const surfaces = await Promise.all(
      REC_SURFACE_KEYS.map(async s => ({
        key:         s.key,
        label:       s.label,
        description: s.description,
        enabled:     (await getFlag(s.key, "true")) !== "false",
      })),
    );
    const weights = await Promise.all(
      REC_WEIGHT_KEYS.map(async w => ({
        key:         w.key,
        label:       w.label,
        description: w.description,
        min:         w.min,
        max:         w.max,
        value:       Number(await getFlag(w.key, w.defaultValue)),
      })),
    );
    res.json({ surfaces, weights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /admin/recommendations/controls ─────────────────────────────────────
// Update one or more surface toggles or weight values.

router.put("/controls", async (req: any, res) => {
  const schema = z.object({
    surfaces: z.record(z.string(), z.boolean()).optional(),
    weights:  z.record(z.string(), z.number().int().min(0).max(100)).optional(),
    reason:   z.string().max(300).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Validation failed", details: parsed.error.message }); return; }

  try {
    const actor = req.user;
    const { surfaces, weights, reason } = parsed.data;
    const changes: string[] = [];

    if (surfaces) {
      const validSurfaceKeys = new Set<string>(REC_SURFACE_KEYS.map(s => s.key));
      for (const [key, enabled] of Object.entries(surfaces)) {
        if (!validSurfaceKeys.has(key)) continue;
        await setFlag(key, enabled ? "true" : "false", actor.id);
        changes.push(`${key}=${enabled ? "on" : "off"}`);
      }
    }

    if (weights) {
      const validWeightKeys = new Set<string>(REC_WEIGHT_KEYS.map(w => w.key));
      for (const [key, value] of Object.entries(weights)) {
        if (!validWeightKeys.has(key)) continue;
        await setFlag(key, String(value), actor.id);
        changes.push(`${key}=${value}`);
      }
    }

    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId:    actor.id,
      actorRole:  actor.role,
      action:     "recommendation_controls_updated",
      targetType: "system",
      details:    JSON.stringify({ changes }),
      reason:     reason ?? null,
    });

    res.json({ ok: true, changes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
