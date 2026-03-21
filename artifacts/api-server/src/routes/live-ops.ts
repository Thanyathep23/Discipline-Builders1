import { Router } from "express";
import {
  db,
  contentPacksTable,
  liveEventsTable,
  contentVariantsTable,
  userVariantAssignmentsTable,
  usersTable,
  lifeProfilesTable,
  userSkillsTable,
  focusSessionsTable,
  auditLogTable,
} from "@workspace/db";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";
import { trackEvent } from "../lib/telemetry.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isTimeActive(startsAt: Date | null, endsAt: Date | null, isLimitedTime: boolean): boolean {
  const now = new Date();
  if (isLimitedTime) {
    if (startsAt && now < startsAt) return false;
    if (endsAt && now > endsAt) return false;
  }
  return true;
}

function isEventTimeActive(startsAt: Date | null, endsAt: Date | null): boolean {
  const now = new Date();
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function assignVariantByUserId(userId: string, variants: { key: string }[]): string {
  if (variants.length === 0) return "control";
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % variants.length;
  return variants[idx].key;
}

// ─── Admin Router ─────────────────────────────────────────────────────────────

export const adminLiveOpsRouter = Router();
adminLiveOpsRouter.use(requireAdmin);

// ── Content Packs ──────────────────────────────────────────────────────────

adminLiveOpsRouter.get("/packs", async (_req, res) => {
  try {
    const packs = await db
      .select()
      .from(contentPacksTable)
      .orderBy(contentPacksTable.sortOrder, desc(contentPacksTable.createdAt));
    res.json(packs.map(parsePack));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.post("/packs", async (req, res) => {
  const schema = z.object({
    slug:             z.string().min(2).max(64),
    name:             z.string().min(2).max(120),
    description:      z.string().max(500).optional().default(""),
    theme:            z.string().max(40).optional().default("focus"),
    targetSkill:      z.string().optional().nullable(),
    targetArc:        z.string().optional().nullable(),
    status:           z.enum(["draft", "active", "scheduled", "expired", "archived"]).default("draft"),
    isLimitedTime:    z.boolean().default(false),
    startsAt:         z.string().datetime().optional().nullable(),
    endsAt:           z.string().datetime().optional().nullable(),
    missionTemplates: z.array(z.object({
      title:       z.string(),
      description: z.string(),
      category:    z.string(),
      priority:    z.string().optional(),
      durationMinutes: z.number().optional(),
    })).optional().default([]),
    rewardTitle:     z.string().optional().nullable(),
    rewardBadge:     z.string().optional().nullable(),
    rewardCoins:     z.number().int().min(0).default(0),
    eligibilityRule: z.enum(["none", "comeback", "arc_match", "skill_weak"]).default("none"),
    sortOrder:       z.number().int().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.flatten() });

  try {
    const id = generateId();
    const d = parsed.data;
    await db.insert(contentPacksTable).values({
      id, slug: d.slug, name: d.name, description: d.description,
      theme: d.theme, targetSkill: d.targetSkill ?? null, targetArc: d.targetArc ?? null,
      status: d.status, isLimitedTime: d.isLimitedTime,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      missionTemplates: JSON.stringify(d.missionTemplates),
      rewardTitle: d.rewardTitle ?? null, rewardBadge: d.rewardBadge ?? null,
      rewardCoins: d.rewardCoins, eligibilityRule: d.eligibilityRule, sortOrder: d.sortOrder,
    });
    const [pack] = await db.select().from(contentPacksTable).where(eq(contentPacksTable.id, id)).limit(1);
    await db.insert(auditLogTable).values({
      id: generateId(), actorId: (req as any).user?.id ?? null, actorRole: "admin",
      action: "content_pack_created", targetId: id, targetType: "content_pack",
      details: JSON.stringify({ slug: d.slug, name: d.name }),
    });
    res.status(201).json(parsePack(pack));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.patch("/packs/:id", async (req, res) => {
  const schema = z.object({
    name:             z.string().min(2).max(120).optional(),
    description:      z.string().max(500).optional(),
    theme:            z.string().max(40).optional(),
    targetSkill:      z.string().optional().nullable(),
    targetArc:        z.string().optional().nullable(),
    status:           z.enum(["draft", "active", "scheduled", "expired", "archived"]).optional(),
    isLimitedTime:    z.boolean().optional(),
    startsAt:         z.string().datetime().optional().nullable(),
    endsAt:           z.string().datetime().optional().nullable(),
    missionTemplates: z.array(z.any()).optional(),
    rewardTitle:      z.string().optional().nullable(),
    rewardBadge:      z.string().optional().nullable(),
    rewardCoins:      z.number().int().min(0).optional(),
    eligibilityRule:  z.enum(["none", "comeback", "arc_match", "skill_weak"]).optional(),
    sortOrder:        z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });

  try {
    const d = parsed.data;
    const upd: Record<string, any> = { updatedAt: new Date() };
    if (d.name !== undefined) upd.name = d.name;
    if (d.description !== undefined) upd.description = d.description;
    if (d.theme !== undefined) upd.theme = d.theme;
    if ("targetSkill" in d) upd.targetSkill = d.targetSkill ?? null;
    if ("targetArc" in d) upd.targetArc = d.targetArc ?? null;
    if (d.status !== undefined) upd.status = d.status;
    if (d.isLimitedTime !== undefined) upd.isLimitedTime = d.isLimitedTime;
    if ("startsAt" in d) upd.startsAt = d.startsAt ? new Date(d.startsAt as string) : null;
    if ("endsAt" in d) upd.endsAt = d.endsAt ? new Date(d.endsAt as string) : null;
    if (d.missionTemplates !== undefined) upd.missionTemplates = JSON.stringify(d.missionTemplates);
    if ("rewardTitle" in d) upd.rewardTitle = d.rewardTitle ?? null;
    if ("rewardBadge" in d) upd.rewardBadge = d.rewardBadge ?? null;
    if (d.rewardCoins !== undefined) upd.rewardCoins = d.rewardCoins;
    if (d.eligibilityRule !== undefined) upd.eligibilityRule = d.eligibilityRule;
    if (d.sortOrder !== undefined) upd.sortOrder = d.sortOrder;

    await db.update(contentPacksTable).set(upd).where(eq(contentPacksTable.id, req.params.id));
    const [pack] = await db.select().from(contentPacksTable).where(eq(contentPacksTable.id, req.params.id)).limit(1);
    if (!pack) return res.status(404).json({ error: "Pack not found" });

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: (req as any).user?.id ?? null, actorRole: "admin",
      action: "content_pack_updated", targetId: req.params.id, targetType: "content_pack",
      details: JSON.stringify({ status: d.status }),
    });
    res.json(parsePack(pack));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Events ────────────────────────────────────────────────────────────

adminLiveOpsRouter.get("/events", async (_req, res) => {
  try {
    const events = await db
      .select()
      .from(liveEventsTable)
      .orderBy(liveEventsTable.sortOrder, desc(liveEventsTable.createdAt));
    res.json(events.map(parseEvent));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.post("/events", async (req, res) => {
  const schema = z.object({
    slug:            z.string().min(2).max(64),
    name:            z.string().min(2).max(120),
    description:     z.string().max(500).optional().default(""),
    status:          z.enum(["draft", "active", "scheduled", "expired", "archived"]).default("draft"),
    startsAt:        z.string().datetime().optional().nullable(),
    endsAt:          z.string().datetime().optional().nullable(),
    contentPackId:   z.string().optional().nullable(),
    bonusMultiplier: z.string().optional().default("1.0"),
    rewardTitle:     z.string().optional().nullable(),
    rewardBadge:     z.string().optional().nullable(),
    rewardCoins:     z.number().int().min(0).default(0),
    targetArc:       z.string().optional().nullable(),
    targetUserState: z.enum(["any", "comeback", "active"]).default("any"),
    bannerColor:     z.string().optional().default("#7C5CFC"),
    sortOrder:       z.number().int().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.flatten() });

  try {
    const id = generateId();
    const d = parsed.data;
    await db.insert(liveEventsTable).values({
      id, slug: d.slug, name: d.name, description: d.description,
      status: d.status,
      startsAt: d.startsAt ? new Date(d.startsAt) : null,
      endsAt: d.endsAt ? new Date(d.endsAt) : null,
      contentPackId: d.contentPackId ?? null,
      bonusMultiplier: d.bonusMultiplier,
      rewardTitle: d.rewardTitle ?? null, rewardBadge: d.rewardBadge ?? null,
      rewardCoins: d.rewardCoins,
      targetArc: d.targetArc ?? null, targetUserState: d.targetUserState,
      bannerColor: d.bannerColor, sortOrder: d.sortOrder,
    });
    const [evt] = await db.select().from(liveEventsTable).where(eq(liveEventsTable.id, id)).limit(1);
    await db.insert(auditLogTable).values({
      id: generateId(), actorId: (req as any).user?.id ?? null, actorRole: "admin",
      action: "live_event_created", targetId: id, targetType: "live_event",
      details: JSON.stringify({ slug: d.slug, name: d.name }),
    });
    res.status(201).json(parseEvent(evt));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.patch("/events/:id", async (req, res) => {
  const schema = z.object({
    name:            z.string().min(2).max(120).optional(),
    description:     z.string().max(500).optional(),
    status:          z.enum(["draft", "active", "scheduled", "expired", "archived"]).optional(),
    startsAt:        z.string().datetime().optional().nullable(),
    endsAt:          z.string().datetime().optional().nullable(),
    contentPackId:   z.string().optional().nullable(),
    bonusMultiplier: z.string().optional(),
    rewardTitle:     z.string().optional().nullable(),
    rewardBadge:     z.string().optional().nullable(),
    rewardCoins:     z.number().int().min(0).optional(),
    targetArc:       z.string().optional().nullable(),
    targetUserState: z.enum(["any", "comeback", "active"]).optional(),
    bannerColor:     z.string().optional(),
    sortOrder:       z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });

  try {
    const d = parsed.data;
    const upd: Record<string, any> = { updatedAt: new Date() };
    if (d.name !== undefined) upd.name = d.name;
    if (d.description !== undefined) upd.description = d.description;
    if (d.status !== undefined) upd.status = d.status;
    if ("startsAt" in d) upd.startsAt = d.startsAt ? new Date(d.startsAt as string) : null;
    if ("endsAt" in d) upd.endsAt = d.endsAt ? new Date(d.endsAt as string) : null;
    if ("contentPackId" in d) upd.contentPackId = d.contentPackId ?? null;
    if (d.bonusMultiplier !== undefined) upd.bonusMultiplier = d.bonusMultiplier;
    if ("rewardTitle" in d) upd.rewardTitle = d.rewardTitle ?? null;
    if ("rewardBadge" in d) upd.rewardBadge = d.rewardBadge ?? null;
    if (d.rewardCoins !== undefined) upd.rewardCoins = d.rewardCoins;
    if ("targetArc" in d) upd.targetArc = d.targetArc ?? null;
    if (d.targetUserState !== undefined) upd.targetUserState = d.targetUserState;
    if (d.bannerColor !== undefined) upd.bannerColor = d.bannerColor;
    if (d.sortOrder !== undefined) upd.sortOrder = d.sortOrder;

    await db.update(liveEventsTable).set(upd).where(eq(liveEventsTable.id, req.params.id));
    const [evt] = await db.select().from(liveEventsTable).where(eq(liveEventsTable.id, req.params.id)).limit(1);
    if (!evt) return res.status(404).json({ error: "Event not found" });

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: (req as any).user?.id ?? null, actorRole: "admin",
      action: "live_event_updated", targetId: req.params.id, targetType: "live_event",
      details: JSON.stringify({ status: d.status }),
    });
    res.json(parseEvent(evt));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Content Variants ───────────────────────────────────────────────────────

adminLiveOpsRouter.get("/variants", async (_req, res) => {
  try {
    const variants = await db
      .select()
      .from(contentVariantsTable)
      .orderBy(desc(contentVariantsTable.createdAt));
    res.json(variants.map(parseVariant));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.post("/variants", async (req, res) => {
  const variantItemSchema = z.object({ key: z.string(), label: z.string(), content: z.string() });
  const schema = z.object({
    name:           z.string().min(2).max(120),
    surface:        z.enum(["ai_mission_framing", "pack_cta", "event_card", "mission_difficulty", "comeback_copy"]),
    status:         z.enum(["draft", "active", "paused", "concluded"]).default("draft"),
    variants:       z.array(variantItemSchema).min(2),
    assignmentMode: z.enum(["user_id_mod", "random"]).default("user_id_mod"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", issues: parsed.error.flatten() });

  try {
    const id = generateId();
    const d = parsed.data;
    await db.insert(contentVariantsTable).values({
      id, name: d.name, surface: d.surface, status: d.status,
      variants: JSON.stringify(d.variants), assignmentMode: d.assignmentMode,
    });
    const [v] = await db.select().from(contentVariantsTable).where(eq(contentVariantsTable.id, id)).limit(1);
    res.status(201).json(parseVariant(v));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminLiveOpsRouter.patch("/variants/:id", async (req, res) => {
  const schema = z.object({
    name:           z.string().min(2).max(120).optional(),
    status:         z.enum(["draft", "active", "paused", "concluded"]).optional(),
    variants:       z.array(z.any()).optional(),
    assignmentMode: z.enum(["user_id_mod", "random"]).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });

  try {
    const d = parsed.data;
    const upd: Record<string, any> = { updatedAt: new Date() };
    if (d.name !== undefined) upd.name = d.name;
    if (d.status !== undefined) upd.status = d.status;
    if (d.variants !== undefined) upd.variants = JSON.stringify(d.variants);
    if (d.assignmentMode !== undefined) upd.assignmentMode = d.assignmentMode;

    await db.update(contentVariantsTable).set(upd).where(eq(contentVariantsTable.id, req.params.id));
    const [v] = await db.select().from(contentVariantsTable).where(eq(contentVariantsTable.id, req.params.id)).limit(1);
    if (!v) return res.status(404).json({ error: "Variant not found" });
    res.json(parseVariant(v));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Metrics ────────────────────────────────────────────────────────────────

adminLiveOpsRouter.get("/metrics", async (_req, res) => {
  try {
    const [
      [{ totalPacks }],
      [{ activePacks }],
      [{ totalEvents }],
      [{ activeEvents }],
      [{ totalVariants }],
      [{ activeVariants }],
      [{ totalAssignments }],
    ] = await Promise.all([
      db.select({ totalPacks: count() }).from(contentPacksTable),
      db.select({ activePacks: count() }).from(contentPacksTable).where(eq(contentPacksTable.status, "active")),
      db.select({ totalEvents: count() }).from(liveEventsTable),
      db.select({ activeEvents: count() }).from(liveEventsTable).where(eq(liveEventsTable.status, "active")),
      db.select({ totalVariants: count() }).from(contentVariantsTable),
      db.select({ activeVariants: count() }).from(contentVariantsTable).where(eq(contentVariantsTable.status, "active")),
      db.select({ totalAssignments: count() }).from(userVariantAssignmentsTable),
    ]);

    res.json({
      packs: { total: Number(totalPacks), active: Number(activePacks) },
      events: { total: Number(totalEvents), active: Number(activeEvents) },
      variants: { total: Number(totalVariants), active: Number(activeVariants), totalAssignments: Number(totalAssignments) },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Seed sample data for demo ──────────────────────────────────────────────

adminLiveOpsRouter.post("/seed-samples", async (req, res) => {
  try {
    const now = new Date();

    // Sample packs
    const packs = [
      {
        id: generateId(), slug: "7-day-focus-reset", name: "7-Day Focus Reset Pack",
        description: "A curated 7-day programme to rebuild your deep work capacity from the ground up.",
        theme: "focus", targetSkill: "focus", status: "active", isLimitedTime: false,
        missionTemplates: JSON.stringify([
          { title: "Morning Lock-In", description: "Complete a 30-min distraction-free focus block before noon.", category: "Work", durationMinutes: 30 },
          { title: "Evening Review", description: "Spend 15 mins reviewing what you produced today.", category: "Work", durationMinutes: 15 },
          { title: "Deep Work Block", description: "Complete a 60-min single-task focus session.", category: "Work", durationMinutes: 60 },
        ]),
        rewardTitle: "title-focus-rebuilt", rewardCoins: 150, eligibilityRule: "none", sortOrder: 0,
      },
      {
        id: generateId(), slug: "comeback-challenge", name: "Comeback Challenge Pack",
        description: "Welcome back. This pack re-activates your momentum with short, winnable missions.",
        theme: "discipline", targetSkill: null, status: "active", isLimitedTime: false,
        missionTemplates: JSON.stringify([
          { title: "First Step Back", description: "Complete any 20-minute mission to restart your momentum.", category: "Personal", durationMinutes: 20 },
          { title: "Two in a Row", description: "Complete two missions on the same day.", category: "Personal", durationMinutes: 25 },
        ]),
        rewardTitle: null, rewardCoins: 80, eligibilityRule: "comeback", sortOrder: 1,
      },
      {
        id: generateId(), slug: "trading-review-sprint", name: "Trading Review Sprint",
        description: "Build a consistent trade review habit over 10 focused sessions.",
        theme: "trading", targetSkill: "trading", status: "draft", isLimitedTime: false,
        missionTemplates: JSON.stringify([
          { title: "Trade Journal Entry", description: "Document 3 recent trades with entry reasoning and outcome.", category: "Trading", durationMinutes: 20 },
          { title: "Weekly Pattern Review", description: "Identify one pattern that repeated in your trades this week.", category: "Trading", durationMinutes: 30 },
        ]),
        rewardTitle: null, rewardCoins: 100, eligibilityRule: "skill_weak", sortOrder: 2,
      },
    ];

    for (const p of packs) {
      await db.insert(contentPacksTable).values(p as any).onConflictDoNothing();
    }

    // Sample events
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = [
      {
        id: generateId(), slug: "weekend-focus-sprint", name: "Weekend Focus Sprint",
        description: "Push hard this weekend. Complete 3 focus missions before Sunday ends.",
        status: "active",
        startsAt: now, endsAt: weekEnd,
        bonusMultiplier: "1.25", rewardTitle: null, rewardBadge: null, rewardCoins: 50,
        targetArc: null, targetUserState: "any", bannerColor: "#7C5CFC", sortOrder: 0,
      },
      {
        id: generateId(), slug: "mastery-sprint", name: "Mastery Sprint",
        description: "This week is about depth. Focus sessions count double toward your weakest skill.",
        status: "draft",
        startsAt: null, endsAt: null,
        bonusMultiplier: "1.0", rewardTitle: null, rewardBadge: null, rewardCoins: 0,
        targetArc: null, targetUserState: "active", bannerColor: "#00D4FF", sortOrder: 1,
      },
    ];

    for (const e of events) {
      await db.insert(liveEventsTable).values(e as any).onConflictDoNothing();
    }

    // Sample variants
    const variants = [
      {
        id: generateId(), name: "AI Mission Framing Test",
        surface: "ai_mission_framing", status: "active",
        variants: JSON.stringify([
          { key: "control", label: "Control", content: "Standard mission framing" },
          { key: "challenge", label: "Challenge", content: "Framing emphasising difficulty and growth" },
          { key: "momentum", label: "Momentum", content: "Framing emphasising streaks and consistency" },
        ]),
        assignmentMode: "user_id_mod",
      },
      {
        id: generateId(), name: "Comeback Copy Test",
        surface: "comeback_copy", status: "active",
        variants: JSON.stringify([
          { key: "control", label: "Control", content: "Welcome back. Let's rebuild." },
          { key: "affirm", label: "Affirm", content: "You haven't lost anything. Let's pick up where you left off." },
        ]),
        assignmentMode: "user_id_mod",
      },
    ];

    for (const v of variants) {
      await db.insert(contentVariantsTable).values(v as any).onConflictDoNothing();
    }

    res.json({ message: "Sample data seeded", packs: packs.length, events: events.length, variants: variants.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── User Router ──────────────────────────────────────────────────────────────

export const userLiveOpsRouter = Router();
userLiveOpsRouter.use(requireAuth);

// GET /live-ops/active — returns active packs and events relevant to this user
userLiveOpsRouter.get("/active", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Fetch active packs (time-aware)
    const allPacks = await db
      .select()
      .from(contentPacksTable)
      .where(eq(contentPacksTable.status, "active"))
      .orderBy(contentPacksTable.sortOrder);

    // Fetch active events (time-aware)
    const allEvents = await db
      .select()
      .from(liveEventsTable)
      .where(eq(liveEventsTable.status, "active"))
      .orderBy(liveEventsTable.sortOrder);

    // Get user context for eligibility
    const [profile] = await db.select({ currentArc: lifeProfilesTable.currentArc })
      .from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);

    const skills = await db.select({ skillId: userSkillsTable.skillId, level: userSkillsTable.level })
      .from(userSkillsTable).where(eq(userSkillsTable.userId, userId));

    const weakestSkill = skills.length > 0
      ? [...skills].sort((a, b) => a.level - b.level)[0]?.skillId
      : null;

    const lastSession = await db.select({ startedAt: focusSessionsTable.startedAt })
      .from(focusSessionsTable).where(eq(focusSessionsTable.userId, userId))
      .orderBy(desc(focusSessionsTable.startedAt)).limit(1);

    const daysSinceLast = lastSession[0]
      ? Math.floor((now.getTime() - new Date(lastSession[0].startedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const isComeback = daysSinceLast >= 3;
    const userArc = profile?.currentArc ?? null;

    // Filter packs by time window + eligibility
    const eligiblePacks = allPacks.filter((pack) => {
      if (!isTimeActive(pack.startsAt, pack.endsAt, pack.isLimitedTime)) return false;
      switch (pack.eligibilityRule) {
        case "comeback":   return isComeback;
        case "arc_match":  return pack.targetArc ? userArc?.includes(pack.targetArc) : true;
        case "skill_weak": return pack.targetSkill ? weakestSkill === pack.targetSkill : true;
        default:           return true;
      }
    });

    // Filter events by time window + targetUserState
    const eligibleEvents = allEvents.filter((evt) => {
      if (!isEventTimeActive(evt.startsAt, evt.endsAt)) return false;
      if (evt.targetUserState === "comeback" && !isComeback) return false;
      if (evt.targetUserState === "active" && isComeback) return false;
      if (evt.targetArc && userArc && !userArc.includes(evt.targetArc)) return false;
      return true;
    });

    // Attach pack to events
    const packIds = eligibleEvents.map(e => e.contentPackId).filter(Boolean) as string[];
    const linkedPacks = packIds.length > 0
      ? await db.select().from(contentPacksTable).where(inArray(contentPacksTable.id, packIds))
      : [];

    const linkedPackMap = Object.fromEntries(linkedPacks.map(p => [p.id, parsePack(p)]));

    trackEvent("live_ops_active_fetched", userId, {
      eligiblePacks: eligiblePacks.length,
      eligibleEvents: eligibleEvents.length,
    }).catch(() => {});

    res.json({
      packs: eligiblePacks.map(parsePack),
      events: eligibleEvents.map(evt => ({
        ...parseEvent(evt),
        linkedPack: evt.contentPackId ? linkedPackMap[evt.contentPackId] ?? null : null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /live-ops/variant/:variantId — get (or assign) a variant for this user
userLiveOpsRouter.get("/variant/:variantId", async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;

    const [variant] = await db.select().from(contentVariantsTable)
      .where(and(eq(contentVariantsTable.id, variantId), eq(contentVariantsTable.status, "active"))).limit(1);

    if (!variant) return res.status(404).json({ error: "Variant not found or not active" });

    const variants: { key: string; label: string; content: string }[] = JSON.parse(variant.variants || "[]");
    if (variants.length === 0) return res.json({ variantKey: "control", content: null });

    // Check existing assignment
    const [existing] = await db.select().from(userVariantAssignmentsTable)
      .where(and(eq(userVariantAssignmentsTable.userId, userId), eq(userVariantAssignmentsTable.variantId, variantId)))
      .limit(1);

    let assignedKey: string;
    if (existing) {
      assignedKey = existing.assignedKey;
    } else {
      if (variant.assignmentMode === "user_id_mod") {
        assignedKey = assignVariantByUserId(userId, variants);
      } else {
        assignedKey = variants[Math.floor(Math.random() * variants.length)].key;
      }
      await db.insert(userVariantAssignmentsTable).values({
        id: generateId(), userId, variantId, assignedKey,
      });
    }

    const assignedVariant = variants.find(v => v.key === assignedKey) ?? variants[0];

    trackEvent("variant_exposed", userId, {
      variantId, variantName: variant.name, surface: variant.surface, assignedKey,
    }).catch(() => {});

    res.json({
      variantKey: assignedKey,
      label: assignedVariant.label,
      content: assignedVariant.content,
      surface: variant.surface,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parsePack(p: any) {
  return {
    id: p.id, slug: p.slug, name: p.name, description: p.description,
    theme: p.theme, targetSkill: p.targetSkill, targetArc: p.targetArc,
    status: p.status, isLimitedTime: p.isLimitedTime,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    missionTemplates: JSON.parse(p.missionTemplates || "[]"),
    rewardTitle: p.rewardTitle, rewardBadge: p.rewardBadge,
    rewardCoins: p.rewardCoins, eligibilityRule: p.eligibilityRule,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt?.toISOString(), updatedAt: p.updatedAt?.toISOString(),
  };
}

function parseEvent(e: any) {
  return {
    id: e.id, slug: e.slug, name: e.name, description: e.description,
    status: e.status,
    startsAt: e.startsAt?.toISOString() ?? null,
    endsAt: e.endsAt?.toISOString() ?? null,
    contentPackId: e.contentPackId,
    bonusMultiplier: parseFloat(e.bonusMultiplier ?? "1.0"),
    rewardTitle: e.rewardTitle, rewardBadge: e.rewardBadge,
    rewardCoins: e.rewardCoins,
    targetArc: e.targetArc, targetUserState: e.targetUserState,
    bannerColor: e.bannerColor, sortOrder: e.sortOrder,
    createdAt: e.createdAt?.toISOString(), updatedAt: e.updatedAt?.toISOString(),
  };
}

function parseVariant(v: any) {
  return {
    id: v.id, name: v.name, surface: v.surface, status: v.status,
    variants: JSON.parse(v.variants || "[]"),
    assignmentMode: v.assignmentMode,
    createdAt: v.createdAt?.toISOString(), updatedAt: v.updatedAt?.toISOString(),
  };
}
