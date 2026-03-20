import { Router } from "express";
import { db, lifeProfilesTable, aiMissionsTable, aiMissionVariantsTable, missionAcceptanceEventsTable, missionProofRequirementsTable, missionsTable, userSkillsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { generateMissionsWithAI } from "../lib/mission-generator.js";
import { requireAuth } from "../lib/auth.js";
import { randomUUID } from "crypto";
import {
  getMissionBriefing,
  getAcceptNote,
  getRejectNote,
  getNotNowNote,
  getAskWhyNote,
  getMakeEasierNote,
  getMakeHarderNote,
} from "../lib/gameMaster.js";

const router = Router();

function makeVariant(
  originalId: string,
  variantType: "easier" | "harder",
  original: any,
): any {
  const factor = variantType === "easier" ? 0.65 : 1.4;
  const colorDown: Record<string, string> = { gray: "gray", green: "gray", blue: "green", purple: "blue", gold: "purple", red: "gold" };
  const colorUp:   Record<string, string> = { gray: "green", green: "blue", blue: "purple", purple: "gold", gold: "red", red: "red" };
  const newColor = variantType === "easier"
    ? (colorDown[original.difficultyColor] ?? "gray")
    : (colorUp[original.difficultyColor] ?? "red");

  return {
    id: randomUUID(),
    originalMissionId: originalId,
    variantType,
    title: variantType === "easier"
      ? `${original.title} — Scaled Down`
      : `${original.title} — Extended`,
    description: variantType === "easier"
      ? `Reduced scope: ${original.description}`
      : `Full depth: ${original.description} Push beyond the standard output.`,
    difficultyColor: newColor,
    estimatedDurationMinutes: Math.max(10, Math.round(original.estimatedDurationMinutes * factor)),
    reason: variantType === "easier"
      ? "Adjusted to match your current capacity. Some execution beats none."
      : "Escalated to stretch your current ceiling. Higher output, higher reward.",
  };
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    const missions = await db
      .select()
      .from(aiMissionsTable)
      .where(
        status
          ? and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, status as any))
          : eq(aiMissionsTable.userId, userId),
      )
      .orderBy(desc(aiMissionsTable.createdAt));
    return res.json({ missions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/generate", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const count = Math.min(parseInt(req.body?.count ?? "5"), 10);

    const skillRows = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    const skillLevels: Record<string, number> = {};
    for (const row of skillRows) skillLevels[row.skillId] = row.level;

    const generated = await generateMissionsWithAI(profile ?? {}, skillLevels, count);

    const now = new Date();
    const expiryAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const inserted: any[] = [];
    for (const m of generated) {
      const id = randomUUID();
      const [row] = await db
        .insert(aiMissionsTable)
        .values({
          id,
          userId,
          title: m.title,
          description: m.description,
          reason: m.reason,
          relatedSkill: m.relatedSkill,
          difficultyColor: m.difficultyColor as any,
          estimatedDurationMinutes: m.estimatedDurationMinutes,
          recommendedProofTypes: JSON.stringify(m.recommendedProofTypes),
          suggestedRewardBonus: m.suggestedRewardBonus,
          missionCategory: m.missionCategory as any,
          isStretch: m.isStretch,
          expiryAt,
          status: "pending",
          generatedBy: "ai",
        })
        .returning();

      await db.insert(missionProofRequirementsTable).values({
        id: randomUUID(),
        missionId: id,
        acceptedProofTypes: JSON.stringify(m.recommendedProofTypes),
        minimumProofCount: 1,
        proofDifficultyTier: m.proofDifficultyTier,
        fraudRiskLevel: m.isStretch ? "medium" : "low",
        reviewRubricSummary: m.reviewRubricSummary,
      });

      const easierVariant = makeVariant(id, "easier", m);
      const harderVariant = makeVariant(id, "harder", m);
      await db.insert(aiMissionVariantsTable).values([easierVariant, harderVariant]);

      inserted.push({ ...row, proofRequirements: { ...m }, variants: [easierVariant, harderVariant] });
    }

    // Detect weak skills from skill levels
    const sortedByLevel = Object.entries(skillLevels).sort((a, b) => a[1] - b[1]);
    const weakSkillIds = sortedByLevel.slice(0, 2).map(([k]) => k);
    const gmNote = getMissionBriefing(count, weakSkillIds, profile ?? undefined);

    return res.json({ missions: inserted, gmNote });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:missionId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { missionId } = req.params;
    const [mission] = await db
      .select()
      .from(aiMissionsTable)
      .where(and(eq(aiMissionsTable.id, missionId), eq(aiMissionsTable.userId, userId)))
      .limit(1);
    if (!mission) return res.status(404).json({ error: "Mission not found" });

    const [proofReq] = await db
      .select()
      .from(missionProofRequirementsTable)
      .where(eq(missionProofRequirementsTable.missionId, missionId))
      .limit(1);

    const variants = await db
      .select()
      .from(aiMissionVariantsTable)
      .where(eq(aiMissionVariantsTable.originalMissionId, missionId));

    return res.json({ mission, proofRequirements: proofReq ?? null, variants });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/:missionId/respond", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { missionId } = req.params;
    const { action, notes } = req.body as { action: string; notes?: string };

    const validActions = ["accepted", "rejected", "not_now", "make_easier", "make_harder", "ask_why"];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const [mission] = await db
      .select()
      .from(aiMissionsTable)
      .where(and(eq(aiMissionsTable.id, missionId), eq(aiMissionsTable.userId, userId)))
      .limit(1);
    if (!mission) return res.status(404).json({ error: "Mission not found" });

    await db.insert(missionAcceptanceEventsTable).values({
      id: randomUUID(),
      userId,
      missionId,
      action,
      notes: notes ?? null,
    });

    if (action === "accepted") {
      const proofReqs = await db
        .select()
        .from(missionProofRequirementsTable)
        .where(eq(missionProofRequirementsTable.missionId, missionId))
        .limit(1);
      const proofTypes = proofReqs[0]?.acceptedProofTypes ?? '["text"]';
      const rewardPotential = 50 + mission.suggestedRewardBonus;

      const [newMission] = await db
        .insert(missionsTable)
        .values({
          id: randomUUID(),
          userId,
          title: mission.title,
          description: mission.description,
          category: mission.relatedSkill.charAt(0).toUpperCase() + mission.relatedSkill.slice(1),
          targetDurationMinutes: mission.estimatedDurationMinutes,
          priority: mission.isStretch ? "high" : "medium",
          impactLevel: mission.isStretch ? 8 : 6,
          purpose: mission.reason,
          requiredProofTypes: proofTypes,
          status: "active",
          rewardPotential,
          source: "ai_generated",
          aiMissionId: missionId,
          relatedSkill: mission.relatedSkill,
          difficultyColor: mission.difficultyColor,
        })
        .returning();

      await db
        .update(aiMissionsTable)
        .set({ status: "accepted", acceptedMissionId: newMission.id, updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));

      const gmNote = getAcceptNote(mission);
      return res.json({ status: "accepted", mission: newMission, gmNote });
    }

    if (action === "rejected") {
      await db
        .update(aiMissionsTable)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));
      const gmNote = getRejectNote(mission);
      return res.json({ status: "rejected", gmNote });
    }

    if (action === "not_now") {
      await db
        .update(aiMissionsTable)
        .set({ status: "not_now", updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));
      const gmNote = getNotNowNote(mission);
      return res.json({ status: "not_now", gmNote });
    }

    if (action === "make_easier" || action === "make_harder") {
      const variantType = action === "make_easier" ? "easier" : "harder";
      const [variant] = await db
        .select()
        .from(aiMissionVariantsTable)
        .where(
          and(
            eq(aiMissionVariantsTable.originalMissionId, missionId),
            eq(aiMissionVariantsTable.variantType, variantType),
          ),
        )
        .limit(1);

      const gmNote = variantType === "easier"
        ? getMakeEasierNote(variant ?? { difficultyColor: "gray", estimatedDurationMinutes: 20 })
        : getMakeHarderNote(variant ?? { difficultyColor: "blue", estimatedDurationMinutes: 60 });

      return res.json({ status: action, variant: variant ?? null, gmNote });
    }

    if (action === "ask_why") {
      const gmNote = getAskWhyNote(mission);
      return res.json({
        status: "ask_why",
        reason: mission.reason,
        relatedSkill: mission.relatedSkill,
        missionCategory: mission.missionCategory,
        gmNote,
      });
    }

    return res.json({ status: action });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
