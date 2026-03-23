import { Router } from "express";
import { db, missionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { calculateRewardPotential } from "../lib/rewards.js";
import { generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
import { dispatchWebhookEvent } from "../lib/webhook-dispatcher.js";
import { getProofRequirements, calculateMissionValueScore, VALID_CATEGORIES } from "../lib/category-proof-requirements.js";

const router = Router();

router.use(requireAuth);

function parseMission(m: any) {
  return {
    ...m,
    requiredProofTypes: JSON.parse(m.requiredProofTypes || "[]"),
    proofRequirements: m.proofRequirements ? JSON.parse(m.proofRequirements) : null,
    createdAt: m.createdAt?.toISOString(),
    updatedAt: m.updatedAt?.toISOString(),
    dueDate: m.dueDate ?? null,
    description: m.description ?? null,
    purpose: m.purpose ?? null,
  };
}

router.get("/", async (req, res) => {
  const userId = (req as any).userId;

  const missions = await db.select().from(missionsTable)
    .where(and(
      eq(missionsTable.userId, userId),
      req.query.status ? eq(missionsTable.status, req.query.status as any) : undefined
    ) as any);

  res.json(missions.map(parseMission));
});

router.post("/", async (req, res) => {
  const schema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().optional().nullable(),
    category: z.enum(["trading", "fitness", "learning", "deep_work", "habit", "sleep", "other"]),
    targetDurationMinutes: z.number().int().min(5).max(480),
    priority: z.enum(["low", "medium", "high", "critical"]),
    impactLevel: z.number().int().min(1).max(5),
    dueDate: z.string().optional().nullable(),
    purpose: z.string().optional().nullable(),
    requiredProofTypes: z.array(z.enum(["image", "screenshot", "file", "link", "text"])).min(1),
    proofRequired: z.boolean().optional().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    return;
  }

  const userId = (req as any).userId;
  const data = parsed.data;
  const rewardPotential = calculateRewardPotential(data.priority, data.impactLevel, data.targetDurationMinutes);

  const proofReqs = getProofRequirements(data.category);
  const clampedImpact = Math.max(1, Math.min(5, data.impactLevel));
  const missionValueScore = calculateMissionValueScore(data.priority, clampedImpact, data.targetDurationMinutes);

  const id = generateId();
  await db.insert(missionsTable).values({
    id,
    userId,
    title: data.title,
    description: data.description ?? null,
    category: data.category,
    targetDurationMinutes: data.targetDurationMinutes,
    priority: data.priority,
    impactLevel: data.impactLevel,
    dueDate: data.dueDate ?? null,
    purpose: data.purpose ?? null,
    requiredProofTypes: JSON.stringify(data.requiredProofTypes),
    proofRequirements: JSON.stringify(proofReqs),
    missionValueScore,
    status: "active",
    rewardPotential,
  });

  const mission = await db.select().from(missionsTable).where(eq(missionsTable.id, id)).limit(1);
  trackEvent(Events.MISSION_CREATED, userId, { category: data.category, priority: data.priority }).catch(() => {});
  dispatchWebhookEvent(userId, "mission.created", {
    missionId: id,
    title: data.title,
    category: data.category,
    priority: data.priority,
    targetDurationMinutes: data.targetDurationMinutes,
    rewardPotential,
    missionValueScore,
  }).catch(() => {});
  res.status(201).json(parseMission(mission[0]));
});

router.get("/:missionId", async (req, res) => {
  const userId = (req as any).userId;
  const mission = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.id, req.params.missionId), eq(missionsTable.userId, userId)))
    .limit(1);

  if (!mission[0]) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }
  res.json(parseMission(mission[0]));
});

router.put("/:missionId", async (req, res) => {
  const userId = (req as any).userId;
  const mission = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.id, req.params.missionId), eq(missionsTable.userId, userId)))
    .limit(1);

  if (!mission[0]) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  const body = req.body;

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.category !== undefined) {
    const validCategories = ["trading", "fitness", "learning", "deep_work", "habit", "sleep", "other"];
    if (!validCategories.includes(body.category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }
    updates.category = body.category;
    const proofReqs = getProofRequirements(body.category);
    updates.proofRequirements = JSON.stringify(proofReqs);
  }
  if (body.targetDurationMinutes !== undefined) updates.targetDurationMinutes = body.targetDurationMinutes;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.impactLevel !== undefined) {
    const impact = Math.max(1, Math.min(5, body.impactLevel));
    updates.impactLevel = impact;
  }

  const needsValueRecalc = body.priority !== undefined || body.impactLevel !== undefined || body.targetDurationMinutes !== undefined;
  if (needsValueRecalc) {
    const finalPriority = body.priority ?? mission[0].priority;
    const finalImpact = Math.max(1, Math.min(5, body.impactLevel ?? mission[0].impactLevel));
    const finalDuration = body.targetDurationMinutes ?? mission[0].targetDurationMinutes;
    updates.missionValueScore = calculateMissionValueScore(finalPriority, finalImpact, finalDuration);
    updates.rewardPotential = calculateRewardPotential(finalPriority, body.impactLevel ?? mission[0].impactLevel, finalDuration);
  }

  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.purpose !== undefined) updates.purpose = body.purpose;
  if (body.status !== undefined) updates.status = body.status;

  await db.update(missionsTable).set(updates).where(eq(missionsTable.id, req.params.missionId));
  const updated = await db.select().from(missionsTable).where(eq(missionsTable.id, req.params.missionId)).limit(1);
  res.json(parseMission(updated[0]));
});

router.delete("/:missionId", async (req, res) => {
  const userId = (req as any).userId;
  const mission = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.id, req.params.missionId), eq(missionsTable.userId, userId)))
    .limit(1);

  if (!mission[0]) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  await db.update(missionsTable).set({ status: "archived", updatedAt: new Date() })
    .where(eq(missionsTable.id, req.params.missionId));
  res.json({ message: "Mission archived" });
});

export default router;
