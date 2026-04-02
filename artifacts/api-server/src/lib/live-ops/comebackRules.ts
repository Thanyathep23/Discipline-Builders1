import type { ComebackRule } from "./liveOpsTypes.js";

export const COMEBACK_RULES: ComebackRule[] = [
  {
    id: "quick_return",
    minInactiveDays: 3,
    maxInactiveDays: 6,
    reEntryObjective: { type: "complete_sessions", count: 1, category: "any" },
    rewardCoins: 15,
    cooldownActiveDays: 14,
    copyTone: "Gentle nudge. No guilt. One easy step.",
    copyExamples: [
      "Welcome back. One session to restart.",
      "Start clean today.",
      "One session. That's all.",
    ],
  },
  {
    id: "week_away",
    minInactiveDays: 7,
    maxInactiveDays: 13,
    reEntryObjective: { type: "submit_proofs", count: 1, category: "any" },
    rewardCoins: 20,
    cooldownActiveDays: 14,
    copyTone: "Warm re-entry. Show what they've built. Reduce friction.",
    copyExamples: [
      "Pick up where you left off.",
      "Your progress is safe. Let's add to it.",
      "No pressure. One proof to get back in.",
    ],
  },
  {
    id: "extended_absence",
    minInactiveDays: 14,
    maxInactiveDays: 30,
    reEntryObjective: { type: "complete_sessions", count: 3, category: "any" },
    rewardCoins: 30,
    cooldownActiveDays: 14,
    copyTone: "Full fresh start. Show room/character. Reconnect identity.",
    copyExamples: [
      "Fresh start. No judgment.",
      "Your character, your room, your progress — all still here.",
      "Three sessions to rebuild. You've got this.",
    ],
  },
  {
    id: "long_gone",
    minInactiveDays: 31,
    maxInactiveDays: 365,
    reEntryObjective: { type: "complete_sessions", count: 3, category: "any" },
    rewardCoins: 30,
    cooldownActiveDays: 14,
    copyTone: "Treat as near-new user. Show what's new. Reconnect identity.",
    copyExamples: [
      "Everything you built is still here.",
      "A lot has changed. Let's start fresh.",
      "Your world is waiting. Step back in.",
    ],
  },
];

export function getComebackRuleForDays(inactiveDays: number): ComebackRule | null {
  return COMEBACK_RULES.find(
    (r) => inactiveDays >= r.minInactiveDays && inactiveDays <= r.maxInactiveDays
  ) ?? null;
}

export const COMEBACK_ANTI_ABUSE = {
  maxComebacksIn90Days: 3,
  cooldownActiveDays: 14,
  maxRewardPerComeback: 30,
  comebackNeverExceedsActiveWeekly: true,
};
