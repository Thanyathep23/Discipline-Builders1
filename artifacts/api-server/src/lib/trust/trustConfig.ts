import { TRUST_ENGINE_VERSION } from "./verdictTypes.js";

export const TRUST_CONFIG = {
  version: TRUST_ENGINE_VERSION,

  confidence: {
    highMin: 0.75,
    mediumMin: 0.45,
    weights: {
      rubricAverage: 0.50,
      providerConfidence: 0.30,
      imageBonus: 0.05,
      linkBonus: 0.03,
      longTextBonus: 0.05,
      extraLongTextBonus: 0.03,
      followupBonus: 0.05,
      fallbackPenalty: 0.10,
      perSignalPenalty: 0.08,
      maxSignalPenalty: 0.30,
      trustAdjustmentScale: 0.10,
    },
  },

  trustScore: {
    default: 1.0,
    min: 0.1,
    max: 1.0,
    elevatedThreshold: 0.6,
    lowThreshold: 0.4,
    deltas: {
      approvedHighConfidence: 0.05,
      approvedLowConfidence: 0.02,
      partial: 0.01,
      rejected: -0.05,
      flagged: -0.10,
      duplicateExact: -0.15,
      manualReview: -0.02,
    },
  },

  routing: {
    riskySignalThresholdHard: 3,
    riskySignalThresholdWithLowTrust: 2,
    ambiguousMinTextLength: 50,
    ambiguousMinTextNoImage: 100,
  },

  antiGaming: {
    duplicateWindowDays: 30,
    nearDuplicateSimilarityThreshold: 0.80,
    suspiciousTimingMaxPerTenMinutes: 3,
    suspiciousTimingMaxPerHour: 10,
    volumeSpikeMaxPer24h: 15,
    volumeSpikeMultiplier: 2.0,
    repeatedFollowupThreshold: 3,
    repeatedFollowupWindowDays: 7,
    lowInformationUniqueWordMin: 5,
    durationImplausibleMinRatio: 0.2,
    durationImplausibleMaxRatio: 4.0,
    highDistractionThreshold: 10,
  },

  escalation: {
    autoEscalateOnMultipleRiskSignals: true,
    escalateOnProviderDisagreement: true,
    escalateOnHighRewardLowConfidence: true,
    highRewardThresholdCoins: 500,
    maxAutoEscalationsPerUser24h: 5,
  },

  preScreen: {
    minTextLength: 15,
    genericPhraseBlocksApproval: true,
  },

  followup: {
    maxAttempts: 2,
    autoPartialMultiplier: 0.4,
  },

  reward: {
    cappedMultiplierMax: 1.0,
    blockedMultiplier: 0,
    rejectedPenaltyCoins: 20,
    rejectedPenaltyXp: 10,
    pityXp: 1,
  },
} as const;

export type TrustConfig = typeof TRUST_CONFIG;
