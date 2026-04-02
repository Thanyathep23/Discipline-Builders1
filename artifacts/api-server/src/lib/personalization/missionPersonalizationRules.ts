import {
  DisciplineState,
  TrustProofState,
  MomentumState,
  ProgressionState,
  IdentityMotivation,
  type UserStateGraph,
} from "./graphTypes.js";

export interface MissionPersonalization {
  difficultyBand: "easy" | "moderate" | "challenging" | "hard";
  durationPreference: "short" | "medium" | "long";
  categoryEmphasis: "weakest_skill" | "strongest_skill" | "balanced" | "recovery";
  framingStyle: string;
  proofGuidance: string;
  missionSuggestionType: "recovery" | "discipline_building" | "progression_push" | "trust_safe" | "standard";
}

export function getMissionPersonalization(graph: UserStateGraph): MissionPersonalization {
  const base: MissionPersonalization = {
    difficultyBand: "moderate",
    durationPreference: "medium",
    categoryEmphasis: "balanced",
    framingStyle: "Build your discipline one mission at a time.",
    proofGuidance: "Describe what you did, what you learned, and what you produced.",
    missionSuggestionType: "standard",
  };

  if (graph.momentumState === MomentumState.INACTIVE || graph.momentumState === MomentumState.STALLED_AFTER_SETBACK) {
    base.difficultyBand = "easy";
    base.durationPreference = "short";
    base.categoryEmphasis = "recovery";
    base.framingStyle = "Start small. One completed mission rebuilds everything.";
    base.proofGuidance = "Keep it simple — describe what you did and how it felt.";
    base.missionSuggestionType = "recovery";
    return base;
  }

  if (graph.momentumState === MomentumState.REACTIVATING) {
    base.difficultyBand = "easy";
    base.durationPreference = "short";
    base.categoryEmphasis = "strongest_skill";
    base.framingStyle = "Welcome back. Build on what you're already good at.";
    base.proofGuidance = "A brief description of your effort is enough to get started again.";
    base.missionSuggestionType = "recovery";
    return base;
  }

  if (graph.trustState === TrustProofState.NEEDS_BETTER_EVIDENCE || graph.trustState === TrustProofState.BORDERLINE_QUALITY) {
    base.difficultyBand = "easy";
    base.durationPreference = "medium";
    base.framingStyle = "Focus on quality over quantity. Clear evidence earns stronger rewards.";
    base.proofGuidance = "Include specific details: numbers, outcomes, screenshots, or links. The more concrete, the better.";
    base.missionSuggestionType = "trust_safe";
    return base;
  }

  if (graph.disciplineState === DisciplineState.UNSTABLE) {
    base.difficultyBand = "easy";
    base.durationPreference = "short";
    base.categoryEmphasis = "balanced";
    base.framingStyle = "Small consistent wins build real discipline.";
    base.proofGuidance = "Describe what you accomplished — even small progress counts.";
    base.missionSuggestionType = "discipline_building";
    return base;
  }

  if (graph.disciplineState === DisciplineState.BUILDING) {
    base.difficultyBand = "moderate";
    base.durationPreference = "medium";
    base.categoryEmphasis = "weakest_skill";
    base.framingStyle = "You're building momentum. Keep pushing into areas that challenge you.";
    base.proofGuidance = "Show your work: what you did, what you learned, what changed.";
    base.missionSuggestionType = "discipline_building";
    return base;
  }

  if (graph.momentumState === MomentumState.SURGING && graph.disciplineState === DisciplineState.HIGHLY_CONSISTENT) {
    base.difficultyBand = "hard";
    base.durationPreference = "long";
    base.categoryEmphasis = "weakest_skill";
    base.framingStyle = "You're operating at a high level. Time for missions that match your discipline.";
    base.proofGuidance = "Show detailed evidence of meaningful work — the standard matches your capability.";
    base.missionSuggestionType = "progression_push";
    return base;
  }

  if (graph.progressionState === ProgressionState.PLATEAU_RISK) {
    base.difficultyBand = "moderate";
    base.categoryEmphasis = "weakest_skill";
    base.framingStyle = "Try something different. A new category can unlock fresh growth.";
    base.missionSuggestionType = "progression_push";
    return base;
  }

  if (graph.identityMotivation === IdentityMotivation.STATUS_FIRST) {
    base.framingStyle = "Every mission earned moves you closer to your next status upgrade.";
  }

  if (graph.identityMotivation === IdentityMotivation.CONSISTENCY_FIRST) {
    base.framingStyle = "Your consistency is your superpower. Keep the streak alive.";
  }

  return base;
}
