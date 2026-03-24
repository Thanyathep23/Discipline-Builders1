import {
  DisciplineState,
  TrustProofState,
  MomentumState,
  ProgressionState,
  EconomyState,
  IdentityMotivation,
  type UserStateGraph,
  type NextActionRecommendation,
  type NextActionId,
} from "./graphTypes.js";

interface ActionRule {
  actionId: NextActionId;
  fits: (g: UserStateGraph) => boolean;
  basePriority: number;
  confidence: "low" | "medium" | "high";
  framingAngle: string;
  targetScreen: string;
  reason: string;
  userCopy: string;
  badWhen: string;
}

const ACTION_RULES: ActionRule[] = [
  {
    actionId: "restart_small",
    fits: (g) => g.momentumState === MomentumState.INACTIVE || g.momentumState === MomentumState.STALLED_AFTER_SETBACK,
    basePriority: 100,
    confidence: "high",
    framingAngle: "gentle_recovery",
    targetScreen: "missions",
    reason: "User is inactive or stalled — needs a low-friction re-entry point",
    userCopy: "Start with something small. One focused session can restart your momentum.",
    badWhen: "User is already active and completing missions",
  },
  {
    actionId: "complete_comeback_challenge",
    fits: (g) => g.comebackState !== null && g.comebackState.inactiveDays >= 3,
    basePriority: 95,
    confidence: "high",
    framingAngle: "comeback_motivation",
    targetScreen: "home",
    reason: "User has been away — comeback challenge provides structured re-entry",
    userCopy: "Welcome back. Complete one challenge to get back on track.",
    badWhen: "User is consistently active",
  },
  {
    actionId: "recover_streak",
    fits: (g) => g.disciplineState === DisciplineState.UNSTABLE && g.rawSignals.longestStreak > 3 && g.rawSignals.currentStreak === 0,
    basePriority: 90,
    confidence: "medium",
    framingAngle: "streak_recovery",
    targetScreen: "missions",
    reason: "User had a strong streak but lost it — recoverable",
    userCopy: "You've built strong streaks before. One session today starts a new one.",
    badWhen: "User never had a meaningful streak",
  },
  {
    actionId: "improve_proof_quality",
    fits: (g) => g.trustState === TrustProofState.NEEDS_BETTER_EVIDENCE || g.trustState === TrustProofState.BORDERLINE_QUALITY,
    basePriority: 85,
    confidence: "medium",
    framingAngle: "quality_improvement",
    targetScreen: "missions",
    reason: "User's proof quality is low — needs guidance on better evidence",
    userCopy: "Try adding more detail to your proof. Describe what you did, what you learned, and what it produced.",
    badWhen: "User has clean confident proof history",
  },
  {
    actionId: "resubmit_stronger_proof",
    fits: (g) => g.rawSignals.followupProofs14d > 0 && g.momentumState !== MomentumState.INACTIVE,
    basePriority: 80,
    confidence: "high",
    framingAngle: "proof_recovery",
    targetScreen: "proofs",
    reason: "User has pending follow-ups — completing them earns rewards",
    userCopy: "You have a proof that needs more detail. A stronger resubmission can earn your reward.",
    badWhen: "User has no pending follow-ups",
  },
  {
    actionId: "create_manageable_mission",
    fits: (g) => g.momentumState === MomentumState.ACTIVE && g.disciplineState !== DisciplineState.HIGHLY_CONSISTENT,
    basePriority: 75,
    confidence: "high",
    framingAngle: "steady_progress",
    targetScreen: "missions",
    reason: "User is active but not yet highly consistent — needs manageable wins",
    userCopy: "Create a focused mission you can complete today. Consistent small wins build real discipline.",
    badWhen: "User is overwhelmed or already has too many active missions",
  },
  {
    actionId: "start_focused_session",
    fits: (g) => g.momentumState === MomentumState.ACTIVE || g.momentumState === MomentumState.SURGING,
    basePriority: 70,
    confidence: "high",
    framingAngle: "momentum_continuation",
    targetScreen: "sessions",
    reason: "User has momentum — capitalize on it with a focused session",
    userCopy: "Your momentum is strong. Start a focused session to keep building.",
    badWhen: "User is inactive or stalled",
  },
  {
    actionId: "try_harder_mission",
    fits: (g) => g.momentumState === MomentumState.SURGING && g.disciplineState === DisciplineState.HIGHLY_CONSISTENT,
    basePriority: 65,
    confidence: "medium",
    framingAngle: "challenge_escalation",
    targetScreen: "missions",
    reason: "User is surging and highly consistent — ready for harder challenges",
    userCopy: "You're performing at a high level. Push yourself with a harder mission.",
    badWhen: "User is building or unstable",
  },
  {
    actionId: "push_weak_dimension",
    fits: (g) => g.progressionState === ProgressionState.PLATEAU_RISK || (g.rawSignals.strongestSkillLevel - g.rawSignals.weakestSkillLevel > 5),
    basePriority: 60,
    confidence: "medium",
    framingAngle: "balanced_growth",
    targetScreen: "missions",
    reason: "User has imbalanced skills or is plateauing — needs to diversify",
    userCopy: "Your weakest skill could use attention. A mission in a different category can unlock new growth.",
    badWhen: "User is early build with few skills developed",
  },
  {
    actionId: "save_for_first_item",
    fits: (g) => g.economyState === EconomyState.NO_FIRST_PURCHASE && g.rawSignals.coinBalance > 50,
    basePriority: 55,
    confidence: "medium",
    framingAngle: "first_ownership",
    targetScreen: "store",
    reason: "User has never purchased — first item creates identity investment",
    userCopy: "You've earned enough coins for your first item. Browse the store and make your world yours.",
    badWhen: "User has no coins or already owns items",
  },
  {
    actionId: "equip_owned_items",
    fits: (g) => g.rawSignals.ownedItemCount > g.rawSignals.equippedItemCount + 1,
    basePriority: 50,
    confidence: "medium",
    framingAngle: "identity_expression",
    targetScreen: "rewards",
    reason: "User has unequipped items — engaging with identity reinforces investment",
    userCopy: "You have items waiting to be equipped. Make your character reflect your discipline.",
    badWhen: "User has equipped everything they own",
  },
  {
    actionId: "explore_store",
    fits: (g) => g.economyState === EconomyState.CAUTIOUS_SAVER && g.rawSignals.coinBalance > 200,
    basePriority: 45,
    confidence: "low",
    framingAngle: "aspirational_spending",
    targetScreen: "store",
    reason: "User is saving but not spending — gentle nudge toward meaningful purchase",
    userCopy: "You've built up a strong balance. There might be something worth investing in.",
    badWhen: "User is actively spending or has no coins",
  },
  {
    actionId: "celebrate_progress",
    fits: (g) => g.progressionState === ProgressionState.STEADY_GROWTH && g.disciplineState === DisciplineState.CONSISTENT,
    basePriority: 40,
    confidence: "medium",
    framingAngle: "recognition",
    targetScreen: "home",
    reason: "User is doing well — recognition reinforces behavior",
    userCopy: "Your consistency is paying off. Keep this pace and watch your character evolve.",
    badWhen: "User is struggling or inactive",
  },
  {
    actionId: "complete_profile",
    fits: (g) => !g.confidenceFlags.profileComplete,
    basePriority: 35,
    confidence: "high",
    framingAngle: "personalization_unlock",
    targetScreen: "profile",
    reason: "Incomplete profile limits personalization quality",
    userCopy: "Complete your profile to get more personalized missions and guidance.",
    badWhen: "Profile is already complete",
  },
];

export function getNextActions(graph: UserStateGraph, maxResults = 3): NextActionRecommendation[] {
  const matching = ACTION_RULES
    .filter(rule => rule.fits(graph))
    .sort((a, b) => b.basePriority - a.basePriority)
    .slice(0, maxResults)
    .map(rule => ({
      actionId: rule.actionId,
      priority: rule.basePriority,
      confidence: rule.confidence,
      framingAngle: rule.framingAngle,
      targetScreen: rule.targetScreen,
      reason: rule.reason,
      userCopy: rule.userCopy,
    }));

  if (matching.length === 0) {
    return [{
      actionId: "create_manageable_mission" as NextActionId,
      priority: 50,
      confidence: "low",
      framingAngle: "default_guidance",
      targetScreen: "missions",
      reason: "No specific recommendation matched — using default",
      userCopy: "Create a focused mission and prove your discipline today.",
    }];
  }

  return matching;
}
