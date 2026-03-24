import { ReviewCadence, RecommendationConfidence } from "./tuningTypes.js";

export interface InterpretationRule {
  id: string;
  label: string;
  description: string;
  enforcement: "hard" | "advisory";
}

export const DATA_INTERPRETATION_RULES: InterpretationRule[] = [
  {
    id: "min-sample-size",
    label: "Minimum sample size",
    description: "Do not act on metrics with fewer than 30 data points (e.g., proofs, purchases, events). For user-level metrics, minimum 10 active users in the measurement window.",
    enforcement: "hard",
  },
  {
    id: "min-observation-window",
    label: "Minimum observation window",
    description: "After a tuning change, wait the full observation window before judging results. Economy/trust: 7 days. Prestige: 14 days. No exceptions except emergency rollbacks.",
    enforcement: "hard",
  },
  {
    id: "launch-week-caution",
    label: "Launch week caution",
    description: "During the first 7 days after launch or major update, treat all metrics as directional only. Do not make tuning decisions based on launch-week data unless an emergency (reward failure, trust collapse) is detected.",
    enforcement: "advisory",
  },
  {
    id: "cohort-vs-global",
    label: "Cohort vs global interpretation",
    description: "When possible, compare new-user cohort metrics against returning-user metrics. A global improvement that masks new-user degradation is not a real improvement.",
    enforcement: "advisory",
  },
  {
    id: "config-change-attribution",
    label: "Config change attribution limits",
    description: "Only attribute metric changes to a config update if: (1) the change happened within the observation window, (2) no other domain was tuned simultaneously, (3) no live ops event was running that could confound.",
    enforcement: "advisory",
  },
  {
    id: "single-metric-overreaction",
    label: "Single metric overreaction prevention",
    description: "Never tune based on a single metric in isolation. Always check at least 2 supporting metrics. Example: don't lower trust threshold based only on follow-up rate — also check reject rate and support cases.",
    enforcement: "hard",
  },
  {
    id: "leading-vs-lagging",
    label: "Leading vs lagging signal interpretation",
    description: "Leading signals (follow-up rate, suspicious signals) warrant faster review. Lagging signals (retention, category adoption) require longer observation. Do not treat lagging signals as immediate action triggers.",
    enforcement: "advisory",
  },
  {
    id: "correlation-vs-causation",
    label: "Correlation vs causation warning",
    description: "Two metrics moving together does not mean one caused the other. Especially true for economy + engagement metrics (more engagement naturally means more coins minted).",
    enforcement: "advisory",
  },
];

export enum SignalStrength {
  ACTION_WORTHY = "action_worthy",
  DIRECTIONAL = "directional",
  INSUFFICIENT = "insufficient",
  CONFLICTING = "conflicting",
}

export interface SignalAssessment {
  strength: SignalStrength;
  sampleSize: number;
  observationDays: number;
  supportingMetrics: number;
  confidence: RecommendationConfidence;
  notes: string;
}

export function assessSignalStrength(input: {
  sampleSize: number;
  observationDays: number;
  supportingMetricsChecked: number;
  isLaunchWeek: boolean;
  hasConfoundingEvent: boolean;
}): SignalAssessment {
  if (input.sampleSize < 30) {
    return {
      strength: SignalStrength.INSUFFICIENT,
      sampleSize: input.sampleSize,
      observationDays: input.observationDays,
      supportingMetrics: input.supportingMetricsChecked,
      confidence: RecommendationConfidence.INSUFFICIENT_DATA,
      notes: `Sample size ${input.sampleSize} below minimum 30. Wait for more data.`,
    };
  }

  if (input.isLaunchWeek) {
    return {
      strength: SignalStrength.DIRECTIONAL,
      sampleSize: input.sampleSize,
      observationDays: input.observationDays,
      supportingMetrics: input.supportingMetricsChecked,
      confidence: RecommendationConfidence.LOW,
      notes: "Launch week — treat as directional only. Do not tune unless emergency.",
    };
  }

  if (input.hasConfoundingEvent) {
    return {
      strength: SignalStrength.CONFLICTING,
      sampleSize: input.sampleSize,
      observationDays: input.observationDays,
      supportingMetrics: input.supportingMetricsChecked,
      confidence: RecommendationConfidence.LOW,
      notes: "Confounding event detected (live ops event or simultaneous config change). Attribution unclear.",
    };
  }

  if (input.supportingMetricsChecked < 2) {
    return {
      strength: SignalStrength.DIRECTIONAL,
      sampleSize: input.sampleSize,
      observationDays: input.observationDays,
      supportingMetrics: input.supportingMetricsChecked,
      confidence: RecommendationConfidence.MEDIUM,
      notes: "Only 1 supporting metric checked. Review additional metrics before acting.",
    };
  }

  if (input.observationDays >= 7 && input.sampleSize >= 100) {
    return {
      strength: SignalStrength.ACTION_WORTHY,
      sampleSize: input.sampleSize,
      observationDays: input.observationDays,
      supportingMetrics: input.supportingMetricsChecked,
      confidence: RecommendationConfidence.HIGH,
      notes: "Sufficient data and observation window. Signal is action-worthy.",
    };
  }

  return {
    strength: SignalStrength.DIRECTIONAL,
    sampleSize: input.sampleSize,
    observationDays: input.observationDays,
    supportingMetrics: input.supportingMetricsChecked,
    confidence: RecommendationConfidence.MEDIUM,
    notes: "Signal is directional. Consider extending observation window for higher confidence.",
  };
}

export function getInterpretationRules(): InterpretationRule[] {
  return [...DATA_INTERPRETATION_RULES];
}
