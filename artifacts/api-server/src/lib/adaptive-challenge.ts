import { db, missionsTable, proofSubmissionsTable, userSkillsTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";

export interface ChallengeProfile {
  targetDifficultyDelta: number;
  durationMultiplier: number;
  isOverloaded: boolean;
  recentCompletionRate: number;
  avgProofQuality: number;
  recentStreak: number;
  rarityTrigger: "none" | "rare" | "breakthrough";
  adaptiveDifficultyScore: number;
}

const DIFFICULTY_ORDER = ["gray", "green", "blue", "purple", "gold", "red"] as const;
type DifficultyColor = (typeof DIFFICULTY_ORDER)[number];

export function applyDifficultyDelta(
  base: DifficultyColor,
  delta: number,
): DifficultyColor {
  const idx = DIFFICULTY_ORDER.indexOf(base);
  const newIdx = Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, idx + delta));
  return DIFFICULTY_ORDER[newIdx];
}

export async function computeAdaptiveChallenge(userId: string): Promise<ChallengeProfile> {
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [recentMissions, recentProofs, skillRows] = await Promise.all([
    db
      .select({ status: missionsTable.status, source: missionsTable.source, createdAt: missionsTable.createdAt })
      .from(missionsTable)
      .where(and(eq(missionsTable.userId, userId), gte(missionsTable.createdAt, since14d)))
      .orderBy(desc(missionsTable.createdAt))
      .limit(20),

    db
      .select({ aiConfidenceScore: proofSubmissionsTable.aiConfidenceScore, status: proofSubmissionsTable.status, createdAt: proofSubmissionsTable.createdAt })
      .from(proofSubmissionsTable)
      .where(and(eq(proofSubmissionsTable.userId, userId), gte(proofSubmissionsTable.createdAt, since14d)))
      .orderBy(desc(proofSubmissionsTable.createdAt))
      .limit(10),

    db
      .select({ skillId: userSkillsTable.skillId, level: userSkillsTable.level, trend: userSkillsTable.currentTrend })
      .from(userSkillsTable)
      .where(eq(userSkillsTable.userId, userId)),
  ]);

  const totalMissions = recentMissions.length;
  const completedMissions = recentMissions.filter((m) => m.status === "completed").length;
  const abandonedMissions = recentMissions.filter((m) => m.status === "archived").length;

  const recentCompletionRate = totalMissions > 0 ? completedMissions / totalMissions : 0.5;
  const abandonmentRate = totalMissions > 0 ? abandonedMissions / totalMissions : 0;

  const approvedProofs = recentProofs.filter((p) => p.status === "approved" || p.status === "partial");
  const avgProofQuality = approvedProofs.length > 0
    ? approvedProofs.reduce((sum, p) => sum + (p.aiConfidenceScore ?? 0.5), 0) / approvedProofs.length
    : 0.5;

  const risingSkills = skillRows.filter((s) => s.trend === "rising").length;
  const fallingSkills = skillRows.filter((s) => s.trend === "falling").length;

  const recentStreak = computeRecentStreak(recentMissions);
  const isOverloaded = abandonmentRate > 0.4 || (recentCompletionRate < 0.3 && totalMissions >= 5);

  let targetDifficultyDelta = 0;
  if (recentCompletionRate >= 0.8 && avgProofQuality >= 0.75 && risingSkills >= 2) {
    targetDifficultyDelta = 1;
  } else if (recentCompletionRate >= 0.65 && avgProofQuality >= 0.65) {
    targetDifficultyDelta = 0;
  } else if (isOverloaded || recentCompletionRate < 0.35) {
    targetDifficultyDelta = -1;
  } else if (fallingSkills >= 3) {
    targetDifficultyDelta = -1;
  }

  let durationMultiplier = 1.0;
  if (isOverloaded) durationMultiplier = 0.75;
  else if (targetDifficultyDelta > 0) durationMultiplier = 1.15;

  const adaptiveDifficultyScore = Math.round(
    (recentCompletionRate * 40) +
    (avgProofQuality * 30) +
    (risingSkills / Math.max(skillRows.length, 1)) * 20 +
    (recentStreak / 7) * 10,
  );

  const rarityTrigger = computeRarityTrigger(
    recentStreak,
    recentCompletionRate,
    avgProofQuality,
    adaptiveDifficultyScore,
    completedMissions,
  );

  return {
    targetDifficultyDelta,
    durationMultiplier,
    isOverloaded,
    recentCompletionRate,
    avgProofQuality,
    recentStreak,
    rarityTrigger,
    adaptiveDifficultyScore: Math.min(100, Math.max(0, adaptiveDifficultyScore)),
  };
}

function computeRecentStreak(missions: Array<{ status: string; createdAt: Date }>): number {
  const completed = missions
    .filter((m) => m.status === "completed")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (completed.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < completed.length; i++) {
    const diff = completed[i - 1].createdAt.getTime() - completed[i].createdAt.getTime();
    if (diff < 2 * 24 * 60 * 60 * 1000) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeRarityTrigger(
  streak: number,
  completionRate: number,
  proofQuality: number,
  score: number,
  completedCount: number,
): "none" | "rare" | "breakthrough" {
  if (streak >= 7 && completionRate >= 0.75 && proofQuality >= 0.75 && score >= 75) {
    return "breakthrough";
  }
  if (streak >= 3 && completionRate >= 0.6 && proofQuality >= 0.6 && completedCount >= 3) {
    return "rare";
  }
  return "none";
}
