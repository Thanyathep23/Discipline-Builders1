import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface PrestigeTierDef {
  tier: number;
  label: string;
  title: string;
  description: string;
  minTotalXp: number;
  minMasterySkills: number;
  borderColor: string;
}

export const PRESTIGE_TIERS: PrestigeTierDef[] = [
  {
    tier: 1,
    label: "Ascension I",
    title: "Ascendant",
    description: "You have sustained real growth across your skills. You are entering a higher chapter.",
    minTotalXp: 3000,
    minMasterySkills: 1,
    borderColor: "#9C27B0",
  },
  {
    tier: 2,
    label: "Ascension II",
    title: "Apex Operator",
    description: "Multiple skills have reached mastery. You are operating at an advanced level.",
    minTotalXp: 10000,
    minMasterySkills: 2,
    borderColor: "#F5C842",
  },
  {
    tier: 3,
    label: "Ascension III",
    title: "Legion Elite",
    description: "Rare. Three or more skills at mastery. Long-term sustained excellence.",
    minTotalXp: 25000,
    minMasterySkills: 3,
    borderColor: "#F44336",
  },
];

export interface PrestigeState {
  currentTier: number;
  currentLabel: string | null;
  currentTitle: string | null;
  currentBorderColor: string | null;
  isEligible: boolean;
  nextTier: PrestigeTierDef | null;
  readinessScore: number;
  readinessSummary: string;
  blockers: string[];
}

export function computePrestigeState(
  totalXpAcrossSkills: number,
  masterySkillCount: number,
  currentPrestigeTier: number,
): PrestigeState {
  const currentDef = PRESTIGE_TIERS.find((t) => t.tier === currentPrestigeTier) ?? null;
  const nextDef = PRESTIGE_TIERS.find((t) => t.tier === currentPrestigeTier + 1) ?? null;

  if (!nextDef) {
    return {
      currentTier: currentPrestigeTier,
      currentLabel: currentDef?.label ?? null,
      currentTitle: currentDef?.title ?? null,
      currentBorderColor: currentDef?.borderColor ?? null,
      isEligible: false,
      nextTier: null,
      readinessScore: 100,
      readinessSummary: "Maximum prestige reached. You are in the highest league.",
      blockers: [],
    };
  }

  const blockers: string[] = [];

  const xpPct = Math.min(1, totalXpAcrossSkills / nextDef.minTotalXp);
  if (totalXpAcrossSkills < nextDef.minTotalXp) {
    const needed = nextDef.minTotalXp - totalXpAcrossSkills;
    blockers.push(`${needed.toLocaleString()} more total XP needed`);
  }

  if (masterySkillCount < nextDef.minMasterySkills) {
    const needed = nextDef.minMasterySkills - masterySkillCount;
    blockers.push(`${needed} more skill${needed > 1 ? "s" : ""} must reach Mastery I`);
  }

  const masteryPct = Math.min(1, masterySkillCount / nextDef.minMasterySkills);
  const readinessScore = Math.round((xpPct * 0.5 + masteryPct * 0.5) * 100);
  const isEligible = blockers.length === 0;

  const readinessSummary = isEligible
    ? `You are eligible for ${nextDef.label}. Your sustained progress qualifies you for the next chapter.`
    : `${readinessScore}% ready for ${nextDef.label}.`;

  return {
    currentTier: currentPrestigeTier,
    currentLabel: currentDef?.label ?? null,
    currentTitle: currentDef?.title ?? null,
    currentBorderColor: currentDef?.borderColor ?? null,
    isEligible,
    nextTier: nextDef,
    readinessScore,
    readinessSummary,
    blockers,
  };
}

export async function checkAndGrantPrestige(
  userId: string,
  totalXpAcrossSkills: number,
  masterySkillCount: number,
  currentPrestigeTier: number,
): Promise<{ upgraded: boolean; newTier: number }> {
  const nextDef = PRESTIGE_TIERS.find((t) => t.tier === currentPrestigeTier + 1);
  if (!nextDef) return { upgraded: false, newTier: currentPrestigeTier };

  const meetsXp = totalXpAcrossSkills >= nextDef.minTotalXp;
  const meetsMastery = masterySkillCount >= nextDef.minMasterySkills;

  if (!meetsXp || !meetsMastery) return { upgraded: false, newTier: currentPrestigeTier };

  await db
    .update(usersTable)
    .set({ prestigeTier: nextDef.tier, prestigeReadyAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, userId));

  return { upgraded: true, newTier: nextDef.tier };
}
