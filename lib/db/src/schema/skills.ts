import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const SKILL_IDS = ["focus", "discipline", "learning", "health", "finance", "creativity"] as const;
export type SkillId = typeof SKILL_IDS[number];

export const SKILL_META: Record<SkillId, { label: string; icon: string; description: string; color: string }> = {
  focus:       { label: "Focus",       icon: "eye",           description: "Ability to direct attention with intensity",         color: "#7C5CFC" },
  discipline:  { label: "Discipline",  icon: "shield",        description: "Consistency in following through on commitments",     color: "#FF7043" },
  learning:    { label: "Learning",    icon: "book",          description: "Capacity to acquire new knowledge and skills",        color: "#00D4FF" },
  health:      { label: "Health",      icon: "heart",         description: "Physical vitality and energy management",             color: "#00E676" },
  finance:     { label: "Finance",     icon: "cash",          description: "Financial awareness and intentional management",      color: "#F5C842" },
  creativity:  { label: "Creativity",  icon: "color-palette", description: "Creative output and innovative thinking",             color: "#FF3D71" },
};

export const CATEGORY_SKILL_MAP: Record<string, SkillId[]> = {
  Work:       ["focus", "discipline"],
  Study:      ["learning", "focus"],
  Learning:   ["learning"],
  Creative:   ["creativity", "focus"],
  Health:     ["health", "discipline"],
  Finance:    ["finance", "discipline"],
  Personal:   ["discipline"],
  Project:    ["focus", "discipline"],
};

export const userSkillsTable = pgTable("user_skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  skillId: text("skill_id").notNull(),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  totalXpEarned: integer("total_xp_earned").notNull().default(0),
  lastGainAt: timestamp("last_gain_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSkill = typeof userSkillsTable.$inferSelect;
