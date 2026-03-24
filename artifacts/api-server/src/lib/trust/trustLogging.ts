import type { TrustVerdictPayload } from "./verdictTypes.js";

export interface TrustLogEntry {
  timestamp: string;
  proofId: string;
  userId: string;
  missionId?: string;
  sessionId?: string;
  missionCategory?: string;
  verdict: TrustVerdictPayload["verdict"];
  confidenceLevel: TrustVerdictPayload["confidenceLevel"];
  confidenceScore: number;
  trustRiskLevel: TrustVerdictPayload["trustRiskLevel"];
  routingClass: TrustVerdictPayload["routingClass"];
  reasonCodes: string[];
  suspiciousSignals: string[];
  providerUsed: string;
  isFallback: boolean;
  escalationRecommended: boolean;
  rewardEligible: boolean;
  rewardMultiplier: number;
  progressionEligible: boolean;
  trustScoreDelta: number;
  userTrustScoreBefore: number;
  userTrustScoreAfter: number;
  evaluationVersion: string;
  rubric: TrustVerdictPayload["rubric"];
  isFollowup: boolean;
  followupCount?: number;
}

export function buildTrustLogEntry(
  payload: TrustVerdictPayload,
  context: {
    proofId: string;
    userId: string;
    missionId?: string;
    sessionId?: string;
    missionCategory?: string;
    userTrustScoreBefore: number;
    isFollowup: boolean;
    isFallback: boolean;
    followupCount?: number;
  },
): TrustLogEntry {
  const newTrustScore = Math.max(0.1, Math.min(1.0,
    context.userTrustScoreBefore + payload.trustScoreDelta
  ));

  return {
    timestamp: new Date().toISOString(),
    proofId: context.proofId,
    userId: context.userId,
    missionId: context.missionId,
    sessionId: context.sessionId,
    missionCategory: context.missionCategory,
    verdict: payload.verdict,
    confidenceLevel: payload.confidenceLevel,
    confidenceScore: payload.confidenceScore,
    trustRiskLevel: payload.trustRiskLevel,
    routingClass: payload.routingClass,
    reasonCodes: payload.primaryReasons,
    suspiciousSignals: payload.suspiciousSignals,
    providerUsed: payload.providerUsed,
    isFallback: context.isFallback,
    escalationRecommended: payload.escalationRecommended,
    rewardEligible: payload.rewardDecision.eligible,
    rewardMultiplier: payload.rewardMultiplier,
    progressionEligible: payload.progressionDecision.eligible,
    trustScoreDelta: payload.trustScoreDelta,
    userTrustScoreBefore: context.userTrustScoreBefore,
    userTrustScoreAfter: newTrustScore,
    evaluationVersion: payload.evaluationVersion,
    rubric: payload.rubric,
    isFollowup: context.isFollowup,
    followupCount: context.followupCount,
  };
}

export function formatTrustLog(entry: TrustLogEntry): string {
  return [
    `[TRUST] ${entry.timestamp}`,
    `proof=${entry.proofId}`,
    `user=${entry.userId}`,
    `verdict=${entry.verdict}`,
    `confidence=${entry.confidenceLevel}(${entry.confidenceScore.toFixed(2)})`,
    `risk=${entry.trustRiskLevel}`,
    `route=${entry.routingClass}`,
    `reward=${entry.rewardEligible ? entry.rewardMultiplier.toFixed(2) : "blocked"}`,
    `trust=${entry.userTrustScoreBefore.toFixed(2)}->${entry.userTrustScoreAfter.toFixed(2)}`,
    `provider=${entry.providerUsed}`,
    `signals=[${entry.suspiciousSignals.join(",")}]`,
    `reasons=[${entry.reasonCodes.join(",")}]`,
    entry.escalationRecommended ? "ESCALATION_RECOMMENDED" : "",
    `v=${entry.evaluationVersion}`,
  ].filter(Boolean).join(" ");
}

export function logTrustEvaluation(entry: TrustLogEntry): void {
  const formatted = formatTrustLog(entry);
  console.log(formatted);
}
