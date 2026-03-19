import { db, usersTable, rewardTransactionsTable, auditLogTable, missionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateId } from "./auth.js";

// XP required for each level = level * 100
export function xpForLevel(level: number): number {
  return level * 100;
}

export function calculateRewardPotential(priority: string, impactLevel: number, durationMinutes: number): number {
  const priorityMultiplier: Record<string, number> = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.5,
  };

  const base = Math.floor(durationMinutes / 10) * 10; // 10 coins per 10 minutes
  const priority_mult = priorityMultiplier[priority] ?? 1.0;
  const impact_mult = impactLevel / 5; // impact 1-10, normalized around 5

  return Math.floor(base * priority_mult * impact_mult);
}

export interface RewardInput {
  missionPriority: string;
  missionImpact: number;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  proofQuality: number;        // 0-1
  proofConfidence: number;     // 0-1
  blockedAttemptCount: number;
  strictnessMode: string;
  userTrustScore: number;
  currentStreak: number;
}

export function computeRewardCoins(input: RewardInput): { coins: number; multiplier: number } {
  const {
    missionPriority,
    missionImpact,
    targetDurationMinutes,
    actualDurationMinutes,
    proofQuality,
    proofConfidence,
    blockedAttemptCount,
    strictnessMode,
    userTrustScore,
    currentStreak,
  } = input;

  // Base from priority and impact
  const base = calculateRewardPotential(missionPriority, missionImpact, targetDurationMinutes);

  // Duration ratio (capped at 1.2 to prevent marathon padding)
  const durationRatio = Math.min(actualDurationMinutes / targetDurationMinutes, 1.2);

  // Proof quality factor (most important)
  const proofFactor = proofQuality * 0.7 + proofConfidence * 0.3;

  // Distraction penalty
  const distractionPenalty = Math.max(0, 1 - blockedAttemptCount * 0.05);

  // Strictness bonus
  const strictnessBonus: Record<string, number> = { normal: 1.0, strict: 1.1, extreme: 1.2 };
  const strictBonus = strictnessBonus[strictnessMode] ?? 1.0;

  // Trust score factor
  const trustFactor = Math.max(0.5, Math.min(1.5, userTrustScore));

  // Streak bonus (max 20% at streak 10+)
  const streakBonus = Math.min(1.2, 1 + (currentStreak * 0.02));

  const multiplier = durationRatio * proofFactor * distractionPenalty * strictBonus * trustFactor * streakBonus;
  const coins = Math.max(0, Math.round(base * multiplier));

  return { coins, multiplier: Math.round(multiplier * 100) / 100 };
}

export async function grantReward(
  userId: string,
  coins: number,
  xpAmount: number,
  reason: string,
  missionId?: string,
  proofId?: string,
  actorId?: string
): Promise<void> {
  // Update user balance
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const newBalance = user[0].coinBalance + coins;
  const newXp = user[0].xp + xpAmount;
  const xpNeeded = xpForLevel(user[0].level);
  const newLevel = newXp >= xpNeeded ? user[0].level + 1 : user[0].level;
  const finalXp = newXp >= xpNeeded ? newXp - xpNeeded : newXp;

  await db.update(usersTable).set({
    coinBalance: newBalance,
    xp: finalXp,
    level: newLevel,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  // Record transaction
  await db.insert(rewardTransactionsTable).values({
    id: generateId(),
    userId,
    type: "earned",
    amount: coins,
    reason,
    missionId: missionId ?? null,
    proofId: proofId ?? null,
  });

  // Audit log
  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: actorId ?? null,
    actorRole: actorId ? "system" : "system",
    action: "reward_granted",
    targetId: userId,
    targetType: "user",
    details: JSON.stringify({ coins, xp: xpAmount, reason, missionId, proofId }),
  });
}

export async function updateStreak(userId: string): Promise<void> {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = user[0].lastStreakDate;

  if (lastDate === today) return; // Already counted today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastDate === yesterday ? user[0].currentStreak + 1 : 1;
  const longestStreak = Math.max(user[0].longestStreak, newStreak);

  await db.update(usersTable).set({
    currentStreak: newStreak,
    longestStreak,
    lastStreakDate: today,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));
}
