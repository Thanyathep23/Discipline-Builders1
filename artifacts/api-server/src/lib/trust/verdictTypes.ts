export const TRUST_ENGINE_VERSION = "2.0.0" as const;

export const Verdict = {
  APPROVED: "approved",
  PARTIAL: "partial",
  REJECTED: "rejected",
  FLAGGED: "flagged",
  FOLLOWUP_NEEDED: "followup_needed",
  MANUAL_REVIEW: "manual_review",
  SYSTEM_ERROR: "system_error",
} as const;

export type VerdictType = (typeof Verdict)[keyof typeof Verdict];

export const REWARD_ELIGIBLE_VERDICTS: readonly VerdictType[] = [
  Verdict.APPROVED,
  Verdict.PARTIAL,
] as const;

export const PROGRESSION_ELIGIBLE_VERDICTS: readonly VerdictType[] = [
  Verdict.APPROVED,
  Verdict.PARTIAL,
] as const;

export const TRUST_SENSITIVE_VERDICTS: readonly VerdictType[] = [
  Verdict.FLAGGED,
  Verdict.MANUAL_REVIEW,
  Verdict.REJECTED,
] as const;

export interface VerdictDefinition {
  readonly verdict: VerdictType;
  readonly meaning: string;
  readonly rewardEligible: boolean;
  readonly progressionEligible: boolean;
  readonly userFeedbackShown: boolean;
  readonly manualReviewRequired: boolean;
  readonly trustSensitive: boolean;
  readonly defaultRewardMultiplier: number;
}

export const VERDICT_DEFINITIONS: Record<VerdictType, VerdictDefinition> = {
  [Verdict.APPROVED]: {
    verdict: Verdict.APPROVED,
    meaning: "Clear evidence of real effort verified by AI judge",
    rewardEligible: true,
    progressionEligible: true,
    userFeedbackShown: true,
    manualReviewRequired: false,
    trustSensitive: false,
    defaultRewardMultiplier: 1.0,
  },
  [Verdict.PARTIAL]: {
    verdict: Verdict.PARTIAL,
    meaning: "Some evidence present but incomplete or borderline quality",
    rewardEligible: true,
    progressionEligible: true,
    userFeedbackShown: true,
    manualReviewRequired: false,
    trustSensitive: false,
    defaultRewardMultiplier: 0.4,
  },
  [Verdict.REJECTED]: {
    verdict: Verdict.REJECTED,
    meaning: "Clearly insufficient or invalid evidence",
    rewardEligible: false,
    progressionEligible: false,
    userFeedbackShown: true,
    manualReviewRequired: false,
    trustSensitive: true,
    defaultRewardMultiplier: 0,
  },
  [Verdict.FLAGGED]: {
    verdict: Verdict.FLAGGED,
    meaning: "Multiple suspicious signals detected, requires operator inspection",
    rewardEligible: false,
    progressionEligible: false,
    userFeedbackShown: true,
    manualReviewRequired: true,
    trustSensitive: true,
    defaultRewardMultiplier: 0,
  },
  [Verdict.FOLLOWUP_NEEDED]: {
    verdict: Verdict.FOLLOWUP_NEEDED,
    meaning: "Ambiguous evidence that could improve with additional information",
    rewardEligible: false,
    progressionEligible: false,
    userFeedbackShown: true,
    manualReviewRequired: false,
    trustSensitive: false,
    defaultRewardMultiplier: 0,
  },
  [Verdict.MANUAL_REVIEW]: {
    verdict: Verdict.MANUAL_REVIEW,
    meaning: "Escalated for human review due to conflicting signals or edge case",
    rewardEligible: false,
    progressionEligible: false,
    userFeedbackShown: true,
    manualReviewRequired: true,
    trustSensitive: true,
    defaultRewardMultiplier: 0,
  },
  [Verdict.SYSTEM_ERROR]: {
    verdict: Verdict.SYSTEM_ERROR,
    meaning: "Provider failure or system error, no judgment rendered",
    rewardEligible: false,
    progressionEligible: false,
    userFeedbackShown: true,
    manualReviewRequired: false,
    trustSensitive: false,
    defaultRewardMultiplier: 0,
  },
};

export interface TrustVerdictPayload {
  verdict: VerdictType;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  trustRiskLevel: TrustRiskLevel;
  rewardDecision: RewardDecision;
  progressionDecision: ProgressionDecision;
  primaryReasons: ReasonCode[];
  missingRequirements: string[];
  suspiciousSignals: AntiGamingSignalName[];
  escalationRecommended: boolean;
  providerUsed: string;
  rulesTriggered: string[];
  evaluationVersion: string;
  routingClass: RoutingClass;
  rubric: RubricScores;
  rewardMultiplier: number;
  trustScoreDelta: number;
  userExplanation: string;
  operatorExplanation: string;
  followupQuestions?: string;
}

export interface RubricScores {
  relevanceScore: number;
  qualityScore: number;
  plausibilityScore: number;
  specificityScore: number;
}

export interface RewardDecision {
  eligible: boolean;
  multiplier: number;
  blockedReason?: ReasonCode;
}

export interface ProgressionDecision {
  eligible: boolean;
  blockedReason?: ReasonCode;
}

export const ConfidenceLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type ConfidenceLevel = (typeof ConfidenceLevel)[keyof typeof ConfidenceLevel];

export const TrustRiskLevel = {
  SAFE: "safe",
  ELEVATED: "elevated",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

export type TrustRiskLevel = (typeof TrustRiskLevel)[keyof typeof TrustRiskLevel];

export const RoutingClass = {
  EASY_CLEAN: "easy_clean",
  AMBIGUOUS: "ambiguous",
  RISKY: "risky",
  SYSTEM_FAILURE: "system_failure",
} as const;

export type RoutingClass = (typeof RoutingClass)[keyof typeof RoutingClass];

export type ReasonCode =
  | "evidence_clear"
  | "evidence_detailed"
  | "evidence_consistent"
  | "evidence_insufficient"
  | "evidence_partial"
  | "explanation_too_short"
  | "explanation_generic"
  | "explanation_detailed"
  | "duplicate_exact"
  | "duplicate_near"
  | "suspicious_pattern"
  | "suspicious_timing"
  | "suspicious_volume"
  | "mission_mismatch"
  | "category_mismatch"
  | "low_confidence"
  | "medium_confidence"
  | "high_confidence"
  | "provider_failure_fallback"
  | "provider_timeout"
  | "provider_malformed"
  | "incomplete_submission"
  | "empty_submission"
  | "strong_consistency_signal"
  | "duration_implausible"
  | "high_distraction"
  | "boilerplate_detected"
  | "low_information_content"
  | "file_evidence_strong"
  | "file_evidence_weak"
  | "link_evidence_present"
  | "followup_improved"
  | "followup_insufficient"
  | "multiple_risk_signals"
  | "trust_score_low"
  | "trust_score_recovery"
  | "auto_partial_cap";

export type AntiGamingSignalName =
  | "exact_duplicate"
  | "near_duplicate"
  | "boilerplate_text"
  | "suspicious_timing"
  | "low_information"
  | "mission_mismatch"
  | "repeated_followup_trigger"
  | "volume_spike"
  | "content_reuse"
  | "duration_implausible"
  | "high_distraction"
  | "generic_phrases";
