import type { IdentitySnapshot } from "./historyTypes.js";
import { HISTORY_CONFIG } from "./historyConfig.js";
import type { HistorySubtype } from "./historyTypes.js";

export interface SnapshotInput {
  level: number;
  totalXp: number;
  currentStreak: number;
  coinBalance: number;
  trustScore: number;
  skills: { skillId: string; level: number; rank: string }[];
  ownedItemCount: number;
  equippedItemCount: number;
  prestigeTier: string | null;
  currentArc: string | null;
}

export function shouldCreateSnapshot(subtype: HistorySubtype): boolean {
  return (HISTORY_CONFIG.snapshotTriggers as readonly string[]).includes(subtype);
}

export function buildSnapshot(input: SnapshotInput): IdentitySnapshot {
  return {
    level: input.level,
    totalXp: input.totalXp,
    currentStreak: input.currentStreak,
    coinBalance: input.coinBalance,
    trustScore: input.trustScore,
    skillSummary: input.skills.map(s => ({
      skillId: s.skillId,
      level: s.level,
      rank: s.rank,
    })),
    ownedItemCount: input.ownedItemCount,
    equippedItemCount: input.equippedItemCount,
    prestigeTier: input.prestigeTier,
    currentArc: input.currentArc,
  };
}
