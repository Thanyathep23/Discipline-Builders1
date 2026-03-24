export const HISTORY_VERSION = "1.0.0" as const;

export const HistoryType = {
  FIRST: "first",
  GROWTH: "growth",
  STATUS: "status",
  RECOVERY: "recovery",
  CONSISTENCY: "consistency",
} as const;
export type HistoryType = (typeof HistoryType)[keyof typeof HistoryType];

export const HistorySubtype = {
  FIRST_MISSION: "first_mission",
  FIRST_PROOF_APPROVED: "first_proof_approved",
  FIRST_REWARD: "first_reward",
  FIRST_STREAK_3: "first_streak_3",
  FIRST_STREAK_7: "first_streak_7",
  FIRST_PURCHASE: "first_purchase",
  FIRST_EQUIP: "first_equip",
  FIRST_ROOM_ITEM: "first_room_item",
  FIRST_CAR: "first_car",
  FIRST_VISUAL_CHANGE: "first_visual_change",
  FIRST_COMEBACK: "first_comeback",

  LEVEL_MILESTONE: "level_milestone",
  SKILL_RANK_UP: "skill_rank_up",
  STREAK_MILESTONE: "streak_milestone",
  TRUST_IMPROVEMENT: "trust_improvement",
  ARC_TRANSITION: "arc_transition",
  PRESTIGE_MILESTONE: "prestige_milestone",

  STATUS_ITEM_ACQUIRED: "status_item_acquired",
  ROOM_TRANSFORMATION: "room_transformation",
  WARDROBE_SET: "wardrobe_set",
  CAR_UPGRADE: "car_upgrade",

  COMEBACK_RETURN: "comeback_return",
  STREAK_RECOVERED: "streak_recovered",
  QUALITY_IMPROVEMENT: "quality_improvement",
  MOMENTUM_REBUILT: "momentum_rebuilt",

  CONSISTENCY_3D: "consistency_3d",
  CONSISTENCY_7D: "consistency_7d",
  CONSISTENCY_14D: "consistency_14d",
  CONSISTENCY_30D: "consistency_30d",
  PROOF_QUALITY_STREAK: "proof_quality_streak",
  TRUST_STABLE: "trust_stable",
} as const;
export type HistorySubtype = (typeof HistorySubtype)[keyof typeof HistorySubtype];

export const ImportanceLevel = {
  ICONIC: "iconic",
  MAJOR: "major",
  MEANINGFUL: "meaningful",
  CONTEXTUAL: "contextual",
} as const;
export type ImportanceLevel = (typeof ImportanceLevel)[keyof typeof ImportanceLevel];

export const MemoryBucket = {
  PERMANENT: "permanent",
  LONG_TERM: "long_term",
  RECENT: "recent",
} as const;
export type MemoryBucket = (typeof MemoryBucket)[keyof typeof MemoryBucket];

export const EmotionalTone = {
  TRIUMPH: "triumph",
  PRIDE: "pride",
  GROWTH: "growth",
  RECOVERY: "recovery",
  STEADY: "steady",
  MILESTONE: "milestone",
} as const;
export type EmotionalTone = (typeof EmotionalTone)[keyof typeof EmotionalTone];

export interface IdentityHistoryEntry {
  id: string;
  userId: string;
  historyType: HistoryType;
  historySubtype: HistorySubtype;
  title: string;
  shortDescription: string;
  emotionalFrame: string;
  emotionalTone: EmotionalTone;
  primaryEntityType: string | null;
  primaryEntityId: string | null;
  eventTimestamp: string;
  recordedTimestamp: string;
  importanceLevel: ImportanceLevel;
  memoryBucket: MemoryBucket;
  snapshotData: IdentitySnapshot | null;
  linkedRewardId: string | null;
  sourceSystem: string;
  visibilityScope: "private" | "profile" | "showcase";
  version: string;
}

export interface IdentitySnapshot {
  level: number;
  totalXp: number;
  currentStreak: number;
  coinBalance: number;
  trustScore: number;
  skillSummary: { skillId: string; level: number; rank: string }[];
  ownedItemCount: number;
  equippedItemCount: number;
  prestigeTier: string | null;
  currentArc: string | null;
}

export interface TimelineEntry {
  id: string;
  title: string;
  subtext: string;
  timestamp: string;
  category: HistoryType;
  emotionalTone: EmotionalTone;
  importanceLevel: ImportanceLevel;
  hasSnapshot: boolean;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
}

export interface HistoryLogEntry {
  timestamp: string;
  userId: string;
  historyType: HistoryType;
  historySubtype: HistorySubtype;
  importanceLevel: ImportanceLevel;
  milestoneFamily: HistoryType;
  snapshotCreated: boolean;
  sourceEntityId: string | null;
  sourceSystem: string;
  version: string;
}
