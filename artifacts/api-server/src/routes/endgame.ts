import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import {
  db,
  userSkillsTable,
  usersTable,
  lifeProfilesTable,
  CYCLE_DEFINITIONS,
  type CycleType,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getMasteryState } from "../lib/mastery-engine.js";
import { computePrestigeState, checkAndGrantPrestige } from "../lib/prestige-engine.js";
import { computeArcStage } from "../lib/arc-resolver.js";
import { getCycleState, startCycleForUser, suggestCycleType } from "../lib/cycle-engine.js";
import { getUserSkills } from "../lib/skill-engine.js";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!userRow) return res.status(404).json({ error: "User not found" });

    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);

    const skills = await getUserSkills(userId);

    const totalXpAcrossSkills = skills.reduce((s, sk) => s + sk.totalXpEarned, 0);
    const masteryStates = skills.map((sk) =>
      getMasteryState(sk.skillId, sk.level, sk.totalXpEarned, sk.confidenceScore ?? 0.1, sk.masteryTier ?? 0),
    );
    const masterySkillCount = masteryStates.filter((m) => m.masteryTier >= 1).length;

    const prestigeState = computePrestigeState(
      totalXpAcrossSkills,
      masterySkillCount,
      userRow.prestigeTier ?? 0,
    );

    if (prestigeState.isEligible && (userRow.prestigeTier ?? 0) < (prestigeState.nextTier?.tier ?? 0)) {
      await checkAndGrantPrestige(userId, totalXpAcrossSkills, masterySkillCount, userRow.prestigeTier ?? 0).catch(() => {});
    }

    const arcStageXpSnapshot: Record<string, number> = JSON.parse(profile?.arcStageXpSnapshot ?? "{}");

    if (!profile?.arcStage || Object.keys(arcStageXpSnapshot).length === 0) {
      const currentXpMap: Record<string, number> = {};
      for (const sk of skills) currentXpMap[sk.skillId] = sk.totalXpEarned;
      await db
        .update(lifeProfilesTable)
        .set({ arcStageXpSnapshot: JSON.stringify(currentXpMap), updatedAt: new Date() })
        .where(eq(lifeProfilesTable.userId, userId))
        .catch(() => {});
    }

    const arcStageResult = computeArcStage(totalXpAcrossSkills, arcStageXpSnapshot);

    if (arcStageResult.stage !== (profile?.arcStage ?? "beginning")) {
      await db
        .update(lifeProfilesTable)
        .set({ arcStage: arcStageResult.stage, updatedAt: new Date() })
        .where(eq(lifeProfilesTable.userId, userId))
        .catch(() => {});
    }

    const cycleState = await getCycleState(userId);

    const weakSkill = [...skills].sort((a, b) => a.level - b.level)[0];
    const suggestedCycleType = weakSkill ? suggestCycleType(weakSkill.skillId) : "focus_season";
    const suggestedCycleDef = CYCLE_DEFINITIONS[suggestedCycleType];

    const nextHorizonItems: Array<{ type: string; label: string; description: string; urgency: "high" | "medium" | "low" }> = [];

    const closestMastery = masteryStates
      .filter((m) => m.nextTier !== null && m.progressToNext !== null)
      .sort((a, b) => {
        const aAvg = ((a.progressToNext?.levelPct ?? 0) + (a.progressToNext?.xpPct ?? 0) + (a.progressToNext?.confidencePct ?? 0)) / 3;
        const bAvg = ((b.progressToNext?.levelPct ?? 0) + (b.progressToNext?.xpPct ?? 0) + (b.progressToNext?.confidencePct ?? 0)) / 3;
        return bAvg - aAvg;
      })[0];

    if (closestMastery) {
      const avg = Math.round(((closestMastery.progressToNext?.levelPct ?? 0) + (closestMastery.progressToNext?.xpPct ?? 0) + (closestMastery.progressToNext?.confidencePct ?? 0)) / 3);
      nextHorizonItems.push({
        type: "mastery",
        label: `Next: ${closestMastery.nextTierLabel} in ${closestMastery.skillId}`,
        description: `${avg}% of the way to your next mastery tier in ${closestMastery.skillId}.`,
        urgency: avg >= 70 ? "high" : avg >= 40 ? "medium" : "low",
      });
    }

    if (!prestigeState.isEligible && prestigeState.nextTier) {
      nextHorizonItems.push({
        type: "prestige",
        label: `Prestige: ${prestigeState.nextTier.label}`,
        description: prestigeState.readinessSummary,
        urgency: prestigeState.readinessScore >= 70 ? "high" : prestigeState.readinessScore >= 40 ? "medium" : "low",
      });
    }

    if (arcStageResult.nextStage) {
      nextHorizonItems.push({
        type: "arc_stage",
        label: `Arc ${arcStageResult.nextStage}: ${arcStageResult.nextStage.charAt(0).toUpperCase() + arcStageResult.nextStage.slice(1)}`,
        description: `${arcStageResult.nextStageXpRequired} XP needed to reach the ${arcStageResult.nextStage} stage of your arc.`,
        urgency: arcStageResult.progressToNextPct >= 70 ? "high" : "medium",
      });
    }

    if (cycleState.activeCycle && cycleState.cycleDefinition) {
      nextHorizonItems.push({
        type: "cycle",
        label: `Cycle: ${cycleState.cycleDefinition.label}`,
        description: `${cycleState.activeCycle.progressCount}/${cycleState.activeCycle.targetCount} complete — ${cycleState.daysRemaining} days left.`,
        urgency: (cycleState.daysRemaining ?? 99) <= 5 ? "high" : "medium",
      });
    }

    return res.json({
      mastery: masteryStates,
      prestige: prestigeState,
      arcStage: arcStageResult,
      currentArc: profile?.currentArc ?? null,
      cycle: {
        ...cycleState,
        suggestedCycleType,
        suggestedCycleLabel: suggestedCycleDef.label,
        availableCycleTypes: Object.entries(CYCLE_DEFINITIONS).map(([type, def]) => ({
          type,
          label: def.label,
          description: def.description,
          durationDays: def.durationDays,
          targetCount: def.targetCount,
          skillId: def.skillId,
          icon: def.icon,
          color: def.color,
        })),
      },
      nextHorizon: nextHorizonItems.slice(0, 4),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/cycles/start", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { cycleType } = req.body;
    const validTypes: CycleType[] = ["focus_season", "recovery_sprint", "trading_cycle", "learning_sprint"];
    if (!validTypes.includes(cycleType)) {
      return res.status(400).json({ error: "Invalid cycle type" });
    }
    const cycle = await startCycleForUser(userId, cycleType as CycleType);
    return res.json({ cycle, message: "Cycle started." });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
