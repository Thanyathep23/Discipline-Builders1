import { ConfidenceLevel, type RubricScores, type AntiGamingSignalName } from "./verdictTypes.js";

export interface ConfidenceInput {
  rubric: RubricScores;
  providerConfidence: number;
  userTrustScore: number;
  suspiciousSignals: AntiGamingSignalName[];
  hasImages: boolean;
  hasLinks: boolean;
  textLength: number;
  isFollowup: boolean;
  isFallback: boolean;
}

export const CONFIDENCE_THRESHOLDS = {
  HIGH_MIN: 0.75,
  MEDIUM_MIN: 0.45,
} as const;

export function computeConfidenceScore(input: ConfidenceInput): number {
  const rubricAvg =
    (input.rubric.relevanceScore +
      input.rubric.qualityScore +
      input.rubric.plausibilityScore +
      input.rubric.specificityScore) /
    4;

  let score = rubricAvg * 0.5 + input.providerConfidence * 0.3;

  if (input.hasImages) score += 0.05;
  if (input.hasLinks) score += 0.03;
  if (input.textLength > 200) score += 0.05;
  if (input.textLength > 500) score += 0.03;

  if (input.isFollowup) score += 0.05;

  if (input.isFallback) score -= 0.10;

  const signalPenalty = input.suspiciousSignals.length * 0.08;
  score -= Math.min(signalPenalty, 0.30);

  const trustBonus = (input.userTrustScore - 0.5) * 0.1;
  score += trustBonus;

  return Math.max(0, Math.min(1, score));
}

export function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH_MIN) return ConfidenceLevel.HIGH;
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM_MIN) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

export const CONFIDENCE_REWARD_RULES: Record<ConfidenceLevel, { maxMultiplier: number; requiresFollowup: boolean; escalationWeight: number }> = {
  [ConfidenceLevel.HIGH]: {
    maxMultiplier: 1.5,
    requiresFollowup: false,
    escalationWeight: 0,
  },
  [ConfidenceLevel.MEDIUM]: {
    maxMultiplier: 1.0,
    requiresFollowup: false,
    escalationWeight: 0.3,
  },
  [ConfidenceLevel.LOW]: {
    maxMultiplier: 0.5,
    requiresFollowup: true,
    escalationWeight: 0.7,
  },
};

export interface ConfidenceRubric {
  factor: string;
  weight: number;
  description: string;
}

export const CONFIDENCE_RUBRIC: ConfidenceRubric[] = [
  { factor: "rubricAverage", weight: 0.50, description: "Average of relevance, quality, plausibility, specificity scores" },
  { factor: "providerConfidence", weight: 0.30, description: "Raw confidence from AI provider or rule engine" },
  { factor: "evidenceBonus", weight: 0.08, description: "Bonus for images (+0.05), links (+0.03)" },
  { factor: "textLengthBonus", weight: 0.08, description: "Bonus for detailed text (>200 chars +0.05, >500 +0.03)" },
  { factor: "followupBonus", weight: 0.05, description: "Bonus for follow-up submissions (+0.05)" },
  { factor: "fallbackPenalty", weight: -0.10, description: "Penalty for rule-based fallback decisions" },
  { factor: "signalPenalty", weight: -0.08, description: "Per suspicious signal penalty (max -0.30)" },
  { factor: "trustAdjustment", weight: 0.10, description: "Slight adjustment based on user trust history" },
];
