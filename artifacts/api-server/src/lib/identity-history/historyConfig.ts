import { HISTORY_VERSION, ImportanceLevel, MemoryBucket, HistorySubtype } from "./historyTypes.js";

export const HISTORY_CONFIG = {
  version: HISTORY_VERSION,

  levelMilestones: [5, 10, 15, 20, 25, 30, 40, 50, 75, 100],
  streakMilestones: [3, 7, 14, 30, 60, 100],
  proofQualityStreakMinimum: 5,
  trustStableMinDays: 14,
  comebackMinInactiveDays: 3,
  momentumRebuiltMinMissions: 3,

  snapshotTriggers: [
    HistorySubtype.FIRST_PROOF_APPROVED,
    HistorySubtype.FIRST_PURCHASE,
    HistorySubtype.LEVEL_MILESTONE,
    HistorySubtype.SKILL_RANK_UP,
    HistorySubtype.PRESTIGE_MILESTONE,
    HistorySubtype.COMEBACK_RETURN,
    HistorySubtype.STREAK_MILESTONE,
    HistorySubtype.ROOM_TRANSFORMATION,
    HistorySubtype.ARC_TRANSITION,
  ] as readonly HistorySubtype[],

  importanceRules: {
    [HistorySubtype.FIRST_MISSION]: ImportanceLevel.ICONIC,
    [HistorySubtype.FIRST_PROOF_APPROVED]: ImportanceLevel.ICONIC,
    [HistorySubtype.FIRST_REWARD]: ImportanceLevel.MAJOR,
    [HistorySubtype.FIRST_STREAK_3]: ImportanceLevel.MAJOR,
    [HistorySubtype.FIRST_STREAK_7]: ImportanceLevel.MAJOR,
    [HistorySubtype.FIRST_PURCHASE]: ImportanceLevel.ICONIC,
    [HistorySubtype.FIRST_EQUIP]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.FIRST_ROOM_ITEM]: ImportanceLevel.MAJOR,
    [HistorySubtype.FIRST_CAR]: ImportanceLevel.ICONIC,
    [HistorySubtype.FIRST_VISUAL_CHANGE]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.FIRST_COMEBACK]: ImportanceLevel.MAJOR,

    [HistorySubtype.LEVEL_MILESTONE]: ImportanceLevel.MAJOR,
    [HistorySubtype.SKILL_RANK_UP]: ImportanceLevel.MAJOR,
    [HistorySubtype.STREAK_MILESTONE]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.TRUST_IMPROVEMENT]: ImportanceLevel.CONTEXTUAL,
    [HistorySubtype.ARC_TRANSITION]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.PRESTIGE_MILESTONE]: ImportanceLevel.ICONIC,

    [HistorySubtype.STATUS_ITEM_ACQUIRED]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.ROOM_TRANSFORMATION]: ImportanceLevel.MAJOR,
    [HistorySubtype.WARDROBE_SET]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.CAR_UPGRADE]: ImportanceLevel.MAJOR,

    [HistorySubtype.COMEBACK_RETURN]: ImportanceLevel.MAJOR,
    [HistorySubtype.STREAK_RECOVERED]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.QUALITY_IMPROVEMENT]: ImportanceLevel.CONTEXTUAL,
    [HistorySubtype.MOMENTUM_REBUILT]: ImportanceLevel.MEANINGFUL,

    [HistorySubtype.CONSISTENCY_3D]: ImportanceLevel.CONTEXTUAL,
    [HistorySubtype.CONSISTENCY_7D]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.CONSISTENCY_14D]: ImportanceLevel.MAJOR,
    [HistorySubtype.CONSISTENCY_30D]: ImportanceLevel.ICONIC,
    [HistorySubtype.PROOF_QUALITY_STREAK]: ImportanceLevel.MEANINGFUL,
    [HistorySubtype.TRUST_STABLE]: ImportanceLevel.CONTEXTUAL,
  } as Record<HistorySubtype, ImportanceLevel>,

  memoryBucketRules: {
    [ImportanceLevel.ICONIC]: MemoryBucket.PERMANENT,
    [ImportanceLevel.MAJOR]: MemoryBucket.PERMANENT,
    [ImportanceLevel.MEANINGFUL]: MemoryBucket.LONG_TERM,
    [ImportanceLevel.CONTEXTUAL]: MemoryBucket.RECENT,
  } as Record<ImportanceLevel, MemoryBucket>,

  maxTimelineEntries: 100,
  maxRecentEntries: 20,
} as const;
