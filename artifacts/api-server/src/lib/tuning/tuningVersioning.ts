import { TuningDomain, type ConfigSnapshot } from "./tuningTypes.js";
import { DOMAIN_CONFIG_VERSIONS } from "./tuningConfig.js";
import { REWARD_BANDS, ANTI_INFLATION, PRIORITY_MULTIPLIERS, DISTRACTION_MULTIPLIERS, SELLBACK_RATE_WEARABLE, SELLBACK_RATE_CAR } from "../economy/economyConfig.js";
import { TRUST_CONFIG } from "../trust/trustConfig.js";
import { PERSONALIZATION_CONFIG } from "../personalization/personalizationConfig.js";
import { LIVE_OPS_ECONOMY_LIMITS } from "../live-ops/liveOpsConfig.js";
import { PRESTIGE_CONFIG } from "../prestige/prestigeConfig.js";

export function getDomainConfigVersion(domain: TuningDomain): string {
  return DOMAIN_CONFIG_VERSIONS[domain]();
}

export function getAllConfigVersions(): Record<TuningDomain, string> {
  const result = {} as Record<TuningDomain, string>;
  for (const domain of Object.values(TuningDomain)) {
    result[domain] = getDomainConfigVersion(domain);
  }
  return result;
}

export function snapshotDomainConfig(domain: TuningDomain): ConfigSnapshot {
  const version = getDomainConfigVersion(domain);
  let configValues: Record<string, unknown> = {};

  switch (domain) {
    case TuningDomain.ECONOMY:
      configValues = {
        rewardBands: {
          trivial: { min: REWARD_BANDS.trivial.minReward, target: REWARD_BANDS.trivial.targetReward, max: REWARD_BANDS.trivial.maxReward },
          easy: { min: REWARD_BANDS.easy.minReward, target: REWARD_BANDS.easy.targetReward, max: REWARD_BANDS.easy.maxReward },
          moderate: { min: REWARD_BANDS.moderate.minReward, target: REWARD_BANDS.moderate.targetReward, max: REWARD_BANDS.moderate.maxReward },
          hard: { min: REWARD_BANDS.hard.minReward, target: REWARD_BANDS.hard.targetReward, max: REWARD_BANDS.hard.maxReward },
          extreme: { min: REWARD_BANDS.extreme.minReward, target: REWARD_BANDS.extreme.targetReward, max: REWARD_BANDS.extreme.maxReward },
        },
        antiInflation: { ...ANTI_INFLATION },
        priorityMultipliers: { ...PRIORITY_MULTIPLIERS },
        distractionMultipliers: { ...DISTRACTION_MULTIPLIERS },
        sellbackRateWearable: SELLBACK_RATE_WEARABLE,
        sellbackRateCar: SELLBACK_RATE_CAR,
      };
      break;
    case TuningDomain.TRUST:
      configValues = {
        confidence: { ...TRUST_CONFIG.confidence },
        trustScore: { ...TRUST_CONFIG.trustScore },
        antiGaming: { ...TRUST_CONFIG.antiGaming },
        escalation: { ...TRUST_CONFIG.escalation },
        followup: { ...TRUST_CONFIG.followup },
        reward: { ...TRUST_CONFIG.reward },
      };
      break;
    case TuningDomain.PERSONALIZATION:
      configValues = { ...PERSONALIZATION_CONFIG };
      break;
    case TuningDomain.LIVE_OPS:
      configValues = { economyLimits: { ...LIVE_OPS_ECONOMY_LIMITS } };
      break;
    case TuningDomain.PRESTIGE:
      configValues = {
        signalWeights: { ...PRESTIGE_CONFIG.signalWeights },
        bandThresholds: { ...PRESTIGE_CONFIG.bandProgressionThresholds },
        maxShowcaseHighlights: PRESTIGE_CONFIG.maxShowcaseHighlights,
        maxFeaturedMilestones: PRESTIGE_CONFIG.maxFeaturedMilestones,
        maxRecognitionSlots: PRESTIGE_CONFIG.maxRecognitionSlots,
      };
      break;
    case TuningDomain.ONBOARDING:
      configValues = { version: "1.0.0" };
      break;
  }

  return {
    domain,
    version,
    snapshotAt: new Date().toISOString(),
    configValues,
  };
}
