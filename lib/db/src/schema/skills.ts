import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const SKILL_IDS = ["focus", "discipline", "sleep", "fitness", "learning", "trading"] as const;
export type SkillId = typeof SKILL_IDS[number];

export const RANK_LADDER = [
  { name: "Gray",   color: "#9E9E9E", minLevel: 1,  maxLevel: 5  },
  { name: "Green",  color: "#4CAF50", minLevel: 6,  maxLevel: 15 },
  { name: "Blue",   color: "#2196F3", minLevel: 16, maxLevel: 30 },
  { name: "Purple", color: "#9C27B0", minLevel: 31, maxLevel: 50 },
  { name: "Gold",   color: "#F5C842", minLevel: 51, maxLevel: 75 },
  { name: "Red",    color: "#F44336", minLevel: 76, maxLevel: 100 },
] as const;

export type RankName = "Gray" | "Green" | "Blue" | "Purple" | "Gold" | "Red";

export function getRankForLevel(level: number): { name: RankName; color: string } {
  for (let i = RANK_LADDER.length - 1; i >= 0; i--) {
    if (level >= RANK_LADDER[i].minLevel) {
      return { name: RANK_LADDER[i].name as RankName, color: RANK_LADDER[i].color };
    }
  }
  return { name: "Gray", color: "#9E9E9E" };
}

export const SKILL_META: Record<SkillId, { label: string; icon: string; description: string; color: string }> = {
  focus:      { label: "Focus",      icon: "eye",          description: "Ability to direct attention with intensity",         color: "#7C5CFC" },
  discipline: { label: "Discipline", icon: "shield",       description: "Consistency in following through on commitments",    color: "#FF7043" },
  sleep:      { label: "Sleep",      icon: "moon",         description: "Rest quality and sleep consistency",                 color: "#00BCD4" },
  fitness:    { label: "Fitness",    icon: "barbell",      description: "Physical strength, stamina and body health",         color: "#00E676" },
  learning:   { label: "Learning",   icon: "book",         description: "Capacity to acquire new knowledge and skills",       color: "#00D4FF" },
  trading:    { label: "Trading",    icon: "trending-up",  description: "Trading skill from analysis, review and live work",  color: "#F5C842" },
};

export const CATEGORY_SKILL_MAP: Record<string, SkillId[]> = {
  Work:      ["focus", "discipline"],
  Study:     ["learning", "focus"],
  Learning:  ["learning"],
  Creative:  ["focus", "discipline"],
  Health:    ["fitness", "discipline"],
  Fitness:   ["fitness"],
  Finance:   ["trading", "discipline"],
  Trading:   ["trading"],
  Personal:  ["discipline"],
  Project:   ["focus", "discipline"],
  Sleep:     ["sleep"],
  Recovery:  ["sleep", "fitness"],
};

export const MASTERY_TIERS = [
  { tier: 0, label: null,         minLevel: 0,  minXp: 0,     minConfidence: 0 },
  { tier: 1, label: "Mastery I",  minLevel: 20, minXp: 2000,  minConfidence: 0.60 },
  { tier: 2, label: "Mastery II", minLevel: 40, minXp: 5000,  minConfidence: 0.75 },
  { tier: 3, label: "Mastery III",minLevel: 60, minXp: 10000, minConfidence: 0.85 },
] as const;

export function computeMasteryTier(level: number, totalXpEarned: number, confidenceScore: number): number {
  let tier = 0;
  for (const t of MASTERY_TIERS) {
    if (level >= t.minLevel && totalXpEarned >= t.minXp && confidenceScore >= t.minConfidence) {
      tier = t.tier;
    }
  }
  return tier;
}

export const userSkillsTable = pgTable("user_skills", {
  id:                  text("id").primaryKey(),
  userId:              text("user_id").notNull(),
  skillId:             text("skill_id").notNull(),
  level:               integer("level").notNull().default(1),
  xp:                  integer("xp").notNull().default(0),
  xpToNextLevel:       integer("xp_to_next_level").notNull().default(100),
  totalXpEarned:       integer("total_xp_earned").notNull().default(0),
  rank:                text("rank").notNull().default("Gray"),
  currentTrend:        text("current_trend").notNull().default("stable"),
  confidenceScore:     real("confidence_score").notNull().default(0.5),
  masteryTier:         integer("mastery_tier").notNull().default(0),
  masteryUnlockedAt:   timestamp("mastery_unlocked_at"),
  lastGainAt:          timestamp("last_gain_at"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
});

export const skillXpEventsTable = pgTable("skill_xp_events", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull(),
  skillId:     text("skill_id").notNull(),
  xpAmount:    integer("xp_amount").notNull(),
  source:      text("source").notNull(),
  sourceId:    text("source_id"),
  description: text("description").notNull().default(""),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type UserSkill = typeof userSkillsTable.$inferSelect;
export type SkillXpEvent = typeof skillXpEventsTable.$inferSelect;
