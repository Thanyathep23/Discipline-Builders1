import {
  TuningDomain, TuningChangeSeverity, RecommendationConfidence,
  type TuningRecommendation, type DomainWatchlistItem,
} from "./tuningTypes.js";
import { recordRecommendation } from "./tuningLogService.js";
import { getTriggeredWatchlistItems } from "./domainWatchlists.js";

export interface RecommendationTemplate {
  id: string;
  domain: TuningDomain;
  severity: TuningChangeSeverity;
  triggerCondition: string;
  triggerSignals: string[];
  title: string;
  description: string;
  suggestedLever: string;
  suggestedAction: string;
  reviewStep: string;
  minConfidence: RecommendationConfidence;
}

export const RECOMMENDATION_TEMPLATES: RecommendationTemplate[] = [
  {
    id: "rec-first-purchase-slow",
    domain: TuningDomain.ECONOMY,
    severity: TuningChangeSeverity.HIGH,
    triggerCondition: "economy.first_purchase_median_hours > 72",
    triggerSignals: ["economy.first_purchase_median_hours", "activation.first_purchase_hours"],
    title: "First purchase is too slow for new users",
    description: "New users take too long to make their first purchase, risking early churn before identity momentum kicks in.",
    suggestedLever: "economy.reward_band_trivial_max",
    suggestedAction: "Review starter price band and early earning rate. Consider lowering starter wearable prices or increasing trivial reward.",
    reviewStep: "Check Day 1 earnings vs starter item prices. Verify AFFORDABILITY_TARGETS.day1 alignment.",
    minConfidence: RecommendationConfidence.MEDIUM,
  },
  {
    id: "rec-followup-rising",
    domain: TuningDomain.TRUST,
    severity: TuningChangeSeverity.HIGH,
    triggerCondition: "trust.followup_rate_7d > 30%",
    triggerSignals: ["trust.followup_rate_7d", "trust.confidence_distribution"],
    title: "Follow-up rate is rising for proofs",
    description: "Too many proofs are getting follow-up requests, creating friction and user frustration.",
    suggestedLever: "trust.confidence_high_min",
    suggestedAction: "Review trust thresholds or proof guidance. Consider lowering highMin slightly (e.g., 0.75 → 0.72).",
    reviewStep: "Check confidence distribution. If medium-confidence proofs are borderline, threshold is too strict.",
    minConfidence: RecommendationConfidence.MEDIUM,
  },
  {
    id: "rec-comeback-poor",
    domain: TuningDomain.PERSONALIZATION,
    severity: TuningChangeSeverity.MEDIUM,
    triggerCondition: "personalization.comeback_conversion_7d < 15%",
    triggerSignals: ["personalization.comeback_conversion_7d", "liveops.comeback_event_conversion"],
    title: "Comeback prompts are converting poorly",
    description: "Users prompted to come back after inactivity are not returning. Re-engagement path needs review.",
    suggestedLever: "liveops.max_comeback_coins",
    suggestedAction: "Review comeback path design and reward amounts. Consider increasing comeback reward or simplifying return mission.",
    reviewStep: "Check comeback reward vs current earning rate. If reward < 1 easy mission, it may feel insufficient.",
    minConfidence: RecommendationConfidence.MEDIUM,
  },
  {
    id: "rec-spotlight-no-lift",
    domain: TuningDomain.LIVE_OPS,
    severity: TuningChangeSeverity.LOW,
    triggerCondition: "liveops.spotlight_purchase_uplift < 5%",
    triggerSignals: ["liveops.spotlight_purchase_uplift", "economy.category_adoption"],
    title: "Room spotlight generated no lift",
    description: "Spotlight event did not increase purchases for featured category.",
    suggestedLever: "liveops.max_weekly_combined",
    suggestedAction: "Review featured category and event framing. Consider spotlighting mid-range items accessible to more users.",
    reviewStep: "Check spotlight item prices vs active user wallet distribution.",
    minConfidence: RecommendationConfidence.LOW,
  },
  {
    id: "rec-showcase-low",
    domain: TuningDomain.PRESTIGE,
    severity: TuningChangeSeverity.MEDIUM,
    triggerCondition: "prestige.showcase_views_7d < 5% of active users",
    triggerSignals: ["prestige.showcase_views_7d", "prestige.first_advancement_days"],
    title: "Prestige showcase engagement is low",
    description: "Very few users are viewing their prestige showcase. May be inaccessible or uninteresting at current band thresholds.",
    suggestedLever: "prestige.band_rising_threshold",
    suggestedAction: "Review placement and featured highlights. Consider lowering Rising threshold for earlier first advancement.",
    reviewStep: "Check band distribution. If >80% are Emerging, threshold may be too high.",
    minConfidence: RecommendationConfidence.LOW,
  },
  {
    id: "rec-next-action-weak",
    domain: TuningDomain.PERSONALIZATION,
    severity: TuningChangeSeverity.MEDIUM,
    triggerCondition: "personalization.next_action_ctr < 20%",
    triggerSignals: ["personalization.next_action_ctr", "personalization.rec_ignored_rate"],
    title: "Recommended next action acceptance is weak",
    description: "Users are not following recommended next actions. Recommendations may be repetitive or irrelevant.",
    suggestedLever: "personalization.consistent_streak_min",
    suggestedAction: "Simplify re-entry guidance for stalled users. Review recommendation variety and state graph transitions.",
    reviewStep: "Check recommendation diversity per user. If same action repeated 3+ times, variety is too low.",
    minConfidence: RecommendationConfidence.MEDIUM,
  },
  {
    id: "rec-suspicious-spike",
    domain: TuningDomain.TRUST,
    severity: TuningChangeSeverity.HIGH,
    triggerCondition: "trust.suspicious_signal_rate > 10%",
    triggerSignals: ["trust.suspicious_signal_rate", "trust.reward_blocked_rate"],
    title: "Suspicious proof signals are spiking",
    description: "Anti-gaming signal rate has increased significantly. May indicate actual gaming or overly sensitive detection.",
    suggestedLever: "trust.suspicious_timing_max",
    suggestedAction: "Investigate signal breakdown by type. If timing-based, consider relaxing timing threshold slightly.",
    reviewStep: "Check if spike is from one user or distributed. Check which signal types are firing.",
    minConfidence: RecommendationConfidence.MEDIUM,
  },
];

export function generateRecommendationsFromWatchlist(): TuningRecommendation[] {
  const triggered = getTriggeredWatchlistItems();
  const generated: TuningRecommendation[] = [];

  for (const item of triggered) {
    const template = findMatchingTemplate(item);
    if (!template) continue;

    const rec = recordRecommendation({
      domain: template.domain,
      severity: template.severity,
      confidence: template.minConfidence,
      triggerSignals: template.triggerSignals,
      title: template.title,
      description: template.description,
      suggestedLever: template.suggestedLever,
      suggestedAction: template.suggestedAction,
      reviewStep: template.reviewStep,
    });
    generated.push(rec);
  }

  return generated;
}

function findMatchingTemplate(watchlistItem: DomainWatchlistItem): RecommendationTemplate | undefined {
  return RECOMMENDATION_TEMPLATES.find(t =>
    t.domain === watchlistItem.domain &&
    t.triggerSignals.includes(watchlistItem.metricName)
  );
}

export function getRecommendationTemplates(): RecommendationTemplate[] {
  return [...RECOMMENDATION_TEMPLATES];
}

export function getTemplatesByDomain(domain: TuningDomain): RecommendationTemplate[] {
  return RECOMMENDATION_TEMPLATES.filter(t => t.domain === domain);
}
