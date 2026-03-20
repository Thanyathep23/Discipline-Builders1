import { Router } from "express";
import { db, lifeProfilesTable, aiMissionsTable, aiMissionVariantsTable, missionAcceptanceEventsTable, missionProofRequirementsTable, missionsTable, userSkillsTable, userQuestChainsTable } from "@workspace/db";
import { eq, and, desc, count, gte } from "drizzle-orm";
import { generateMissionsWithAI } from "../lib/mission-generator.js";
import { resolveArcWithEvidenceGating } from "../lib/arc-resolver.js";
import { requireAuth } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";
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
import { computeAdaptiveChallenge } from "../lib/adaptive-challenge.js";
import {
  getActiveChain,
  selectChainForUser,
  createChain,
  getChainStepMission,
  getChainById,
  advanceChainStep,
} from "../lib/quest-chains.js";

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

    // Pacing guard: if user already has ≥4 pending AI missions, return them instead of generating more
    const [{ pendingCount }] = await db
      .select({ pendingCount: count() })
      .from(aiMissionsTable)
      .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, "pending")));
    if (Number(pendingCount) >= 4) {
      const existing = await db
        .select()
        .from(aiMissionsTable)
        .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, "pending")))
        .orderBy(desc(aiMissionsTable.createdAt))
        .limit(10);
      return res.json({ missions: existing, gmNote: "You still have open directives — review them before requesting new ones.", skippedGeneration: true });
    }

    const [profile] = await db.select().from(lifeProfilesTable).where(eq(lifeProfilesTable.userId, userId)).limit(1);
    const missionCount = Math.min(parseInt(req.body?.count ?? "5"), 10);

    const skillRows = await db.select().from(userSkillsTable).where(eq(userSkillsTable.userId, userId));
    const skillLevels: Record<string, number> = {};
    for (const row of skillRows) skillLevels[row.skillId] = row.level;

    const arcXpSnapshot: Record<string, number> = JSON.parse(profile?.arcXpSnapshot ?? "{}");
    const arcSkillsInput = skillRows.map((r) => ({
      skillId: r.skillId,
      level: r.level,
      xp: r.xp,
      totalXpEarned: r.totalXpEarned,
    }));
    const { arc: currentArc } = resolveArcWithEvidenceGating(
      arcSkillsInput,
      profile?.currentArc ?? null,
      arcXpSnapshot,
    );

    const [challengeProfile, activeChain] = await Promise.all([
      computeAdaptiveChallenge(userId),
      getActiveChain(userId),
    ]);

    const sortedByLevel = Object.entries(skillLevels).sort((a, b) => a[1] - b[1]);
    const weakSkillIds = sortedByLevel.slice(0, 2).map(([k]) => k);

    const chainCandidate = selectChainForUser(weakSkillIds, activeChain);
    let newChain: typeof userQuestChainsTable.$inferSelect | null = null;
    if (chainCandidate && missionCount >= 3) {
      newChain = await createChain(userId, chainCandidate.id, randomUUID());
    }
    const effectiveChain = newChain ?? activeChain;

    const generated = await generateMissionsWithAI(profile ?? {}, skillLevels, missionCount, currentArc, challengeProfile);

    const now = new Date();
    const expiryAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const inserted: any[] = [];
    const chainDef = effectiveChain ? getChainById(effectiveChain.chainId) : null;
    let chainStepOffset = effectiveChain?.currentStep ?? 0;

    for (let i = 0; i < generated.length; i++) {
      const m = generated[i];
      const id = randomUUID();

      let chainId: string | null = null;
      let chainStep: number | null = null;
      let chainTitle = m.title;
      let chainDesc = m.description;
      let chainReason = m.reason;
      let chainProofTier = m.proofDifficultyTier;
      let chainRubric = m.reviewRubricSummary;
      let chainDuration = m.estimatedDurationMinutes;
      let chainDiffColor = m.difficultyColor;
      let chainRewardBonus = m.suggestedRewardBonus;
      let chainCategory = m.missionCategory;
      let chainIsStretch = m.isStretch;

      if (effectiveChain && chainDef) {
        const stepIdx = chainStepOffset + i;
        const chainStep_ = getChainStepMission(chainDef, stepIdx);
        if (chainStep_ && stepIdx < chainDef.totalSteps) {
          chainId = effectiveChain.id;
          chainStep = chainStep_.step;
          chainTitle = chainStep_.title;
          chainDesc = chainStep_.description;
          chainReason = chainStep_.reason;
          chainProofTier = chainStep_.proofDifficultyTier;
          chainRubric = chainStep_.reviewRubricSummary;
          chainDuration = chainStep_.estimatedDurationMinutes;
          chainDiffColor = chainStep_.difficultyColor;
          chainRewardBonus = chainStep_.suggestedRewardBonus;
          chainCategory = chainStep_.missionCategory;
          chainIsStretch = chainStep_.isStretch;
        }
      }

      const [row] = await db
        .insert(aiMissionsTable)
        .values({
          id,
          userId,
          title: chainTitle,
          description: chainDesc,
          reason: chainReason,
          relatedSkill: m.relatedSkill,
          difficultyColor: chainDiffColor as any,
          estimatedDurationMinutes: chainDuration,
          recommendedProofTypes: JSON.stringify(m.recommendedProofTypes),
          suggestedRewardBonus: chainRewardBonus,
          missionCategory: chainCategory as any,
          isStretch: chainIsStretch,
          expiryAt,
          status: "pending",
          generatedBy: "ai",
          rarity: m.rarity ?? "normal",
          chainId,
          chainStep,
          adaptiveDifficultyScore: challengeProfile.adaptiveDifficultyScore,
        })
        .returning();

      await db.insert(missionProofRequirementsTable).values({
        id: randomUUID(),
        missionId: id,
        acceptedProofTypes: JSON.stringify(m.recommendedProofTypes),
        minimumProofCount: 1,
        proofDifficultyTier: chainProofTier,
        fraudRiskLevel: chainIsStretch ? "medium" : "low",
        reviewRubricSummary: chainRubric,
      });

      const easierVariant = makeVariant(id, "easier", { ...m, title: chainTitle, description: chainDesc, difficultyColor: chainDiffColor, estimatedDurationMinutes: chainDuration });
      const harderVariant = makeVariant(id, "harder", { ...m, title: chainTitle, description: chainDesc, difficultyColor: chainDiffColor, estimatedDurationMinutes: chainDuration });
      await db.insert(aiMissionVariantsTable).values([easierVariant, harderVariant]);

      inserted.push({
        ...row,
        proofRequirements: { ...m, proofDifficultyTier: chainProofTier, reviewRubricSummary: chainRubric },
        variants: [easierVariant, harderVariant],
        chainName: effectiveChain?.chainName ?? null,
        chainTotalSteps: effectiveChain?.totalSteps ?? null,
        chainCompletionBonus: effectiveChain?.completionBonusCoins ?? null,
      });
    }

    const profileForBriefing = profile ? {
      mainGoal: profile.mainGoal ?? undefined,
      strictnessPreference: profile.strictnessPreference ?? undefined,
    } : undefined;
    const gmNote = getMissionBriefing(missionCount, weakSkillIds, profileForBriefing);

    trackEvent(Events.AI_MISSION_SHOWN, userId, { count: inserted.length }).catch(() => {});

    return res.json({
      missions: inserted,
      gmNote,
      challengeProfile: {
        recentCompletionRate: challengeProfile.recentCompletionRate,
        avgProofQuality: challengeProfile.avgProofQuality,
        recentStreak: challengeProfile.recentStreak,
        isOverloaded: challengeProfile.isOverloaded,
        adaptiveDifficultyScore: challengeProfile.adaptiveDifficultyScore,
        rarityTrigger: challengeProfile.rarityTrigger,
      },
      activeChain: effectiveChain ? {
        id: effectiveChain.id,
        chainName: effectiveChain.chainName,
        relatedSkill: effectiveChain.relatedSkill,
        currentStep: effectiveChain.currentStep,
        totalSteps: effectiveChain.totalSteps,
        completionBonusCoins: effectiveChain.completionBonusCoins,
        status: effectiveChain.status,
      } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/daily", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const since3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [recentMissions, last7dMissions, pendingAiMissions] = await Promise.all([
      db.select({ status: missionsTable.status, createdAt: missionsTable.createdAt, updatedAt: missionsTable.updatedAt })
        .from(missionsTable)
        .where(and(eq(missionsTable.userId, userId), gte(missionsTable.updatedAt, since3d)))
        .orderBy(desc(missionsTable.updatedAt))
        .limit(20),
      db.select({ status: missionsTable.status })
        .from(missionsTable)
        .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, since7d))),
      db.select({ id: aiMissionsTable.id })
        .from(aiMissionsTable)
        .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, "pending")))
        .limit(10),
    ]);

    const completedRecent = recentMissions.filter((m) => m.status === "completed");
    const abandonedRecent = recentMissions.filter((m) => m.status === "archived");
    const total7d = last7dMissions.length;
    const completed7d = last7dMissions.filter((m) => m.status === "completed").length;
    const completionRate7d = total7d > 0 ? completed7d / total7d : null;

    // Days since last completed mission
    const lastCompleted = completedRecent[0]?.updatedAt ?? null;
    const daysSinceLast = lastCompleted
      ? Math.floor((now.getTime() - new Date(lastCompleted).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    type EngagementState = "comeback" | "overloaded" | "active" | "fresh";
    let state: EngagementState;
    let message: string;
    let suggestedAction: string;

    if (daysSinceLast === null || daysSinceLast > 3) {
      state = "comeback";
      message = "Welcome back. One small step re-activates the system.";
      suggestedAction = "generate_easy";
    } else if (completionRate7d !== null && completionRate7d < 0.25 && abandonedRecent.length >= 2) {
      state = "overloaded";
      message = "You've been pushing hard. Let's dial back and rebuild momentum.";
      suggestedAction = "generate_easy";
    } else if (pendingAiMissions.length >= 4) {
      state = "active";
      message = "You have open directives waiting. Complete one before requesting more.";
      suggestedAction = "review_pending";
    } else {
      state = "active";
      message = daysSinceLast === 0
        ? "You're in the system. Keep the chain alive."
        : "Time to stack another rep. What's next?";
      suggestedAction = "generate_normal";
    }

    return res.json({
      state,
      message,
      suggestedAction,
      daysSinceLast,
      completionRate7d,
      pendingMissionCount: pendingAiMissions.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/chains/active", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const chain = await getActiveChain(userId);
    if (!chain) return res.json({ chain: null });
    const def = getChainById(chain.chainId);
    return res.json({
      chain: {
        ...chain,
        steps: def?.steps ?? [],
        theme: def?.theme ?? null,
      },
    });
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

      const rarityBonusCoins = mission.rarity === "breakthrough" ? 50 : mission.rarity === "rare" ? 20 : 0;
      const rewardPotential = 50 + mission.suggestedRewardBonus + rarityBonusCoins;

      const [newMission] = await db
        .insert(missionsTable)
        .values({
          id: randomUUID(),
          userId,
          title: mission.title,
          description: mission.description,
          category: mission.relatedSkill.charAt(0).toUpperCase() + mission.relatedSkill.slice(1),
          targetDurationMinutes: mission.estimatedDurationMinutes,
          priority: mission.isStretch || mission.rarity === "breakthrough" ? "high" : "medium",
          impactLevel: mission.rarity === "breakthrough" ? 9 : mission.isStretch ? 8 : 6,
          purpose: mission.reason,
          requiredProofTypes: proofTypes,
          status: "active",
          rewardPotential,
          source: "ai_generated",
          aiMissionId: missionId,
          relatedSkill: mission.relatedSkill,
          difficultyColor: mission.difficultyColor,
          rarity: mission.rarity ?? "normal",
          chainId: mission.chainId ?? null,
          chainStep: mission.chainStep ?? null,
          rarityBonusCoins,
        })
        .returning();

      await db
        .update(aiMissionsTable)
        .set({ status: "accepted", acceptedMissionId: newMission.id, updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));

      try {
        const { awardBadge, awardTitle, recordMilestone } = await import("./inventory.js");
        const [{ value: aiAcceptedCount }] = await db.select({ value: count() })
          .from(aiMissionsTable)
          .where(and(eq(aiMissionsTable.userId, userId), eq(aiMissionsTable.status, "accepted")));
        if (Number(aiAcceptedCount) === 1) {
          await awardBadge(userId, "badge-first-ai-mission");
          await recordMilestone(userId, "first_ai_mission_accepted");
        }
        if (Number(aiAcceptedCount) >= 3) {
          await awardTitle(userId, "title-grind-architect");
        }
      } catch {}

      trackEvent(Events.AI_MISSION_ACCEPTED, userId, { missionId, relatedSkill: mission.relatedSkill }).catch(() => {});
      const gmNote = getAcceptNote(mission);
      return res.json({
        status: "accepted",
        mission: newMission,
        gmNote,
        chainInfo: mission.chainId ? {
          chainId: mission.chainId,
          chainStep: mission.chainStep,
          rarity: mission.rarity,
        } : null,
      });
    }

    if (action === "rejected") {
      await db
        .update(aiMissionsTable)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));
      trackEvent(Events.AI_MISSION_REJECTED, userId, { missionId }).catch(() => {});
      const gmNote = getRejectNote(mission);
      return res.json({ status: "rejected", gmNote });
    }

    if (action === "not_now") {
      await db
        .update(aiMissionsTable)
        .set({ status: "not_now", updatedAt: new Date() })
        .where(eq(aiMissionsTable.id, missionId));
      trackEvent(Events.AI_MISSION_NOT_NOW, userId, { missionId }).catch(() => {});
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
