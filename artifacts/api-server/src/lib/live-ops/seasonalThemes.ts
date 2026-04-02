import type { SeasonTheme, SeasonId } from "./liveOpsTypes.js";

export const SEASONAL_THEMES: Record<SeasonId, SeasonTheme> = {
  genesis: {
    id: "genesis",
    name: "Genesis Season",
    emotionalTone: "Fresh start, possibility, foundations",
    durationWeeks: 5,
    liveOpsFocus: "First engagement patterns, onboarding reinforcement",
    challengeTypes: ["complete_sessions", "submit_proofs", "maintain_streak"],
    itemEmphasis: ["starter_wearable", "basic_desk", "urban_runner"],
    bannerColor: "#2196F3",
    copyDirection: "Build from zero. Every step counts.",
  },

  rise: {
    id: "rise",
    name: "Rise Season",
    emotionalTone: "Growth, momentum, upward trajectory",
    durationWeeks: 5,
    liveOpsFocus: "Skill growth, level progression, expanding horizons",
    challengeTypes: ["complete_sessions", "skill_rank", "submit_proofs"],
    itemEmphasis: ["mid_tier_watch", "mid_tier_clothing", "dark_office"],
    bannerColor: "#4CAF50",
    copyDirection: "You've started. Now rise.",
  },

  discipline: {
    id: "discipline",
    name: "Discipline Season",
    emotionalTone: "Grit, consistency, inner strength",
    durationWeeks: 5,
    liveOpsFocus: "Streak maintenance, consistency rewards, trading skills",
    challengeTypes: ["maintain_streak", "complete_sessions", "submit_proofs"],
    itemEmphasis: ["executive_accessories", "formal_clothing", "desk_upgrades"],
    bannerColor: "#9C27B0",
    copyDirection: "Iron sharpens iron. Stay the course.",
  },

  momentum: {
    id: "momentum",
    name: "Momentum Season",
    emotionalTone: "Energy, speed, breakthrough",
    durationWeeks: 5,
    liveOpsFocus: "Quest chain completion, breakthrough missions, rapid progression",
    challengeTypes: ["complete_sessions", "total_missions", "earn_xp"],
    itemEmphasis: ["sport_wheels", "athletic_wear", "obsidian_coupe"],
    bannerColor: "#FF9800",
    copyDirection: "Accelerate. Break through.",
  },

  status: {
    id: "status",
    name: "Status Season",
    emotionalTone: "Prestige, refinement, elite identity",
    durationWeeks: 5,
    liveOpsFocus: "Prestige tier push, premium aspiration, identity expression",
    challengeTypes: ["earn_xp", "purchase_item", "reach_level"],
    itemEmphasis: ["executive_gt", "premium_wardrobe", "executive_suite"],
    bannerColor: "#FFD700",
    copyDirection: "You've earned this. Claim your status.",
  },

  rebuild: {
    id: "rebuild",
    name: "Rebuild Season",
    emotionalTone: "Recovery, restart, resilience",
    durationWeeks: 5,
    liveOpsFocus: "Comeback users, struggling users, re-engagement",
    challengeTypes: ["complete_sessions", "maintain_streak", "submit_proofs"],
    itemEmphasis: ["comfort_items", "room_warmth", "recovery_themed"],
    bannerColor: "#009688",
    copyDirection: "Reset. Rebuild. Stronger than before.",
  },
};

export function getSeasonBannerColor(seasonId: string): string {
  return SEASONAL_THEMES[seasonId]?.bannerColor ?? "#607D8B";
}

export function getSeasonCopyDirection(seasonId: string): string {
  return SEASONAL_THEMES[seasonId]?.copyDirection ?? "";
}
