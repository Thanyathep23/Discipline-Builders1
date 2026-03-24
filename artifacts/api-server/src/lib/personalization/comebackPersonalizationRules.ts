import type { ComebackState, UserStateGraph } from "./graphTypes.js";

export interface ComebackPersonalization {
  reEntryObjective: string;
  tone: string;
  frictionLevel: "minimal" | "low" | "moderate";
  suggestedAction: string;
  rewardEmphasis: string;
  statusEmphasis: string;
  avoidList: string[];
}

export function getComebackPersonalization(
  graph: UserStateGraph,
  comeback: ComebackState,
): ComebackPersonalization {
  if (comeback.comebackTier === "quick_return") {
    if (comeback.hasStatusItems) {
      return {
        reEntryObjective: "Complete one focused session to restart your streak",
        tone: "warm_reconnection",
        frictionLevel: "minimal",
        suggestedAction: "Start a short session in your strongest area",
        rewardEmphasis: "Your world is waiting. One session keeps it growing.",
        statusEmphasis: "Your room and wardrobe reflect discipline you've already proven.",
        avoidList: ["long missions", "hard challenges", "proof quality criticism"],
      };
    }
    return {
      reEntryObjective: "Complete one session to get back on track",
      tone: "gentle_nudge",
      frictionLevel: "minimal",
      suggestedAction: "Pick an easy mission and start a quick session",
      rewardEmphasis: "Every completed session earns coins toward your first status items.",
      statusEmphasis: "",
      avoidList: ["complex missions", "multiple commitments"],
    };
  }

  if (comeback.comebackTier === "week_away") {
    if (!comeback.hadFirstWin) {
      return {
        reEntryObjective: "Earn your first approved proof",
        tone: "encouraging_fresh_start",
        frictionLevel: "low",
        suggestedAction: "Create a simple 15-minute mission you can definitely complete",
        rewardEmphasis: "Your first win is the hardest. After that, everything gets easier.",
        statusEmphasis: "",
        avoidList: ["mentioning streak loss", "comparing to other users", "hard missions"],
      };
    }
    return {
      reEntryObjective: "Submit one proof to reconnect with your progress",
      tone: "warm_reentry",
      frictionLevel: "low",
      suggestedAction: "Start with a mission in a category you're comfortable with",
      rewardEmphasis: "Pick up where you left off. Your skills and progress are still here.",
      statusEmphasis: comeback.hasStatusItems
        ? "Your room and inventory are waiting. One session reconnects you."
        : "",
      avoidList: ["overwhelming goals", "multiple new commitments"],
    };
  }

  if (comeback.comebackTier === "extended_absence") {
    return {
      reEntryObjective: "Complete one easy mission to restart your journey",
      tone: "fresh_start_no_guilt",
      frictionLevel: "low",
      suggestedAction: "Choose the simplest mission available and keep it under 20 minutes",
      rewardEmphasis: "Your account, coins, and progress are exactly where you left them.",
      statusEmphasis: comeback.hasStatusItems
        ? "Everything you've earned is still yours. One session starts the next chapter."
        : "Start building your world with one small step.",
      avoidList: ["mentioning inactivity length", "aggressive challenges", "shame", "complex proof requirements"],
    };
  }

  return {
    reEntryObjective: "Take one small step today — anything counts",
    tone: "zero_pressure_restart",
    frictionLevel: "minimal",
    suggestedAction: "Create or accept the easiest possible mission. Complete it. That's enough.",
    rewardEmphasis: "Your account is here. Your progress is here. Start whenever you're ready.",
    statusEmphasis: comeback.hasStatusItems
      ? "Your room, your wardrobe, your world — all still here. Welcome back."
      : "",
    avoidList: ["mentioning how long they've been gone", "comparisons", "pressure", "complex goals", "shame"],
  };
}
