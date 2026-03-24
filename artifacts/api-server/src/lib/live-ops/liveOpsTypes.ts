export type EventTemplateId =
  | "weekly_focus_sprint"
  | "weekly_discipline_push"
  | "weekly_streak_builder"
  | "weekly_skill_growth"
  | "weekly_proof_quality"
  | "weekly_style_challenge"
  | "milestone_level_gate"
  | "milestone_mission_count"
  | "milestone_skill_rank"
  | "milestone_streak"
  | "milestone_quarter_wrap"
  | "spotlight_wardrobe"
  | "spotlight_room"
  | "spotlight_car"
  | "spotlight_prestige"
  | "comeback_quick_return"
  | "comeback_week_away"
  | "comeback_extended"
  | "comeback_rebuild_streak"
  | "seasonal_banner";

export type ObjectiveType =
  | "complete_sessions"
  | "submit_proofs"
  | "maintain_streak"
  | "earn_xp"
  | "purchase_item"
  | "equip_item"
  | "reach_level"
  | "total_missions"
  | "skill_rank"
  | "room_upgrade";

export type RewardTemplateId =
  | "participation"
  | "completion"
  | "milestone"
  | "comeback"
  | "spotlight"
  | "cosmetic_only";

export type SeasonId =
  | "genesis"
  | "rise"
  | "discipline"
  | "momentum"
  | "status"
  | "rebuild";

export type CadenceLayer =
  | "weekly"
  | "monthly"
  | "seasonal"
  | "comeback";

export interface EventObjective {
  type: ObjectiveType;
  count?: number;
  category?: string;
  threshold?: number;
}

export interface EventTemplate {
  id: EventTemplateId;
  layer: CadenceLayer;
  name: string;
  description: string;
  defaultObjective: EventObjective;
  defaultRewardTemplateId: RewardTemplateId;
  defaultDurationDays: number;
  targetUserState: "any" | "active" | "comeback";
  economyCaution: string;
  metricsToTrack: string[];
}

export interface RewardTemplate {
  id: RewardTemplateId;
  name: string;
  rewardType: "coins" | "coins_and_cosmetic" | "cosmetic_only";
  minCoins: number;
  maxCoins: number;
  repeatFrequency: "weekly" | "monthly" | "per_comeback" | "seasonal";
  nature: string;
  antiInflationNotes: string;
  abuseRiskNotes: string;
}

export interface SeasonTheme {
  id: SeasonId;
  name: string;
  emotionalTone: string;
  durationWeeks: number;
  liveOpsFocus: string;
  challengeTypes: string[];
  itemEmphasis: string[];
  bannerColor: string;
  copyDirection: string;
}

export interface ComebackRule {
  id: string;
  minInactiveDays: number;
  maxInactiveDays: number;
  reEntryObjective: EventObjective;
  rewardCoins: number;
  cooldownActiveDays: number;
  copyTone: string;
  copyExamples: string[];
}

export interface CalendarWeek {
  weekNumber: number;
  theme: string;
  targetEmotion: string;
  eventTemplateId: EventTemplateId;
  rewardCoins: number;
  spotlightCategory?: string;
  comebackHook: boolean;
  operatorMinutes: number;
  seasonId: SeasonId;
}
