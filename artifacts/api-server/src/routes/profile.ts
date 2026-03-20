import { Router } from "express";
import { db, lifeProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const rows = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, req.user.id)).limit(1);
    if (rows.length === 0) {
      return res.json({ exists: false, profile: null });
    }
    const profile = rows[0];
    return res.json({
      exists: true,
      profile: {
        ...profile,
        improvementAreas: JSON.parse(profile.improvementAreas ?? "[]"),
        areaConfidence: JSON.parse(profile.areaConfidence ?? "{}"),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const existing = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);

    const body = req.body ?? {};
    const now = new Date();

    if (existing.length === 0) {
      const id = randomUUID();
      const profile = await db.insert(lifeProfilesTable).values({
        id,
        userId,
        onboardingStage: body.onboardingStage ?? "quick_start",
        quickStartDone: body.quickStartDone ?? false,
        standardDone: body.standardDone ?? false,
        deepDone: body.deepDone ?? false,
        improvementAreas: JSON.stringify(body.improvementAreas ?? []),
        areaConfidence: JSON.stringify(body.areaConfidence ?? {}),
        mainGoal: body.mainGoal ?? null,
        mainProblem: body.mainProblem ?? null,
        workStudyStatus: body.workStudyStatus ?? null,
        availableHoursPerDay: body.availableHoursPerDay ?? null,
        strictnessPreference: body.strictnessPreference ?? "normal",
        dailyRoutine: body.dailyRoutine ?? null,
        weakPoints: body.weakPoints ?? null,
        distractionTriggers: body.distractionTriggers ?? null,
        currentHabits: body.currentHabits ?? null,
        sleepPattern: body.sleepPattern ?? null,
        healthStatus: body.healthStatus ?? null,
        financeRange: body.financeRange ?? null,
        longtermGoals: body.longtermGoals ?? null,
        lifeConstraints: body.lifeConstraints ?? null,
        supportSystem: body.supportSystem ?? null,
        selfDescribed: body.selfDescribed ?? null,
      }).returning();
      return res.status(201).json({ profile: profile[0], created: true });
    }

    const updateData: any = { updatedAt: now };
    const allowed = [
      "mainGoal", "mainProblem", "workStudyStatus", "availableHoursPerDay",
      "strictnessPreference", "dailyRoutine", "weakPoints", "distractionTriggers",
      "currentHabits", "sleepPattern", "healthStatus", "financeRange",
      "longtermGoals", "lifeConstraints", "supportSystem", "selfDescribed",
      "onboardingStage", "quickStartDone", "standardDone", "deepDone",
      "currentArc", "arcSetAt", "arcXpSnapshot",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.improvementAreas !== undefined) {
      updateData.improvementAreas = JSON.stringify(body.improvementAreas);
    }
    if (body.areaConfidence !== undefined) {
      updateData.areaConfidence = JSON.stringify(body.areaConfidence);
    }

    const updated = await db.update(lifeProfilesTable).set(updateData).where(eq(lifeProfilesTable.userId, userId)).returning();
    return res.json({ profile: updated[0], created: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
