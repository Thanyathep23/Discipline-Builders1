import { db, usersTable, rewardTransactionsTable, auditLogTable, penaltiesTable } from "@workspace/db";
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

export function computeRewardCoins(input: RewardInput): { coins: number; xp: number; multiplier: number } {
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

  // XP is always earned relative to actual time (0.5 xp per minute, min 5)
  const xp = Math.max(5, Math.round(actualDurationMinutes * 0.5 * proofFactor * streakBonus));

  return { coins, xp, multiplier: Math.round(multiplier * 100) / 100 };
}

export async function grantReward(
  userId: string,
  coins: number,
  xpAmount: number,
  reason: string,
  options?: {
    missionId?: string;
    sessionId?: string;
    proofId?: string;
    actorId?: string;
    type?: "earned" | "bonus" | "admin_grant";
  }
): Promise<void> {
  const opts = options ?? {};

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const newBalance = user[0].coinBalance + coins;
  const newXp = user[0].xp + xpAmount;
  const xpNeeded = xpForLevel(user[0].level);
  const leveledUp = newXp >= xpNeeded;
  const newLevel = leveledUp ? user[0].level + 1 : user[0].level;
  const finalXp = leveledUp ? newXp - xpNeeded : newXp;

  await db.update(usersTable).set({
    coinBalance: newBalance,
    xp: finalXp,
    level: newLevel,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  // Record transaction with snapshot
  await db.insert(rewardTransactionsTable).values({
    id: generateId(),
    userId,
    type: opts.type ?? "earned",
    amount: coins,
    xpAmount,
    reason,
    missionId: opts.missionId ?? null,
    sessionId: opts.sessionId ?? null,
    proofId: opts.proofId ?? null,
    balanceAfter: newBalance,
  });

  // Audit log
  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: opts.actorId ?? null,
    actorRole: opts.actorId ? "admin" : "system",
    action: "reward_granted",
    targetId: userId,
    targetType: "user",
    details: JSON.stringify({ coins, xp: xpAmount, reason, leveledUp, newLevel, ...opts }),
  });
}

export async function applySystemPenalty(
  userId: string,
  coinsDeducted: number,
  xpDeducted: number,
  reason: "abandoned_session" | "blocked_attempt" | "failed_proof" | "missed_deadline" | "low_trust_score",
  description: string,
  options?: { sessionId?: string; missionId?: string; proofId?: string }
): Promise<void> {
  const opts = options ?? {};

  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) return;

  const newBalance = Math.max(0, user[0].coinBalance - coinsDeducted);
  const newXp = Math.max(0, user[0].xp - xpDeducted);

  await db.update(usersTable).set({
    coinBalance: newBalance,
    xp: newXp,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, userId));

  const penaltyId = generateId();
  await db.insert(penaltiesTable).values({
    id: penaltyId,
    userId,
    sessionId: opts.sessionId ?? null,
    missionId: opts.missionId ?? null,
    proofId: opts.proofId ?? null,
    reason,
    coinsDeducted,
    xpDeducted,
    description,
    appliedBy: null, // system
  });

  if (coinsDeducted > 0) {
    await db.insert(rewardTransactionsTable).values({
      id: generateId(),
      userId,
      type: "penalty",
      amount: -coinsDeducted,
      xpAmount: -xpDeducted,
      reason: `System penalty: ${description}`,
      sessionId: opts.sessionId ?? null,
      missionId: opts.missionId ?? null,
      penaltyId,
      balanceAfter: newBalance,
    });
  }

  await db.insert(auditLogTable).values({
    id: generateId(),
    actorId: null,
    actorRole: "system",
    action: "system_penalty_applied",
    targetId: userId,
    targetType: "user",
    details: JSON.stringify({ coinsDeducted, xpDeducted, reason, description, ...opts }),
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
