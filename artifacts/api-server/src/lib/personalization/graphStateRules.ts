import {
  DisciplineState,
  TrustProofState,
  MomentumState,
  ProgressionState,
  EconomyState,
  IdentityMotivation,
  type GraphRawSignals,
  type ComebackState,
} from "./graphTypes.js";
import { PERSONALIZATION_CONFIG } from "./personalizationConfig.js";

export function classifyDiscipline(s: GraphRawSignals): DisciplineState {
  const completionRate = s.totalMissions14d > 0 ? s.completedMissions14d / s.totalMissions14d : 0;
  const c = PERSONALIZATION_CONFIG.discipline;

  if (s.currentStreak >= c.highlyConsistentStreakMin && completionRate >= c.highlyConsistentCompletionMin) {
    return DisciplineState.HIGHLY_CONSISTENT;
  }
  if (s.currentStreak >= c.consistentStreakMin && completionRate >= c.consistentCompletionMin) {
    return DisciplineState.CONSISTENT;
  }
  if (completionRate >= c.buildingCompletionMin || s.currentStreak >= c.buildingStreakMin) {
    return DisciplineState.BUILDING;
  }
  return DisciplineState.UNSTABLE;
}

export function classifyTrustProof(s: GraphRawSignals): TrustProofState {
  const c = PERSONALIZATION_CONFIG.trustProof;

  if (s.trustScore < c.trustSensitiveThreshold) {
    return TrustProofState.TRUST_SENSITIVE;
  }

  if (s.totalProofs14d === 0) {
    return TrustProofState.CLEAN_CONFIDENT;
  }

  const approvalRate = s.approvedProofs14d / s.totalProofs14d;
  const followupRate = s.followupProofs14d / s.totalProofs14d;

  if (approvalRate >= c.cleanConfidentApprovalMin && s.avgProofQuality14d >= c.cleanConfidentQualityMin) {
    return TrustProofState.CLEAN_CONFIDENT;
  }
  if (followupRate >= c.needsBetterEvidenceFollowupMin || approvalRate < c.borderlineApprovalMax) {
    return TrustProofState.NEEDS_BETTER_EVIDENCE;
  }
  if (s.avgProofQuality14d < c.borderlineQualityMax) {
    return TrustProofState.BORDERLINE_QUALITY;
  }
  return TrustProofState.CLEAN_CONFIDENT;
}

export function classifyMomentum(s: GraphRawSignals): MomentumState {
  const c = PERSONALIZATION_CONFIG.momentum;

  if (s.daysSinceLastActive >= c.inactiveThresholdDays) {
    return MomentumState.INACTIVE;
  }

  if (s.daysSinceLastActive >= c.reactivatingMinDays && s.completedMissions14d > 0) {
    return MomentumState.REACTIVATING;
  }

  if (s.daysSinceLastActive >= c.stalledMinDays && s.rejectedProofs14d > s.approvedProofs14d) {
    return MomentumState.STALLED_AFTER_SETBACK;
  }

  const completionRate = s.totalMissions14d > 0 ? s.completedMissions14d / s.totalMissions14d : 0;
  if (completionRate >= c.surgingCompletionMin && s.completedMissions14d >= c.surgingMissionMin) {
    return MomentumState.SURGING;
  }

  if (s.completedMissions14d > 0 || s.daysSinceLastActive <= 2) {
    return MomentumState.ACTIVE;
  }

  return MomentumState.STALLED_AFTER_SETBACK;
}

export function classifyProgression(s: GraphRawSignals): ProgressionState {
  const c = PERSONALIZATION_CONFIG.progression;

  if (s.level <= c.earlyBuildMaxLevel && s.accountAgeDays <= c.earlyBuildMaxDays) {
    return ProgressionState.EARLY_BUILD;
  }

  if (s.level >= c.advancedPushMinLevel && s.avgSkillLevel >= c.advancedPushMinAvgSkill) {
    return ProgressionState.ADVANCED_PUSH;
  }

  const levelVelocity = s.accountAgeDays > 0 ? s.level / s.accountAgeDays : 0;
  if (levelVelocity < c.plateauRiskVelocityMax && s.level >= c.plateauRiskMinLevel) {
    return ProgressionState.PLATEAU_RISK;
  }

  return ProgressionState.STEADY_GROWTH;
}

export function classifyEconomy(s: GraphRawSignals): EconomyState {
  const c = PERSONALIZATION_CONFIG.economy;

  if (s.spentCoins30d === 0 && s.ownedItemCount <= c.noFirstPurchaseMaxItems) {
    return EconomyState.NO_FIRST_PURCHASE;
  }

  if (s.ownedItemCount > c.statusMotivatedMinItems && s.equippedItemCount >= c.statusMotivatedMinEquipped) {
    return EconomyState.STATUS_MOTIVATED;
  }

  if (s.spentCoins30d > c.activeSpenderMinSpent) {
    return EconomyState.ACTIVE_SPENDER;
  }

  if (s.coinBalance > c.cautiousSaverMinBalance && s.spentCoins30d < c.cautiousSaverMaxSpent) {
    return EconomyState.CAUTIOUS_SAVER;
  }

  return EconomyState.UNDER_ENGAGED;
}

export function classifyIdentityMotivation(
  s: GraphRawSignals,
  discipline: DisciplineState,
  trust: TrustProofState,
  momentum: MomentumState,
  economy: EconomyState,
): IdentityMotivation {
  if (momentum === MomentumState.INACTIVE || momentum === MomentumState.REACTIVATING) {
    return IdentityMotivation.COMEBACK_FIRST;
  }

  if (trust === TrustProofState.NEEDS_BETTER_EVIDENCE || trust === TrustProofState.BORDERLINE_QUALITY) {
    return IdentityMotivation.PROOF_FIRST;
  }

  if (discipline === DisciplineState.HIGHLY_CONSISTENT || discipline === DisciplineState.CONSISTENT) {
    return IdentityMotivation.CONSISTENCY_FIRST;
  }

  if (economy === EconomyState.STATUS_MOTIVATED || economy === EconomyState.ACTIVE_SPENDER) {
    return IdentityMotivation.STATUS_FIRST;
  }

  return IdentityMotivation.GROWTH_FIRST;
}

export function classifyComebackState(
  s: GraphRawSignals,
  previousMomentum: MomentumState,
): ComebackState | null {
  if (s.daysSinceLastActive < 3) return null;

  let comebackTier: ComebackState["comebackTier"];
  if (s.daysSinceLastActive >= 30) comebackTier = "long_gone";
  else if (s.daysSinceLastActive >= 14) comebackTier = "extended_absence";
  else if (s.daysSinceLastActive >= 7) comebackTier = "week_away";
  else comebackTier = "quick_return";

  return {
    inactiveDays: s.daysSinceLastActive,
    comebackTier,
    previousMomentum,
    hadFirstWin: s.approvedProofs14d > 0 || s.completedMissions14d > 0 || s.level > 1,
    hasStatusItems: s.ownedItemCount > 1,
  };
}
