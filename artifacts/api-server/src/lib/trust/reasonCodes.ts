import type { ReasonCode, VerdictType } from "./verdictTypes.js";

export interface ReasonDefinition {
  code: ReasonCode;
  category: "evidence" | "explanation" | "duplication" | "suspicion" | "confidence" | "provider" | "submission" | "followup" | "trust";
  userFacingMessage: string;
  operatorDetail: string;
  severity: "info" | "warning" | "critical";
}

export const REASON_DEFINITIONS: Record<ReasonCode, ReasonDefinition> = {
  evidence_clear: {
    code: "evidence_clear",
    category: "evidence",
    userFacingMessage: "Your proof clearly demonstrates the work you completed.",
    operatorDetail: "Submission contains clear, specific evidence matching mission requirements.",
    severity: "info",
  },
  evidence_detailed: {
    code: "evidence_detailed",
    category: "evidence",
    userFacingMessage: "Excellent detail in your submission — strong proof of effort.",
    operatorDetail: "Above-average specificity and detail in proof text/files.",
    severity: "info",
  },
  evidence_consistent: {
    code: "evidence_consistent",
    category: "evidence",
    userFacingMessage: "Your proof is consistent with the mission requirements.",
    operatorDetail: "Evidence aligns with mission type, duration, and category expectations.",
    severity: "info",
  },
  evidence_insufficient: {
    code: "evidence_insufficient",
    category: "evidence",
    userFacingMessage: "We need more detail about what you accomplished. Try describing specific actions, results, or learnings.",
    operatorDetail: "Proof lacks sufficient detail to verify completion. Rubric scores below threshold.",
    severity: "warning",
  },
  evidence_partial: {
    code: "evidence_partial",
    category: "evidence",
    userFacingMessage: "We can see some effort, but the evidence doesn't fully demonstrate completion. Partial credit awarded.",
    operatorDetail: "Evidence is present but borderline. Partial verdict applied.",
    severity: "info",
  },
  explanation_too_short: {
    code: "explanation_too_short",
    category: "explanation",
    userFacingMessage: "Your description is too brief. Please provide more detail about what you did and what you learned.",
    operatorDetail: "Text summary below minimum length threshold.",
    severity: "warning",
  },
  explanation_generic: {
    code: "explanation_generic",
    category: "explanation",
    userFacingMessage: "Your description seems generic. Please share specific details — what exactly did you do, create, or learn?",
    operatorDetail: "Generic phrases detected in submission text.",
    severity: "warning",
  },
  explanation_detailed: {
    code: "explanation_detailed",
    category: "explanation",
    userFacingMessage: "Great level of detail in your explanation.",
    operatorDetail: "Explanation exceeds expected detail level for category.",
    severity: "info",
  },
  duplicate_exact: {
    code: "duplicate_exact",
    category: "duplication",
    userFacingMessage: "This proof appears identical to a previous submission. Each mission requires unique evidence of new work.",
    operatorDetail: "SHA-256 hash match with previous submission within 30-day window.",
    severity: "critical",
  },
  duplicate_near: {
    code: "duplicate_near",
    category: "duplication",
    userFacingMessage: "This proof is very similar to a recent submission. Please provide evidence of new, distinct work.",
    operatorDetail: "Near-duplicate detected via text similarity analysis.",
    severity: "warning",
  },
  suspicious_pattern: {
    code: "suspicious_pattern",
    category: "suspicion",
    userFacingMessage: "We need additional verification for this submission. Please provide more specific details.",
    operatorDetail: "Multiple anti-gaming signals triggered on this submission.",
    severity: "warning",
  },
  suspicious_timing: {
    code: "suspicious_timing",
    category: "suspicion",
    userFacingMessage: "We need additional verification for this submission.",
    operatorDetail: "Submission timing pattern flagged as unusual (rapid-fire or off-pattern).",
    severity: "warning",
  },
  suspicious_volume: {
    code: "suspicious_volume",
    category: "suspicion",
    userFacingMessage: "We need additional verification for this submission.",
    operatorDetail: "Unusually high submission volume detected for this user.",
    severity: "warning",
  },
  mission_mismatch: {
    code: "mission_mismatch",
    category: "evidence",
    userFacingMessage: "Your proof doesn't seem to match the mission requirements. Make sure your evidence relates to the specific mission.",
    operatorDetail: "Low relevance score — proof content does not align with mission title/category.",
    severity: "warning",
  },
  category_mismatch: {
    code: "category_mismatch",
    category: "evidence",
    userFacingMessage: "Your proof doesn't align with this mission's category. Please provide category-relevant evidence.",
    operatorDetail: "Evidence category keywords do not match mission category.",
    severity: "warning",
  },
  low_confidence: {
    code: "low_confidence",
    category: "confidence",
    userFacingMessage: "We're not fully confident in this evaluation. Additional detail would help.",
    operatorDetail: "Composite confidence score below LOW threshold.",
    severity: "warning",
  },
  medium_confidence: {
    code: "medium_confidence",
    category: "confidence",
    userFacingMessage: "",
    operatorDetail: "Composite confidence score in MEDIUM range.",
    severity: "info",
  },
  high_confidence: {
    code: "high_confidence",
    category: "confidence",
    userFacingMessage: "",
    operatorDetail: "Composite confidence score in HIGH range.",
    severity: "info",
  },
  provider_failure_fallback: {
    code: "provider_failure_fallback",
    category: "provider",
    userFacingMessage: "We used our backup evaluation system for this submission. Your proof was still fairly reviewed.",
    operatorDetail: "All AI providers failed. Enhanced rule-based fallback used.",
    severity: "warning",
  },
  provider_timeout: {
    code: "provider_timeout",
    category: "provider",
    userFacingMessage: "Our review system experienced a delay. Please try again in a few minutes.",
    operatorDetail: "AI provider timed out. No verdict rendered.",
    severity: "critical",
  },
  provider_malformed: {
    code: "provider_malformed",
    category: "provider",
    userFacingMessage: "Our review system encountered an issue. Please try again.",
    operatorDetail: "AI provider returned malformed/unparseable response.",
    severity: "critical",
  },
  incomplete_submission: {
    code: "incomplete_submission",
    category: "submission",
    userFacingMessage: "Your submission is missing some required elements. Check the mission requirements and try again.",
    operatorDetail: "Submission missing required proof components (text, files, or links).",
    severity: "warning",
  },
  empty_submission: {
    code: "empty_submission",
    category: "submission",
    userFacingMessage: "No proof was provided. Please submit evidence of your work.",
    operatorDetail: "Submission contains no text, files, or links.",
    severity: "critical",
  },
  strong_consistency_signal: {
    code: "strong_consistency_signal",
    category: "evidence",
    userFacingMessage: "Your submission shows strong consistency with expected effort patterns.",
    operatorDetail: "Evidence strongly consistent with mission type, category, and duration expectations.",
    severity: "info",
  },
  duration_implausible: {
    code: "duration_implausible",
    category: "suspicion",
    userFacingMessage: "The session duration seems unusual for this type of mission. Please provide additional details.",
    operatorDetail: "Actual duration significantly deviates from target duration.",
    severity: "warning",
  },
  high_distraction: {
    code: "high_distraction",
    category: "suspicion",
    userFacingMessage: "Frequent interruptions were detected during your session.",
    operatorDetail: "High distraction count recorded during focus session.",
    severity: "info",
  },
  boilerplate_detected: {
    code: "boilerplate_detected",
    category: "duplication",
    userFacingMessage: "Your submission looks like a template. Please describe your specific work in your own words.",
    operatorDetail: "Text matches known boilerplate patterns or previous submissions' structure.",
    severity: "warning",
  },
  low_information_content: {
    code: "low_information_content",
    category: "evidence",
    userFacingMessage: "Your proof doesn't contain enough specific information. What exactly did you accomplish?",
    operatorDetail: "Low information density — text lacks specific numbers, actions, or outcomes.",
    severity: "warning",
  },
  file_evidence_strong: {
    code: "file_evidence_strong",
    category: "evidence",
    userFacingMessage: "Your attached files provide strong supporting evidence.",
    operatorDetail: "File content corroborates text submission effectively.",
    severity: "info",
  },
  file_evidence_weak: {
    code: "file_evidence_weak",
    category: "evidence",
    userFacingMessage: "Your attached files don't clearly support the mission. Try including screenshots or photos of your work.",
    operatorDetail: "File content does not meaningfully support the submission.",
    severity: "warning",
  },
  link_evidence_present: {
    code: "link_evidence_present",
    category: "evidence",
    userFacingMessage: "Links noted as supporting evidence.",
    operatorDetail: "External links provided as part of proof.",
    severity: "info",
  },
  followup_improved: {
    code: "followup_improved",
    category: "followup",
    userFacingMessage: "Your additional details helped clarify the submission.",
    operatorDetail: "Follow-up response improved evidence quality above threshold.",
    severity: "info",
  },
  followup_insufficient: {
    code: "followup_insufficient",
    category: "followup",
    userFacingMessage: "The additional details provided still don't fully demonstrate completion.",
    operatorDetail: "Follow-up response did not improve evidence quality sufficiently.",
    severity: "warning",
  },
  multiple_risk_signals: {
    code: "multiple_risk_signals",
    category: "suspicion",
    userFacingMessage: "We need additional verification for this submission.",
    operatorDetail: "Multiple anti-gaming signals fired simultaneously. Escalation recommended.",
    severity: "critical",
  },
  trust_score_low: {
    code: "trust_score_low",
    category: "trust",
    userFacingMessage: "",
    operatorDetail: "User trust score below elevated threshold. Stricter evaluation applied.",
    severity: "info",
  },
  trust_score_recovery: {
    code: "trust_score_recovery",
    category: "trust",
    userFacingMessage: "",
    operatorDetail: "User trust score recovering from previous low. Moderate evaluation applied.",
    severity: "info",
  },
  auto_partial_cap: {
    code: "auto_partial_cap",
    category: "followup",
    userFacingMessage: "After reviewing your follow-up responses, we've awarded partial credit for your effort.",
    operatorDetail: "Max follow-up attempts reached. Auto-resolved to partial verdict.",
    severity: "info",
  },
};

export function getUserExplanation(reasons: ReasonCode[]): string {
  const messages = reasons
    .map((code) => REASON_DEFINITIONS[code]?.userFacingMessage)
    .filter((msg) => msg && msg.length > 0);

  if (messages.length === 0) return "Your submission has been reviewed.";
  return messages.join(" ");
}

export function getOperatorExplanation(reasons: ReasonCode[]): string {
  return reasons
    .map((code) => `[${code}] ${REASON_DEFINITIONS[code]?.operatorDetail ?? "Unknown reason code"}`)
    .join(" | ");
}

export function getReasonsByVerdict(verdict: VerdictType): ReasonCode[] {
  const verdictReasonMap: Record<string, ReasonCode[]> = {
    approved: ["evidence_clear", "high_confidence"],
    partial: ["evidence_partial", "medium_confidence"],
    rejected: ["evidence_insufficient"],
    flagged: ["suspicious_pattern", "multiple_risk_signals"],
    followup_needed: ["evidence_insufficient", "low_confidence"],
    manual_review: ["multiple_risk_signals"],
    system_error: ["provider_failure_fallback"],
  };
  return verdictReasonMap[verdict] ?? [];
}
