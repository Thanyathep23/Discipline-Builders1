import { db, userSkillsTable, MASTERY_TIERS, computeMasteryTier } from "@workspace/db";
import type { SkillId } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface MasteryState {
  skillId: string;
  masteryTier: number;
  masteryLabel: string | null;
  nextTier: number | null;
  nextTierLabel: string | null;
  nextTierRequirements: {
    level: number;
    totalXp: number;
    confidence: number;
  } | null;
  progressToNext: {
    levelPct: number;
    xpPct: number;
    confidencePct: number;
  } | null;
}

export function describeMastery(tier: number): string | null {
  return MASTERY_TIERS[tier]?.label ?? null;
}

export function getMasteryState(
  skillId: string,
  level: number,
  totalXpEarned: number,
  confidenceScore: number,
  currentMasteryTier: number,
): MasteryState {
  const computedTier = computeMasteryTier(level, totalXpEarned, confidenceScore);
  const tier = Math.max(currentMasteryTier, computedTier);
  const tierLabel = MASTERY_TIERS[tier]?.label ?? null;

  const nextTierDef = MASTERY_TIERS[tier + 1];
  if (!nextTierDef) {
    return {
      skillId,
      masteryTier: tier,
      masteryLabel: tierLabel,
      nextTier: null,
      nextTierLabel: null,
      nextTierRequirements: null,
      progressToNext: null,
    };
  }

  const levelPct   = Math.min(1, level           / nextTierDef.minLevel);
  const xpPct      = Math.min(1, totalXpEarned   / nextTierDef.minXp);
  const confPct    = Math.min(1, confidenceScore  / nextTierDef.minConfidence);

  return {
    skillId,
    masteryTier: tier,
    masteryLabel: tierLabel,
    nextTier: nextTierDef.tier,
    nextTierLabel: nextTierDef.label,
    nextTierRequirements: {
      level:      nextTierDef.minLevel,
      totalXp:    nextTierDef.minXp,
      confidence: nextTierDef.minConfidence,
    },
    progressToNext: {
      levelPct:      Math.round(levelPct  * 100),
      xpPct:         Math.round(xpPct     * 100),
      confidencePct: Math.round(confPct   * 100),
    },
  };
}

export async function checkAndGrantMastery(
  userId: string,
  skillId: SkillId,
  level: number,
  totalXpEarned: number,
  confidenceScore: number,
  currentMasteryTier: number,
): Promise<{ tieredUp: boolean; newTier: number }> {
  const newTier = computeMasteryTier(level, totalXpEarned, confidenceScore);
  if (newTier <= currentMasteryTier) {
    return { tieredUp: false, newTier: currentMasteryTier };
  }

  await db
    .update(userSkillsTable)
    .set({
      masteryTier: newTier,
      masteryUnlockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, skillId)));

  return { tieredUp: true, newTier };
}
