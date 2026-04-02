import { GRAPH_VERSION } from "./graphTypes.js";

export const PERSONALIZATION_CONFIG = {
  version: GRAPH_VERSION,

  discipline: {
    highlyConsistentStreakMin: 14,
    highlyConsistentCompletionMin: 0.85,
    consistentStreakMin: 5,
    consistentCompletionMin: 0.65,
    buildingCompletionMin: 0.40,
    buildingStreakMin: 2,
  },

  trustProof: {
    trustSensitiveThreshold: 0.4,
    cleanConfidentApprovalMin: 0.80,
    cleanConfidentQualityMin: 0.70,
    needsBetterEvidenceFollowupMin: 0.30,
    borderlineApprovalMax: 0.50,
    borderlineQualityMax: 0.50,
  },

  momentum: {
    inactiveThresholdDays: 7,
    reactivatingMinDays: 3,
    stalledMinDays: 3,
    surgingCompletionMin: 0.85,
    surgingMissionMin: 5,
  },

  progression: {
    earlyBuildMaxLevel: 5,
    earlyBuildMaxDays: 14,
    advancedPushMinLevel: 25,
    advancedPushMinAvgSkill: 15,
    plateauRiskVelocityMax: 0.15,
    plateauRiskMinLevel: 8,
  },

  economy: {
    noFirstPurchaseMaxItems: 1,
    statusMotivatedMinItems: 5,
    statusMotivatedMinEquipped: 2,
    activeSpenderMinSpent: 200,
    cautiousSaverMinBalance: 300,
    cautiousSaverMaxSpent: 50,
  },

  rollingWindowDays: 14,
  economyWindowDays: 30,
  graphEvaluatedPerRequest: true,
} as const;

export type PersonalizationConfig = typeof PERSONALIZATION_CONFIG;
