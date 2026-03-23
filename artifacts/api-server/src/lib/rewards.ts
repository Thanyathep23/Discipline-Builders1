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

export interface ComputeRewardInput extends RewardInput {
  missionValueScore?: number;
  rewardMultiplier?: number;
  distractionCount?: number;
}

export function computeRewardCoins(input: ComputeRewardInput): { coins: number; xp: number; multiplier: number } {
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
    missionValueScore,
    rewardMultiplier: aiRewardMult,
    distractionCount,
  } = input;

  const base = missionValueScore
    ? missionValueScore * 10
    : calculateRewardPotential(missionPriority, missionImpact, targetDurationMinutes);

  const qualityFactor = proofQuality * 0.7 + proofConfidence * 0.3;

  const distractions = distractionCount ?? blockedAttemptCount;
  let distractionPenalty: number;
  if (distractions === 0) {
    distractionPenalty = 1.1;
  } else if (distractions <= 2) {
    distractionPenalty = 1.0;
  } else if (distractions <= 5) {
    distractionPenalty = 0.85;
  } else {
    distractionPenalty = 0.70;
  }

  const strictnessBonus: Record<string, number> = { normal: 1.0, strict: 1.1, extreme: 1.2 };
  const strictBonus = strictnessBonus[strictnessMode] ?? 1.0;

  const trustFactor = Math.max(0.5, Math.min(1.5, userTrustScore));

  const streakBonus = Math.min(1.2, 1 + (currentStreak * 0.02));

  const aiMult = aiRewardMult ?? 1.0;

  const multiplier = qualityFactor * distractionPenalty * strictBonus * trustFactor * streakBonus * aiMult;
  const coins = Math.max(0, Math.round(base * multiplier));

  const xp = Math.max(coins > 0 ? 10 : 1, Math.round(coins / 5));

  return { coins, xp, multiplier: Math.round(multiplier * 100) / 100 };
}

export function computeRarityBonus(rarity: string | null | undefined): number {
  if (rarity === "breakthrough") return 30;
  if (rarity === "rare") return 12;
  return 0;
}

export function computeAdaptiveDifficultyBonus(difficultyColor: string | null | undefined): number {
  const bonuses: Record<string, number> = {
    gray: 0, green: 0, blue: 5, purple: 12, gold: 20, red: 30,
  };
  return bonuses[difficultyColor ?? "green"] ?? 0;
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

  await db.transaction(async (tx) => {
    const user = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user[0]) return;

    const newBalance = user[0].coinBalance + coins;
    const newXp = user[0].xp + xpAmount;
    const xpNeeded = xpForLevel(user[0].level);
    const leveledUp = newXp >= xpNeeded;
    const newLevel = leveledUp ? user[0].level + 1 : user[0].level;
    const finalXp = leveledUp ? newXp - xpNeeded : newXp;

    await tx.update(usersTable).set({
      coinBalance: newBalance,
      xp: finalXp,
      level: newLevel,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    await tx.insert(rewardTransactionsTable).values({
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

    await tx.insert(auditLogTable).values({
      id: generateId(),
      actorId: opts.actorId ?? null,
      actorRole: opts.actorId ? "admin" : "system",
      action: "reward_granted",
      targetId: userId,
      targetType: "user",
      details: JSON.stringify({ coins, xp: xpAmount, reason, leveledUp, newLevel, ...opts }),
    });
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

  // Wrap all penalty writes in a single transaction for consistency
  await db.transaction(async (tx) => {
    const user = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user[0]) return;

    const newBalance = Math.max(0, user[0].coinBalance - coinsDeducted);
    const newXp = Math.max(0, user[0].xp - xpDeducted);

    await tx.update(usersTable).set({
      coinBalance: newBalance,
      xp: newXp,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    const penaltyId = generateId();
    await tx.insert(penaltiesTable).values({
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
      await tx.insert(rewardTransactionsTable).values({
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

    await tx.insert(auditLogTable).values({
      id: generateId(),
      actorId: null,
      actorRole: "system",
      action: "system_penalty_applied",
      targetId: userId,
      targetType: "user",
      details: JSON.stringify({ coinsDeducted, xpDeducted, reason, description, ...opts }),
    });
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
