export {
  TRUST_ENGINE_VERSION,
  Verdict,
  ConfidenceLevel,
  TrustRiskLevel,
  RoutingClass,
  VERDICT_DEFINITIONS,
  REWARD_ELIGIBLE_VERDICTS,
  PROGRESSION_ELIGIBLE_VERDICTS,
  TRUST_SENSITIVE_VERDICTS,
} from "./verdictTypes.js";
export type {
  VerdictType,
  TrustVerdictPayload,
  RubricScores,
  RewardDecision,
  ProgressionDecision,
  ReasonCode,
  AntiGamingSignalName,
} from "./verdictTypes.js";

export { computeConfidenceScore, classifyConfidence, CONFIDENCE_THRESHOLDS, CONFIDENCE_REWARD_RULES } from "./confidenceRules.js";

export { classifyRoute, enforceVerdictSafety, getProviderTierOrder, ROUTING_DEFINITIONS } from "./trustRouting.js";
export type { RoutingDecision } from "./trustRouting.js";

export { ANTI_GAMING_SIGNALS, evaluateSignals } from "./antiGamingSignals.js";
export type { AntiGamingSignalDefinition, SignalEvaluationResult } from "./antiGamingSignals.js";

export { REASON_DEFINITIONS, getUserExplanation, getOperatorExplanation, getReasonsByVerdict } from "./reasonCodes.js";

export { TRUST_CONFIG } from "./trustConfig.js";

export { evaluateTrust } from "./trustEngine.js";
export type { TrustEvaluationInput } from "./trustEngine.js";

export { buildTrustLogEntry, formatTrustLog, logTrustEvaluation } from "./trustLogging.js";
export type { TrustLogEntry } from "./trustLogging.js";
