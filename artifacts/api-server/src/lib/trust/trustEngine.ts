import {
  TRUST_ENGINE_VERSION,
  Verdict,
  ConfidenceLevel,
  TrustRiskLevel,
  type VerdictType,
  type TrustVerdictPayload,
  type ReasonCode,
  type AntiGamingSignalName,
  type RubricScores,
  VERDICT_DEFINITIONS,
} from "./verdictTypes.js";
import { computeConfidenceScore, classifyConfidence, CONFIDENCE_REWARD_RULES } from "./confidenceRules.js";
import { classifyRoute, enforceVerdictSafety, type RoutingDecision } from "./trustRouting.js";
import { evaluateSignals, type SignalEvaluationInput } from "./antiGamingSignals.js";
import { getUserExplanation, getOperatorExplanation } from "./reasonCodes.js";
import { TRUST_CONFIG } from "./trustConfig.js";
import type { JudgeResult } from "../ai-judge.js";

export interface TrustEvaluationInput {
  judgeResult: JudgeResult;
  userTrustScore: number;
  hasImages: boolean;
  hasLinks: boolean;
  textLength: number;
  isFollowup: boolean;
  isFallback: boolean;
  isDuplicate: boolean;
  preScreenPassed: boolean;
  providerAvailable: boolean;
  distractionCount: number;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  recentFollowupCount: number;
  recentSubmissionCount24h: number;
  userAvgDailySubmissions: number;
  textSummary: string | null;
}

export function evaluateTrust(input: TrustEvaluationInput): TrustVerdictPayload {
  const signalInput: SignalEvaluationInput = {
    textSummary: input.textSummary,
    textLength: input.textLength,
    isDuplicate: input.isDuplicate,
    distractionCount: input.distractionCount,
    targetDurationMinutes: input.targetDurationMinutes,
    actualDurationMinutes: input.actualDurationMinutes,
    recentFollowupCount: input.recentFollowupCount,
    recentSubmissionCount24h: input.recentSubmissionCount24h,
    userAvgDailySubmissions: input.userAvgDailySubmissions,
    rubricRelevanceScore: input.judgeResult.rubric?.relevanceScore,
  };

  const triggeredSignals = evaluateSignals(signalInput);
  const signalNames: AntiGamingSignalName[] = triggeredSignals.map(s => s.signalName);

  const rubric: RubricScores = input.judgeResult.rubric ?? {
    relevanceScore: 0.5,
    qualityScore: 0.5,
    plausibilityScore: 0.5,
    specificityScore: 0.5,
  };

  const confidenceScore = computeConfidenceScore({
    rubric,
    providerConfidence: input.judgeResult.confidenceScore ?? 0.5,
    userTrustScore: input.userTrustScore,
    suspiciousSignals: signalNames,
    hasImages: input.hasImages,
    hasLinks: input.hasLinks,
    textLength: input.textLength,
    isFollowup: input.isFollowup,
    isFallback: input.isFallback,
  });

  const confidenceLevel = classifyConfidence(confidenceScore);

  const riskLevel = computeRiskLevel(signalNames, input.userTrustScore, confidenceLevel);

  const routingDecision = classifyRoute({
    confidenceLevel,
    riskLevel,
    suspiciousSignals: signalNames,
    userTrustScore: input.userTrustScore,
    hasImages: input.hasImages,
    textLength: input.textLength,
    isFollowup: input.isFollowup,
    isDuplicate: input.isDuplicate,
    preScreenPassed: input.preScreenPassed,
    providerAvailable: input.providerAvailable,
  });

  let verdict = input.judgeResult.verdict as VerdictType;
  verdict = enforceVerdictSafety(verdict, routingDecision);

  if (confidenceLevel === ConfidenceLevel.LOW && verdict === Verdict.APPROVED) {
    verdict = Verdict.FOLLOWUP_NEEDED;
  }

  const reasons = buildReasonCodes(verdict, confidenceLevel, signalNames, input, rubric);

  const rewardMultiplier = computeSafeRewardMultiplier(
    verdict,
    input.judgeResult.rewardMultiplier ?? VERDICT_DEFINITIONS[verdict].defaultRewardMultiplier,
    confidenceLevel,
    routingDecision,
  );

  const trustScoreDelta = computeTrustScoreDelta(verdict, confidenceLevel, signalNames);

  const escalationRecommended =
    routingDecision.escalationBehavior === "required" ||
    (routingDecision.escalationBehavior === "recommend" && riskLevel === TrustRiskLevel.HIGH);

  return {
    verdict,
    confidenceLevel,
    confidenceScore,
    trustRiskLevel: riskLevel,
    rewardDecision: {
      eligible: VERDICT_DEFINITIONS[verdict]?.rewardEligible ?? false,
      multiplier: rewardMultiplier,
      blockedReason: rewardMultiplier === 0 && verdict !== Verdict.FOLLOWUP_NEEDED
        ? reasons.find(r => ["duplicate_exact", "multiple_risk_signals", "evidence_insufficient"].includes(r))
        : undefined,
    },
    progressionDecision: {
      eligible: VERDICT_DEFINITIONS[verdict]?.progressionEligible ?? false,
      blockedReason: !VERDICT_DEFINITIONS[verdict]?.progressionEligible
        ? "evidence_insufficient"
        : undefined,
    },
    primaryReasons: reasons,
    missingRequirements: buildMissingRequirements(rubric, input),
    suspiciousSignals: signalNames,
    escalationRecommended,
    providerUsed: input.judgeResult.providerUsed ?? "unknown",
    rulesTriggered: triggeredSignals.map(s => `${s.signalName}:${s.severity}`),
    evaluationVersion: TRUST_ENGINE_VERSION,
    routingClass: routingDecision.routingClass,
    rubric,
    rewardMultiplier,
    trustScoreDelta,
    userExplanation: getUserExplanation(reasons),
    operatorExplanation: getOperatorExplanation(reasons),
    followupQuestions: input.judgeResult.followupQuestions,
  };
}

function computeRiskLevel(
  signals: AntiGamingSignalName[],
  trustScore: number,
  confidence: ConfidenceLevel,
): TrustRiskLevel {
  const hasCritical = signals.includes("exact_duplicate");
  if (hasCritical) return TrustRiskLevel.CRITICAL;

  const signalCount = signals.length;
  if (signalCount >= 3) return TrustRiskLevel.HIGH;
  if (signalCount >= 2 && trustScore < 0.4) return TrustRiskLevel.HIGH;

  if (signalCount >= 1 || confidence === ConfidenceLevel.LOW) return TrustRiskLevel.ELEVATED;

  return TrustRiskLevel.SAFE;
}

function buildReasonCodes(
  verdict: VerdictType,
  confidence: ConfidenceLevel,
  signals: AntiGamingSignalName[],
  input: TrustEvaluationInput,
  rubric: RubricScores,
): ReasonCode[] {
  const reasons: ReasonCode[] = [];

  if (confidence === ConfidenceLevel.HIGH) reasons.push("high_confidence");
  else if (confidence === ConfidenceLevel.MEDIUM) reasons.push("medium_confidence");
  else reasons.push("low_confidence");

  if (verdict === Verdict.APPROVED) {
    if (rubric.qualityScore > 0.8 && rubric.specificityScore > 0.8) {
      reasons.push("evidence_detailed");
    } else {
      reasons.push("evidence_clear");
    }
  } else if (verdict === Verdict.PARTIAL) {
    reasons.push("evidence_partial");
  } else if (verdict === Verdict.REJECTED) {
    reasons.push("evidence_insufficient");
  } else if (verdict === Verdict.FOLLOWUP_NEEDED) {
    reasons.push("evidence_insufficient");
  }

  if (signals.includes("exact_duplicate")) reasons.push("duplicate_exact");
  if (signals.includes("near_duplicate") || signals.includes("content_reuse")) reasons.push("duplicate_near");
  if (signals.includes("boilerplate_text") || signals.includes("generic_phrases")) reasons.push("boilerplate_detected");
  if (signals.includes("duration_implausible")) reasons.push("duration_implausible");
  if (signals.includes("high_distraction")) reasons.push("high_distraction");
  if (signals.includes("mission_mismatch")) reasons.push("mission_mismatch");
  if (signals.includes("low_information")) reasons.push("low_information_content");
  if (signals.includes("suspicious_timing")) reasons.push("suspicious_timing");
  if (signals.includes("volume_spike")) reasons.push("suspicious_volume");
  if (signals.length >= 3) reasons.push("multiple_risk_signals");

  if (input.textLength < TRUST_CONFIG.preScreen.minTextLength) reasons.push("explanation_too_short");
  if (input.isFallback) reasons.push("provider_failure_fallback");
  if (input.isFollowup) {
    if (verdict === Verdict.APPROVED || verdict === Verdict.PARTIAL) {
      reasons.push("followup_improved");
    } else {
      reasons.push("followup_insufficient");
    }
  }
  if (input.hasImages && rubric.qualityScore > 0.7) reasons.push("file_evidence_strong");
  if (input.hasImages && rubric.qualityScore < 0.4) reasons.push("file_evidence_weak");
  if (input.hasLinks) reasons.push("link_evidence_present");
  if (input.userTrustScore < TRUST_CONFIG.trustScore.lowThreshold) reasons.push("trust_score_low");

  return [...new Set(reasons)];
}

function buildMissingRequirements(rubric: RubricScores, input: TrustEvaluationInput): string[] {
  const missing: string[] = [];

  if (rubric.specificityScore < 0.5) missing.push("More specific details about what you accomplished");
  if (rubric.relevanceScore < 0.5) missing.push("Evidence directly related to the mission");
  if (rubric.qualityScore < 0.5) missing.push("Higher quality evidence of meaningful work");
  if (rubric.plausibilityScore < 0.5) missing.push("More believable account of the effort");
  if (input.textLength < 50) missing.push("A more detailed written description");
  if (!input.hasImages && !input.hasLinks) missing.push("Supporting evidence (photos, screenshots, or links)");

  return missing;
}

function computeSafeRewardMultiplier(
  verdict: VerdictType,
  rawMultiplier: number,
  confidence: ConfidenceLevel,
  routing: RoutingDecision,
): number {
  if (!VERDICT_DEFINITIONS[verdict]?.rewardEligible) return 0;

  const maxByConfidence = CONFIDENCE_REWARD_RULES[confidence].maxMultiplier;
  let multiplier = Math.min(rawMultiplier, maxByConfidence);

  if (routing.rewardSafetyConstraint === "blocked") return 0;
  if (routing.rewardSafetyConstraint === "capped") {
    multiplier = Math.min(multiplier, TRUST_CONFIG.reward.cappedMultiplierMax);
  }

  return Math.max(0, Math.min(1.5, multiplier));
}

function computeTrustScoreDelta(
  verdict: VerdictType,
  confidence: ConfidenceLevel,
  signals: AntiGamingSignalName[],
): number {
  const deltas = TRUST_CONFIG.trustScore.deltas;

  if (signals.includes("exact_duplicate")) return deltas.duplicateExact;

  switch (verdict) {
    case Verdict.APPROVED:
      return confidence === ConfidenceLevel.HIGH
        ? deltas.approvedHighConfidence
        : deltas.approvedLowConfidence;
    case Verdict.PARTIAL:
      return deltas.partial;
    case Verdict.REJECTED:
      return deltas.rejected;
    case Verdict.FLAGGED:
      return deltas.flagged;
    case Verdict.MANUAL_REVIEW:
      return deltas.manualReview;
    default:
      return 0;
  }
}
