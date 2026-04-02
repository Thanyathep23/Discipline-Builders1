import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const onboardingStageEnum = pgEnum("onboarding_stage", ["not_started", "quick_start", "standard", "deep", "complete"]);

export const lifeProfilesTable = pgTable("life_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  onboardingStage: onboardingStageEnum("onboarding_stage").notNull().default("not_started"),
  quickStartDone: boolean("quick_start_done").notNull().default(false),
  standardDone: boolean("standard_done").notNull().default(false),
  deepDone: boolean("deep_done").notNull().default(false),
  mainGoal: text("main_goal"),
  mainProblem: text("main_problem"),
  workStudyStatus: text("work_study_status"),
  availableHoursPerDay: integer("available_hours_per_day"),
  improvementAreas: text("improvement_areas").notNull().default("[]"),
  strictnessPreference: text("strictness_preference").notNull().default("normal"),
  dailyRoutine: text("daily_routine"),
  weakPoints: text("weak_points"),
  distractionTriggers: text("distraction_triggers"),
  currentHabits: text("current_habits"),
  sleepPattern: text("sleep_pattern"),
  healthStatus: text("health_status"),
  financeRange: text("finance_range"),
  areaConfidence: text("area_confidence").notNull().default("{}"),
  longtermGoals: text("longterm_goals"),
  lifeConstraints: text("life_constraints"),
  supportSystem: text("support_system"),
  selfDescribed: text("self_described"),
  currentArc: text("current_arc"),
  arcSetAt: timestamp("arc_set_at"),
  arcXpSnapshot: text("arc_xp_snapshot").notNull().default("{}"),
  arcStage: text("arc_stage").notNull().default("beginning"),
  arcStageXpSnapshot: text("arc_stage_xp_snapshot").notNull().default("{}"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LifeProfile = typeof lifeProfilesTable.$inferSelect;
