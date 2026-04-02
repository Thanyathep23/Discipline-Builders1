import type { AntiGamingSignalName, ReasonCode } from "./verdictTypes.js";

export interface AntiGamingSignalDefinition {
  name: AntiGamingSignalName;
  description: string;
  triggerLogic: string;
  severity: "low" | "medium" | "high" | "critical";
  blocksApproval: boolean;
  lowersConfidence: boolean;
  recommendsFollowup: boolean;
  recommendsEscalation: boolean;
  falsePositiveRisk: "low" | "medium" | "high";
  associatedReasonCode: ReasonCode;
}

export const ANTI_GAMING_SIGNALS: Record<AntiGamingSignalName, AntiGamingSignalDefinition> = {
  exact_duplicate: {
    name: "exact_duplicate",
    description: "Exact SHA-256 hash match with a previous submission within 30 days",
    triggerLogic: "SHA-256 of normalized text matches user's prior submission",
    severity: "critical",
    blocksApproval: true,
    lowersConfidence: true,
    recommendsFollowup: false,
    recommendsEscalation: false,
    falsePositiveRisk: "low",
    associatedReasonCode: "duplicate_exact",
  },
  near_duplicate: {
    name: "near_duplicate",
    description: "High text similarity (>80%) with a recent submission",
    triggerLogic: "Trigram or token overlap >80% with user's submissions in last 30 days",
    severity: "high",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "medium",
    associatedReasonCode: "duplicate_near",
  },
  boilerplate_text: {
    name: "boilerplate_text",
    description: "Submission matches known boilerplate or template patterns",
    triggerLogic: "Text matches generic phrase list or has <3 unique tokens after stop-word removal",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "medium",
    associatedReasonCode: "boilerplate_detected",
  },
  suspicious_timing: {
    name: "suspicious_timing",
    description: "Abnormally rapid submission pattern",
    triggerLogic: "3+ submissions within 10 minutes or 10+ within 1 hour",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: false,
    recommendsEscalation: true,
    falsePositiveRisk: "medium",
    associatedReasonCode: "suspicious_timing",
  },
  low_information: {
    name: "low_information",
    description: "Text has very low information density (few unique meaningful tokens)",
    triggerLogic: "Unique non-stopword tokens < 5, or Shannon entropy < 2.0",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "medium",
    associatedReasonCode: "low_information_content",
  },
  mission_mismatch: {
    name: "mission_mismatch",
    description: "Proof content does not match mission title or category",
    triggerLogic: "Relevance score < 0.3 from rubric evaluation",
    severity: "high",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "low",
    associatedReasonCode: "mission_mismatch",
  },
  repeated_followup_trigger: {
    name: "repeated_followup_trigger",
    description: "User repeatedly triggers follow-up requests across submissions",
    triggerLogic: "3+ follow-up verdicts in last 7 days for same user",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: false,
    recommendsEscalation: true,
    falsePositiveRisk: "high",
    associatedReasonCode: "suspicious_pattern",
  },
  volume_spike: {
    name: "volume_spike",
    description: "Unusually high submission volume for this user",
    triggerLogic: "Daily submissions > 2x user's 7-day average or > 15 in 24 hours",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: false,
    recommendsEscalation: true,
    falsePositiveRisk: "medium",
    associatedReasonCode: "suspicious_volume",
  },
  content_reuse: {
    name: "content_reuse",
    description: "Significant content overlap across different missions",
    triggerLogic: "Same text blocks reused across 3+ different mission submissions",
    severity: "high",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: true,
    falsePositiveRisk: "medium",
    associatedReasonCode: "duplicate_near",
  },
  duration_implausible: {
    name: "duration_implausible",
    description: "Session duration significantly deviates from target",
    triggerLogic: "actualDuration < 20% of targetDuration or > 400% of targetDuration",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "high",
    associatedReasonCode: "duration_implausible",
  },
  high_distraction: {
    name: "high_distraction",
    description: "Excessive app-leave events during focus session",
    triggerLogic: "distractionCount > 10 or distractionCount > targetDurationMinutes",
    severity: "low",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: false,
    recommendsEscalation: false,
    falsePositiveRisk: "high",
    associatedReasonCode: "high_distraction",
  },
  generic_phrases: {
    name: "generic_phrases",
    description: "Submission contains only generic completion phrases",
    triggerLogic: "Matches GENERIC_PHRASES list from pre-screen",
    severity: "medium",
    blocksApproval: false,
    lowersConfidence: true,
    recommendsFollowup: true,
    recommendsEscalation: false,
    falsePositiveRisk: "low",
    associatedReasonCode: "explanation_generic",
  },
};

export interface SignalEvaluationResult {
  signalName: AntiGamingSignalName;
  triggered: boolean;
  severity: AntiGamingSignalDefinition["severity"];
  details?: string;
}

export interface SignalEvaluationInput {
  textSummary: string | null;
  textLength: number;
  isDuplicate: boolean;
  distractionCount: number;
  targetDurationMinutes: number;
  actualDurationMinutes: number;
  recentFollowupCount: number;
  recentSubmissionCount24h: number;
  userAvgDailySubmissions: number;
  recentSubmissionTimestamps?: number[];
  rubricRelevanceScore?: number;
}

const GENERIC_PHRASES = [
  "done", "finished", "completed", "i did it", "task complete",
  "i did this", "all done", "mission complete", "finished the task",
  "completed the mission", "did it", "yes", "yep", "done it",
];

export function evaluateSignals(input: SignalEvaluationInput): SignalEvaluationResult[] {
  const results: SignalEvaluationResult[] = [];

  results.push({
    signalName: "exact_duplicate",
    triggered: input.isDuplicate,
    severity: "critical",
    details: input.isDuplicate ? "Exact hash match detected" : undefined,
  });

  const normalizedText = (input.textSummary ?? "").toLowerCase().trim();

  if (normalizedText.length > 0) {
    const words = normalizedText.split(/\s+/).filter(w => w.length > 2);
    const stopWords = new Set(["the", "and", "for", "was", "that", "this", "with", "have", "from", "they", "been", "has", "its", "are", "were", "had", "not", "but", "what", "all", "can", "her", "his", "one", "our", "out"]);
    const meaningfulWords = words.filter(w => !stopWords.has(w));
    const uniqueWords = new Set(meaningfulWords);
    const isLowInfo = uniqueWords.size < 5 && input.textLength > 10;
    results.push({
      signalName: "low_information",
      triggered: isLowInfo,
      severity: "medium",
      details: isLowInfo ? `Only ${uniqueWords.size} unique meaningful words` : undefined,
    });

    const isGeneric = GENERIC_PHRASES.some(phrase => normalizedText === phrase || normalizedText.startsWith(phrase + " ") || normalizedText.startsWith(phrase + "."));
    results.push({
      signalName: "generic_phrases",
      triggered: isGeneric,
      severity: "medium",
      details: isGeneric ? "Matches generic completion phrase" : undefined,
    });

    const isBoilerplate = uniqueWords.size < 3 && input.textLength > 5;
    results.push({
      signalName: "boilerplate_text",
      triggered: isBoilerplate,
      severity: "medium",
      details: isBoilerplate ? `Only ${uniqueWords.size} unique non-stop words` : undefined,
    });
  }

  const durationRatio = input.targetDurationMinutes > 0
    ? input.actualDurationMinutes / input.targetDurationMinutes
    : 1;
  const isImplausible = durationRatio < 0.2 || durationRatio > 4.0;
  results.push({
    signalName: "duration_implausible",
    triggered: isImplausible,
    severity: "medium",
    details: isImplausible ? `Duration ratio: ${durationRatio.toFixed(2)}` : undefined,
  });

  const isHighDistraction = input.distractionCount > 10 ||
    (input.targetDurationMinutes > 0 && input.distractionCount > input.targetDurationMinutes);
  results.push({
    signalName: "high_distraction",
    triggered: isHighDistraction,
    severity: "low",
    details: isHighDistraction ? `Distraction count: ${input.distractionCount}` : undefined,
  });

  const isVolumeSpike = input.recentSubmissionCount24h > 15 ||
    (input.userAvgDailySubmissions > 0 && input.recentSubmissionCount24h > input.userAvgDailySubmissions * 2);
  results.push({
    signalName: "volume_spike",
    triggered: isVolumeSpike,
    severity: "medium",
    details: isVolumeSpike ? `24h submissions: ${input.recentSubmissionCount24h}` : undefined,
  });

  const isRepeatedFollowup = input.recentFollowupCount >= 3;
  results.push({
    signalName: "repeated_followup_trigger",
    triggered: isRepeatedFollowup,
    severity: "medium",
    details: isRepeatedFollowup ? `Recent follow-ups: ${input.recentFollowupCount}` : undefined,
  });

  if (input.recentSubmissionTimestamps && input.recentSubmissionTimestamps.length >= 3) {
    const sorted = [...input.recentSubmissionTimestamps].sort((a, b) => b - a);
    const tenMinutesMs = 10 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;
    const now = Date.now();
    const inTenMin = sorted.filter(t => now - t < tenMinutesMs).length;
    const inOneHour = sorted.filter(t => now - t < oneHourMs).length;
    const isSuspiciousTiming = inTenMin >= 3 || inOneHour >= 10;
    results.push({
      signalName: "suspicious_timing",
      triggered: isSuspiciousTiming,
      severity: "medium",
      details: isSuspiciousTiming ? `${inTenMin} in 10min, ${inOneHour} in 1hr` : undefined,
    });
  }

  if (input.rubricRelevanceScore !== undefined && input.rubricRelevanceScore < 0.3) {
    results.push({
      signalName: "mission_mismatch",
      triggered: true,
      severity: "high",
      details: `Relevance score: ${input.rubricRelevanceScore.toFixed(2)}`,
    });
  }

  return results.filter(r => r.triggered);
}
