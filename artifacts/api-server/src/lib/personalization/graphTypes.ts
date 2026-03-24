export const GRAPH_VERSION = "1.0.0" as const;

export const DisciplineState = {
  UNSTABLE: "unstable",
  BUILDING: "building",
  CONSISTENT: "consistent",
  HIGHLY_CONSISTENT: "highly_consistent",
} as const;
export type DisciplineState = (typeof DisciplineState)[keyof typeof DisciplineState];

export const TrustProofState = {
  CLEAN_CONFIDENT: "clean_confident",
  NEEDS_BETTER_EVIDENCE: "needs_better_evidence",
  BORDERLINE_QUALITY: "borderline_quality",
  TRUST_SENSITIVE: "trust_sensitive",
} as const;
export type TrustProofState = (typeof TrustProofState)[keyof typeof TrustProofState];

export const MomentumState = {
  INACTIVE: "inactive",
  REACTIVATING: "reactivating",
  ACTIVE: "active",
  SURGING: "surging",
  STALLED_AFTER_SETBACK: "stalled_after_setback",
} as const;
export type MomentumState = (typeof MomentumState)[keyof typeof MomentumState];

export const ProgressionState = {
  EARLY_BUILD: "early_build",
  STEADY_GROWTH: "steady_growth",
  PLATEAU_RISK: "plateau_risk",
  ADVANCED_PUSH: "advanced_push",
} as const;
export type ProgressionState = (typeof ProgressionState)[keyof typeof ProgressionState];

export const EconomyState = {
  NO_FIRST_PURCHASE: "no_first_purchase",
  CAUTIOUS_SAVER: "cautious_saver",
  ACTIVE_SPENDER: "active_spender",
  STATUS_MOTIVATED: "status_motivated",
  UNDER_ENGAGED: "under_engaged",
} as const;
export type EconomyState = (typeof EconomyState)[keyof typeof EconomyState];

export const IdentityMotivation = {
  PROOF_FIRST: "proof_first",
  GROWTH_FIRST: "growth_first",
  STATUS_FIRST: "status_first",
  COMEBACK_FIRST: "comeback_first",
  CONSISTENCY_FIRST: "consistency_first",
} as const;
export type IdentityMotivation = (typeof IdentityMotivation)[keyof typeof IdentityMotivation];

export interface UserStateGraph {
  userId: string;
  graphVersion: string;
  stateSnapshotAt: string;
  disciplineState: DisciplineState;
  trustState: TrustProofState;
  momentumState: MomentumState;
  progressionState: ProgressionState;
  economyState: EconomyState;
  identityMotivation: IdentityMotivation;
  comebackState: ComebackState | null;
  confidenceFlags: ConfidenceFlags;
  rawSignals: GraphRawSignals;
}

export interface ComebackState {
  inactiveDays: number;
  comebackTier: "quick_return" | "week_away" | "extended_absence" | "long_gone";
  previousMomentum: MomentumState;
  hadFirstWin: boolean;
  hasStatusItems: boolean;
}

export interface ConfidenceFlags {
  hasSufficientHistory: boolean;
  profileComplete: boolean;
  skillDataAvailable: boolean;
  economyDataAvailable: boolean;
  proofHistoryAvailable: boolean;
}

export interface GraphRawSignals {
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  trustScore: number;
  coinBalance: number;
  daysSinceLastActive: number;
  completedMissions14d: number;
  totalMissions14d: number;
  approvedProofs14d: number;
  rejectedProofs14d: number;
  followupProofs14d: number;
  totalProofs14d: number;
  avgProofQuality14d: number;
  ownedItemCount: number;
  equippedItemCount: number;
  spentCoins30d: number;
  earnedCoins30d: number;
  weakestSkillLevel: number;
  strongestSkillLevel: number;
  avgSkillLevel: number;
  accountAgeDays: number;
}

export type NextActionId =
  | "create_manageable_mission"
  | "start_focused_session"
  | "resubmit_stronger_proof"
  | "recover_streak"
  | "save_for_first_item"
  | "equip_owned_items"
  | "complete_comeback_challenge"
  | "push_weak_dimension"
  | "restart_small"
  | "complete_profile"
  | "explore_store"
  | "try_harder_mission"
  | "celebrate_progress"
  | "improve_proof_quality";

export interface NextActionRecommendation {
  actionId: NextActionId;
  priority: number;
  confidence: "low" | "medium" | "high";
  framingAngle: string;
  targetScreen: string;
  reason: string;
  userCopy: string;
}

export interface PersonalizationLogEntry {
  timestamp: string;
  userId: string;
  graphVersion: string;
  disciplineState: DisciplineState;
  trustState: TrustProofState;
  momentumState: MomentumState;
  progressionState: ProgressionState;
  economyState: EconomyState;
  identityMotivation: IdentityMotivation;
  recommendedAction: NextActionId;
  recommendationReason: string;
  fallbackUsed: boolean;
}
