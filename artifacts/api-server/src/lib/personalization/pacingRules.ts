import {
  DisciplineState,
  TrustProofState,
  MomentumState,
  ProgressionState,
  type UserStateGraph,
} from "./graphTypes.js";

export interface PacingGuidance {
  pushIntensity: "gentle" | "moderate" | "strong" | "aggressive";
  emphasisArea: "consistency" | "ambition" | "proof_quality" | "identity_reinforcement" | "balanced";
  challengeEscalation: "hold" | "gradual" | "push" | "reduce";
  guidanceCopy: string;
}

export function getPacingGuidance(graph: UserStateGraph): PacingGuidance {
  if (graph.progressionState === ProgressionState.EARLY_BUILD) {
    if (graph.disciplineState === DisciplineState.UNSTABLE) {
      return {
        pushIntensity: "gentle",
        emphasisArea: "consistency",
        challengeEscalation: "hold",
        guidanceCopy: "Focus on completing missions consistently. Difficulty will increase as you build your rhythm.",
      };
    }
    return {
      pushIntensity: "moderate",
      emphasisArea: "balanced",
      challengeEscalation: "gradual",
      guidanceCopy: "You're getting started. Each completed mission builds your foundation.",
    };
  }

  if (graph.trustState === TrustProofState.NEEDS_BETTER_EVIDENCE || graph.trustState === TrustProofState.BORDERLINE_QUALITY) {
    return {
      pushIntensity: "moderate",
      emphasisArea: "proof_quality",
      challengeEscalation: "hold",
      guidanceCopy: "Focus on submitting stronger evidence. Quality proof earns better rewards and builds trust.",
    };
  }

  if (graph.progressionState === ProgressionState.PLATEAU_RISK) {
    if (graph.momentumState === MomentumState.SURGING) {
      return {
        pushIntensity: "strong",
        emphasisArea: "ambition",
        challengeEscalation: "push",
        guidanceCopy: "You're active but plateauing. Time to push harder or diversify your skills.",
      };
    }
    return {
      pushIntensity: "moderate",
      emphasisArea: "balanced",
      challengeEscalation: "gradual",
      guidanceCopy: "Try a mission in a different category. Breaking the pattern can unlock new growth.",
    };
  }

  if (graph.momentumState === MomentumState.SURGING && graph.disciplineState === DisciplineState.HIGHLY_CONSISTENT) {
    return {
      pushIntensity: "aggressive",
      emphasisArea: "ambition",
      challengeEscalation: "push",
      guidanceCopy: "You're operating at peak performance. Challenge yourself with harder missions and new categories.",
    };
  }

  if (graph.disciplineState === DisciplineState.CONSISTENT) {
    return {
      pushIntensity: "moderate",
      emphasisArea: "consistency",
      challengeEscalation: "gradual",
      guidanceCopy: "Your consistency is paying off. Keep this pace and let the growth compound.",
    };
  }

  if (graph.momentumState === MomentumState.STALLED_AFTER_SETBACK) {
    return {
      pushIntensity: "gentle",
      emphasisArea: "consistency",
      challengeEscalation: "reduce",
      guidanceCopy: "Start with something achievable. One completed mission resets the trajectory.",
    };
  }

  return {
    pushIntensity: "moderate",
    emphasisArea: "balanced",
    challengeEscalation: "gradual",
    guidanceCopy: "Keep building. Each mission proves your discipline and moves you forward.",
  };
}
