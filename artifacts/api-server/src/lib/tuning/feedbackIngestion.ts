import {
  TuningDomain, FeedbackClass,
  type FeedbackSignal,
} from "./tuningTypes.js";
import { recordFeedbackSignal } from "./tuningLogService.js";

export interface FeedbackClassDefinition {
  feedbackClass: FeedbackClass;
  label: string;
  sources: string[];
  detectionMethod: string;
  triggerType: "automatic" | "manual" | "both";
  affectedDomains: TuningDomain[];
  falsePositiveRisk: "low" | "medium" | "high";
}

export const FEEDBACK_CLASS_DEFINITIONS: FeedbackClassDefinition[] = [
  {
    feedbackClass: FeedbackClass.METRIC_ANOMALY,
    label: "Metric Anomaly",
    sources: ["metrics dashboard", "alert system"],
    detectionMethod: "Threshold-based alerts or sudden rate changes detected by metrics service",
    triggerType: "automatic",
    affectedDomains: [TuningDomain.ECONOMY, TuningDomain.TRUST, TuningDomain.PERSONALIZATION],
    falsePositiveRisk: "medium",
  },
  {
    feedbackClass: FeedbackClass.SUSTAINED_WEAKNESS,
    label: "Sustained Weakness",
    sources: ["weekly/biweekly review", "watchlist"],
    detectionMethod: "Metric below threshold for 2+ consecutive review periods",
    triggerType: "both",
    affectedDomains: [TuningDomain.ECONOMY, TuningDomain.PERSONALIZATION, TuningDomain.PRESTIGE],
    falsePositiveRisk: "low",
  },
  {
    feedbackClass: FeedbackClass.POSITIVE_UPLIFT,
    label: "Positive Uplift",
    sources: ["post-change observation", "metrics dashboard"],
    detectionMethod: "Metric improvement above expected range after tuning change",
    triggerType: "automatic",
    affectedDomains: [TuningDomain.ECONOMY, TuningDomain.TRUST, TuningDomain.PERSONALIZATION, TuningDomain.LIVE_OPS, TuningDomain.PRESTIGE],
    falsePositiveRisk: "medium",
  },
  {
    feedbackClass: FeedbackClass.USER_CONFUSION,
    label: "User Confusion Pattern",
    sources: ["support cases", "operator observation"],
    detectionMethod: "Repeated support cases about same feature or unclear UX",
    triggerType: "manual",
    affectedDomains: [TuningDomain.ONBOARDING, TuningDomain.TRUST, TuningDomain.PERSONALIZATION],
    falsePositiveRisk: "low",
  },
  {
    feedbackClass: FeedbackClass.TRUST_FAIRNESS_CONCERN,
    label: "Trust / Fairness Concern",
    sources: ["support disputes", "trust metrics", "operator review"],
    detectionMethod: "Support cases disputing verdicts or trust score patterns showing bias",
    triggerType: "both",
    affectedDomains: [TuningDomain.TRUST],
    falsePositiveRisk: "medium",
  },
  {
    feedbackClass: FeedbackClass.ECONOMY_IMBALANCE,
    label: "Economy Imbalance Signal",
    sources: ["economy metrics", "wallet distribution", "purchase patterns"],
    detectionMethod: "Mint/spend ratio, wallet distribution skew, or purchase timing anomalies",
    triggerType: "automatic",
    affectedDomains: [TuningDomain.ECONOMY, TuningDomain.LIVE_OPS],
    falsePositiveRisk: "medium",
  },
  {
    feedbackClass: FeedbackClass.ENGAGEMENT_DECAY,
    label: "Engagement Decay Signal",
    sources: ["core loop metrics", "prestige/history engagement", "recommendation stats"],
    detectionMethod: "Declining repeat loop rate, showcase views, or next-action acceptance over 14+ days",
    triggerType: "both",
    affectedDomains: [TuningDomain.PERSONALIZATION, TuningDomain.PRESTIGE, TuningDomain.LIVE_OPS],
    falsePositiveRisk: "medium",
  },
  {
    feedbackClass: FeedbackClass.EVENT_FATIGUE,
    label: "Event Fatigue Signal",
    sources: ["live ops metrics", "event skip rates"],
    detectionMethod: "Rising event skip rate or declining participation across 3+ consecutive events",
    triggerType: "automatic",
    affectedDomains: [TuningDomain.LIVE_OPS],
    falsePositiveRisk: "low",
  },
];

export function classifyFeedback(input: {
  source: string;
  description: string;
  domain: TuningDomain;
  affectedMetrics: string[];
  detectedAutomatically: boolean;
}): FeedbackSignal {
  const feedbackClass = inferFeedbackClass(input.description, input.domain, input.affectedMetrics);
  const classDef = FEEDBACK_CLASS_DEFINITIONS.find(d => d.feedbackClass === feedbackClass);

  return recordFeedbackSignal({
    feedbackClass,
    domain: input.domain,
    source: input.source,
    description: input.description,
    detectedAutomatically: input.detectedAutomatically,
    affectedMetrics: input.affectedMetrics,
    falsePositiveRisk: classDef?.falsePositiveRisk ?? "medium",
    requiresReview: true,
  });
}

function inferFeedbackClass(description: string, domain: TuningDomain, metrics: string[]): FeedbackClass {
  const lower = description.toLowerCase();

  if (lower.includes("spike") || lower.includes("anomal") || lower.includes("sudden")) {
    return FeedbackClass.METRIC_ANOMALY;
  }
  if (lower.includes("sustained") || lower.includes("persistent") || lower.includes("weeks")) {
    return FeedbackClass.SUSTAINED_WEAKNESS;
  }
  if (lower.includes("improve") || lower.includes("uplift") || lower.includes("increase")) {
    return FeedbackClass.POSITIVE_UPLIFT;
  }
  if (lower.includes("confus") || lower.includes("unclear") || lower.includes("support")) {
    return FeedbackClass.USER_CONFUSION;
  }
  if (lower.includes("unfair") || lower.includes("dispute") || lower.includes("trust")) {
    return FeedbackClass.TRUST_FAIRNESS_CONCERN;
  }
  if (lower.includes("inflation") || lower.includes("deflation") || lower.includes("imbalance")) {
    return FeedbackClass.ECONOMY_IMBALANCE;
  }
  if (lower.includes("fatigue") || lower.includes("skip") || lower.includes("event")) {
    return FeedbackClass.EVENT_FATIGUE;
  }
  if (lower.includes("decay") || lower.includes("declining") || lower.includes("dropping")) {
    return FeedbackClass.ENGAGEMENT_DECAY;
  }

  return FeedbackClass.METRIC_ANOMALY;
}

export function getFeedbackClassDefinition(feedbackClass: FeedbackClass): FeedbackClassDefinition | undefined {
  return FEEDBACK_CLASS_DEFINITIONS.find(d => d.feedbackClass === feedbackClass);
}
