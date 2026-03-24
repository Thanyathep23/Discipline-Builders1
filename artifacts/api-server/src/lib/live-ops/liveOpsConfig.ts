import { REWARD_BANDS } from "../economy/economyConfig.js";

export { EVENT_TEMPLATES } from "./eventTemplates.js";
export { REWARD_TEMPLATES, validateRewardAmount } from "./rewardTemplates.js";
export { SEASONAL_THEMES, getSeasonBannerColor, getSeasonCopyDirection } from "./seasonalThemes.js";
export { COMEBACK_RULES, getComebackRuleForDays, COMEBACK_ANTI_ABUSE } from "./comebackRules.js";
export { LIVE_OPS_CALENDAR, getCalendarWeek, getWeeksBySeason, getTotalOperatorMinutes } from "./liveOpsCalendar.js";
export type {
  EventTemplateId,
  ObjectiveType,
  RewardTemplateId,
  SeasonId,
  CadenceLayer,
  EventObjective,
  EventTemplate,
  RewardTemplate,
  SeasonTheme,
  ComebackRule,
  CalendarWeek,
} from "./liveOpsTypes.js";

export const LIVE_OPS_CONFIG_VERSION = "1.0.0";

export const LIVE_OPS_ECONOMY_LIMITS = {
  maxWeeklyParticipationCoins: 20,
  maxWeeklyCompletionCoins: 50,
  maxWeeklyCombinedCoins: 70,
  maxMonthlyMilestoneCoins: REWARD_BANDS.moderate.maxReward,
  maxComebackCoins: 30,
  maxSpotlightCoins: 25,
  maxBonusMultiplier: 1.25,
  maxFreeItemValue: 0,
};

export function validateEventRewardAgainstEconomy(coins: number, layer: "weekly" | "monthly" | "comeback" | "spotlight"): { valid: boolean; reason?: string } {
  const moderateMax = REWARD_BANDS.moderate.maxReward;

  switch (layer) {
    case "weekly":
      if (coins > LIVE_OPS_ECONOMY_LIMITS.maxWeeklyCompletionCoins)
        return { valid: false, reason: `Weekly reward ${coins}c exceeds max ${LIVE_OPS_ECONOMY_LIMITS.maxWeeklyCompletionCoins}c` };
      break;
    case "monthly":
      if (coins > moderateMax)
        return { valid: false, reason: `Monthly reward ${coins}c exceeds moderate band max ${moderateMax}c` };
      break;
    case "comeback":
      if (coins > LIVE_OPS_ECONOMY_LIMITS.maxComebackCoins)
        return { valid: false, reason: `Comeback reward ${coins}c exceeds max ${LIVE_OPS_ECONOMY_LIMITS.maxComebackCoins}c` };
      break;
    case "spotlight":
      if (coins > LIVE_OPS_ECONOMY_LIMITS.maxSpotlightCoins)
        return { valid: false, reason: `Spotlight reward ${coins}c exceeds max ${LIVE_OPS_ECONOMY_LIMITS.maxSpotlightCoins}c` };
      break;
  }

  return { valid: true };
}
