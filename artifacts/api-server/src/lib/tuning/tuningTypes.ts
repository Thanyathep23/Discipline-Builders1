export enum TuningDomain {
  ECONOMY = "economy",
  TRUST = "trust",
  PERSONALIZATION = "personalization",
  LIVE_OPS = "live_ops",
  PRESTIGE = "prestige",
  ONBOARDING = "onboarding",
}

export enum TuningChangeType {
  MAJOR = "major",
  MINOR = "minor",
  EMERGENCY = "emergency",
  ROLLBACK = "rollback",
}

export enum TuningChangeSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ReviewCadence {
  DAILY = "daily",
  TWICE_WEEKLY = "twice_weekly",
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
}

export enum RecommendationConfidence {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INSUFFICIENT_DATA = "insufficient_data",
}

export enum TuningChangeStatus {
  PENDING = "pending",
  ACTIVE = "active",
  OBSERVING = "observing",
  REVIEWED_KEPT = "reviewed_kept",
  REVIEWED_REVERTED = "reviewed_reverted",
  ROLLED_BACK = "rolled_back",
}

export interface TuningLever {
  id: string;
  domain: TuningDomain;
  configPath: string;
  label: string;
  description: string;
  currentValueFn: () => unknown;
  safeRange: { min: number; max: number } | null;
  observationWindowDays: number;
  primaryMetric: string;
  relatedMetrics: string[];
  unsafeChanges: string[];
}

export interface TuningChangeEntry {
  id: string;
  timestamp: string;
  domain: TuningDomain;
  changeType: TuningChangeType;
  leverId: string;
  leverLabel: string;
  configPath: string;
  oldValue: unknown;
  newValue: unknown;
  operator: string;
  rationale: string;
  hypothesis: string;
  expectedEffect: string;
  primaryMetric: string;
  observationWindowDays: number;
  observationEndsAt: string;
  status: TuningChangeStatus;
  reviewOutcome: string | null;
  reviewedAt: string | null;
  rollbackOf: string | null;
  configVersion: string;
}

export interface TuningRecommendation {
  id: string;
  timestamp: string;
  domain: TuningDomain;
  severity: TuningChangeSeverity;
  confidence: RecommendationConfidence;
  triggerSignals: string[];
  title: string;
  description: string;
  suggestedLever: string;
  suggestedAction: string;
  reviewStep: string;
  dismissed: boolean;
  dismissedReason: string | null;
  actedUpon: boolean;
  linkedChangeId: string | null;
}

export interface DomainWatchlistItem {
  id: string;
  domain: TuningDomain;
  metricName: string;
  label: string;
  thresholdType: "above" | "below" | "change_rate";
  thresholdValue: number;
  whyItMatters: string;
  recommendedResponse: string;
  cadence: ReviewCadence;
  currentValue: number | null;
  isTriggered: boolean;
  lastCheckedAt: string | null;
}

export interface DomainStatus {
  domain: TuningDomain;
  activeConfigVersion: string;
  lastTuningChange: TuningChangeEntry | null;
  lastReviewedAt: string | null;
  activeRecommendations: number;
  triggeredWatchlistItems: number;
  health: "healthy" | "needs_attention" | "critical";
}

export interface FeedbackSignal {
  id: string;
  timestamp: string;
  feedbackClass: FeedbackClass;
  domain: TuningDomain;
  source: string;
  description: string;
  detectedAutomatically: boolean;
  affectedMetrics: string[];
  falsePositiveRisk: "low" | "medium" | "high";
  requiresReview: boolean;
  reviewed: boolean;
}

export enum FeedbackClass {
  METRIC_ANOMALY = "metric_anomaly",
  SUSTAINED_WEAKNESS = "sustained_weakness",
  POSITIVE_UPLIFT = "positive_uplift",
  USER_CONFUSION = "user_confusion",
  TRUST_FAIRNESS_CONCERN = "trust_fairness_concern",
  ECONOMY_IMBALANCE = "economy_imbalance",
  ENGAGEMENT_DECAY = "engagement_decay",
  EVENT_FATIGUE = "event_fatigue",
}

export interface ConfigSnapshot {
  domain: TuningDomain;
  version: string;
  snapshotAt: string;
  configValues: Record<string, unknown>;
}
