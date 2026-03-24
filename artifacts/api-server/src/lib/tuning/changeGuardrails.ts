import { TuningDomain, TuningChangeType, TuningChangeStatus, type TuningLever, type TuningChangeEntry } from "./tuningTypes.js";
import { getLeverById, DOMAIN_MIN_OBSERVATION_DAYS } from "./tuningConfig.js";

export interface GuardrailResult {
  allowed: boolean;
  reason: string | null;
  warnings: string[];
}

export function validateTuningChange(
  leverId: string,
  newValue: unknown,
  changeType: TuningChangeType,
  activeChanges: TuningChangeEntry[],
): GuardrailResult {
  const lever = getLeverById(leverId);
  if (!lever) {
    return { allowed: false, reason: `Unknown lever: ${leverId}`, warnings: [] };
  }

  const warnings: string[] = [];

  if (typeof newValue === "number" && lever.safeRange) {
    if (newValue < lever.safeRange.min || newValue > lever.safeRange.max) {
      return {
        allowed: false,
        reason: `Value ${newValue} outside safe range [${lever.safeRange.min}, ${lever.safeRange.max}] for ${lever.label}`,
        warnings: [],
      };
    }

    const currentVal = lever.currentValueFn() as number;
    if (typeof currentVal === "number" && currentVal > 0) {
      const changePct = Math.abs((newValue - currentVal) / currentVal) * 100;
      if (changePct > 25 && changeType !== TuningChangeType.EMERGENCY) {
        warnings.push(`Large change (${changePct.toFixed(0)}% shift). Consider a smaller adjustment.`);
      }
    }
  }

  if (changeType !== TuningChangeType.EMERGENCY) {
    const observingInDomain = activeChanges.filter(
      c => c.domain === lever.domain && c.status === TuningChangeStatus.OBSERVING
    );
    if (observingInDomain.length > 0) {
      const existing = observingInDomain[0];
      if (!isObservationWindowComplete(existing)) {
        return {
          allowed: false,
          reason: `Domain ${lever.domain} has an active observation (${existing.leverLabel}, ends ${existing.observationEndsAt}). Wait for observation to complete or use emergency change type to override.`,
          warnings: [],
        };
      }
    }
  }

  const currentValue = lever.currentValueFn();
  if (JSON.stringify(currentValue) === JSON.stringify(newValue)) {
    return { allowed: false, reason: "New value is same as current value", warnings: [] };
  }

  for (const unsafeDesc of lever.unsafeChanges) {
    warnings.push(`Safety note: ${unsafeDesc}`);
  }

  return { allowed: true, reason: null, warnings };
}

export function getMinObservationDays(domain: TuningDomain, changeType: TuningChangeType): number {
  if (changeType === TuningChangeType.EMERGENCY) return 1;
  return DOMAIN_MIN_OBSERVATION_DAYS[domain];
}

export function isObservationWindowComplete(change: TuningChangeEntry): boolean {
  const endsAt = new Date(change.observationEndsAt);
  return new Date() >= endsAt;
}

export function validatePrestigeWeightSum(weights: Record<string, number>): GuardrailResult {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const rounded = Math.round(sum * 100) / 100;
  if (rounded !== 1.0) {
    return {
      allowed: false,
      reason: `Prestige signal weights must sum to 1.0, got ${rounded}`,
      warnings: [],
    };
  }
  return { allowed: true, reason: null, warnings: [] };
}
