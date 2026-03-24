import {
  RoutingClass,
  ConfidenceLevel,
  TrustRiskLevel,
  Verdict,
  type VerdictType,
  type AntiGamingSignalName,
} from "./verdictTypes.js";

export interface RoutingInput {
  confidenceLevel: ConfidenceLevel;
  riskLevel: TrustRiskLevel;
  suspiciousSignals: AntiGamingSignalName[];
  userTrustScore: number;
  hasImages: boolean;
  textLength: number;
  isFollowup: boolean;
  isDuplicate: boolean;
  preScreenPassed: boolean;
  providerAvailable: boolean;
}

export interface RoutingDecision {
  routingClass: RoutingClass;
  preferredProviderTier: "fast" | "standard" | "strong" | "rule_fallback";
  allowedVerdicts: VerdictType[];
  rewardSafetyConstraint: "full" | "capped" | "blocked";
  escalationBehavior: "none" | "recommend" | "required";
  loggingLevel: "standard" | "detailed" | "full_audit";
}

export const ROUTING_DEFINITIONS: Record<RoutingClass, {
  description: string;
  examples: string[];
}> = {
  [RoutingClass.EASY_CLEAN]: {
    description: "Valid structured submission with no suspicious signals, strong evidence, low ambiguity",
    examples: [
      "Detailed text proof with specific outcomes and numbers",
      "Image proof with matching description, high trust user",
      "Follow-up that clearly resolves previous questions",
    ],
  },
  [RoutingClass.AMBIGUOUS]: {
    description: "Some effort present but insufficient detail, unclear evidence, borderline quality",
    examples: [
      "Short text with some relevant content but lacking specifics",
      "Image attached but weak text explanation",
      "Moderate confidence with no suspicious signals",
    ],
  },
  [RoutingClass.RISKY]: {
    description: "Near-duplicate proof, repeated low-effort patterns, suspicious timing or volume",
    examples: [
      "Text highly similar to recent submission",
      "Multiple rapid submissions with minimal variation",
      "Low trust user with generic content",
      "Multiple anti-gaming signals triggered",
    ],
  },
  [RoutingClass.SYSTEM_FAILURE]: {
    description: "Provider timeout, malformed response, unavailable provider",
    examples: [
      "All AI providers failed",
      "Provider returned unparseable response",
      "Network timeout on all attempts",
    ],
  },
};

export function classifyRoute(input: RoutingInput): RoutingDecision {
  if (!input.providerAvailable) {
    return {
      routingClass: RoutingClass.SYSTEM_FAILURE,
      preferredProviderTier: "rule_fallback",
      allowedVerdicts: [Verdict.FOLLOWUP_NEEDED, Verdict.SYSTEM_ERROR, Verdict.PARTIAL],
      rewardSafetyConstraint: "blocked",
      escalationBehavior: "recommend",
      loggingLevel: "full_audit",
    };
  }

  if (input.isDuplicate) {
    return {
      routingClass: RoutingClass.RISKY,
      preferredProviderTier: "rule_fallback",
      allowedVerdicts: [Verdict.REJECTED, Verdict.FLAGGED],
      rewardSafetyConstraint: "blocked",
      escalationBehavior: "none",
      loggingLevel: "detailed",
    };
  }

  if (!input.preScreenPassed) {
    return {
      routingClass: RoutingClass.RISKY,
      preferredProviderTier: "rule_fallback",
      allowedVerdicts: [Verdict.REJECTED, Verdict.FOLLOWUP_NEEDED],
      rewardSafetyConstraint: "blocked",
      escalationBehavior: "none",
      loggingLevel: "standard",
    };
  }

  const signalCount = input.suspiciousSignals.length;
  const isLowTrust = input.userTrustScore < 0.4;

  if (signalCount >= 3 || (signalCount >= 2 && isLowTrust)) {
    return {
      routingClass: RoutingClass.RISKY,
      preferredProviderTier: "strong",
      allowedVerdicts: [Verdict.APPROVED, Verdict.PARTIAL, Verdict.REJECTED, Verdict.FOLLOWUP_NEEDED, Verdict.FLAGGED, Verdict.MANUAL_REVIEW],
      rewardSafetyConstraint: "blocked",
      escalationBehavior: "required",
      loggingLevel: "full_audit",
    };
  }

  if (signalCount >= 1 || isLowTrust) {
    return {
      routingClass: RoutingClass.RISKY,
      preferredProviderTier: "standard",
      allowedVerdicts: [Verdict.APPROVED, Verdict.PARTIAL, Verdict.REJECTED, Verdict.FOLLOWUP_NEEDED, Verdict.FLAGGED],
      rewardSafetyConstraint: "capped",
      escalationBehavior: "recommend",
      loggingLevel: "detailed",
    };
  }

  if (input.textLength < 50 || (!input.hasImages && input.textLength < 100)) {
    return {
      routingClass: RoutingClass.AMBIGUOUS,
      preferredProviderTier: "standard",
      allowedVerdicts: [Verdict.APPROVED, Verdict.PARTIAL, Verdict.FOLLOWUP_NEEDED, Verdict.REJECTED],
      rewardSafetyConstraint: "capped",
      escalationBehavior: "none",
      loggingLevel: "standard",
    };
  }

  return {
    routingClass: RoutingClass.EASY_CLEAN,
    preferredProviderTier: "fast",
    allowedVerdicts: [Verdict.APPROVED, Verdict.PARTIAL, Verdict.FOLLOWUP_NEEDED],
    rewardSafetyConstraint: "full",
    escalationBehavior: "none",
    loggingLevel: "standard",
  };
}

export function enforceVerdictSafety(
  verdict: VerdictType,
  decision: RoutingDecision
): VerdictType {
  if (decision.allowedVerdicts.includes(verdict)) return verdict;

  if (decision.routingClass === RoutingClass.SYSTEM_FAILURE) {
    return Verdict.FOLLOWUP_NEEDED;
  }

  if (decision.rewardSafetyConstraint === "blocked") {
    if (decision.allowedVerdicts.includes(Verdict.REJECTED)) return Verdict.REJECTED;
    if (decision.allowedVerdicts.includes(Verdict.FLAGGED)) return Verdict.FLAGGED;
    return Verdict.FOLLOWUP_NEEDED;
  }

  if (verdict === Verdict.APPROVED && decision.rewardSafetyConstraint === "capped") {
    return Verdict.PARTIAL;
  }

  return Verdict.FOLLOWUP_NEEDED;
}

export function getProviderTierOrder(tier: RoutingDecision["preferredProviderTier"]): string[] {
  switch (tier) {
    case "fast":
      return ["groq", "gemini_flash", "openai_mini", "openai_full", "rules_enhanced"];
    case "standard":
      return ["gemini_flash", "openai_mini", "groq", "openai_full", "rules_enhanced"];
    case "strong":
      return ["openai_full", "openai_mini", "gemini_flash", "rules_enhanced"];
    case "rule_fallback":
      return ["rules_enhanced"];
  }
}
