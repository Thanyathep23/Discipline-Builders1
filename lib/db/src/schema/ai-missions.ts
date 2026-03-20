import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const aiMissionStatusEnum = pgEnum("ai_mission_status", [
  "pending", "accepted", "rejected", "not_now", "completed", "expired",
]);

export const aiMissionCategoryEnum = pgEnum("ai_mission_category", [
  "daily_discipline", "skill_growth", "trading_practice", "recovery_reset",
]);

export const difficultyColorEnum = pgEnum("difficulty_color", [
  "gray", "green", "blue", "purple", "gold", "red",
]);

export const aiMissionsTable = pgTable("ai_missions", {
  id:                      text("id").primaryKey(),
  userId:                  text("user_id").notNull(),
  title:                   text("title").notNull(),
  description:             text("description").notNull(),
  reason:                  text("reason").notNull(),
  relatedSkill:            text("related_skill").notNull(),
  difficultyColor:         difficultyColorEnum("difficulty_color").notNull().default("green"),
  estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(30),
  recommendedProofTypes:   text("recommended_proof_types").notNull().default('["text"]'),
  suggestedRewardBonus:    integer("suggested_reward_bonus").notNull().default(0),
  missionCategory:         aiMissionCategoryEnum("mission_category").notNull().default("daily_discipline"),
  isStretch:               boolean("is_stretch").notNull().default(false),
  expiryAt:                timestamp("expiry_at"),
  status:                  aiMissionStatusEnum("status").notNull().default("pending"),
  acceptedMissionId:       text("accepted_mission_id"),
  generatedBy:             text("generated_by").notNull().default("rule_based"),
  createdAt:               timestamp("created_at").notNull().defaultNow(),
  updatedAt:               timestamp("updated_at").notNull().defaultNow(),
});

export const aiMissionVariantsTable = pgTable("ai_mission_variants", {
  id:                      text("id").primaryKey(),
  originalMissionId:       text("original_mission_id").notNull(),
  variantType:             text("variant_type").notNull(),
  title:                   text("title").notNull(),
  description:             text("description").notNull(),
  difficultyColor:         text("difficulty_color").notNull(),
  estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
  reason:                  text("reason").notNull().default(""),
  createdAt:               timestamp("created_at").notNull().defaultNow(),
});

export const missionAcceptanceEventsTable = pgTable("mission_acceptance_events", {
  id:        text("id").primaryKey(),
  userId:    text("user_id").notNull(),
  missionId: text("mission_id").notNull(),
  action:    text("action").notNull(),
  notes:     text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const missionProofRequirementsTable = pgTable("mission_proof_requirements", {
  id:                  text("id").primaryKey(),
  missionId:           text("mission_id").notNull(),
  acceptedProofTypes:  text("accepted_proof_types").notNull().default('["text"]'),
  minimumProofCount:   integer("minimum_proof_count").notNull().default(1),
  proofDifficultyTier: text("proof_difficulty_tier").notNull().default("basic"),
  fraudRiskLevel:      text("fraud_risk_level").notNull().default("low"),
  reviewRubricSummary: text("review_rubric_summary").notNull().default(""),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export const proofRequirementTemplatesTable = pgTable("proof_requirement_templates", {
  id:                  text("id").primaryKey(),
  category:            text("category").notNull(),
  skillId:             text("skill_id"),
  difficultyColor:     text("difficulty_color").notNull().default("green"),
  acceptedProofTypes:  text("accepted_proof_types").notNull().default('["text"]'),
  minimumProofCount:   integer("minimum_proof_count").notNull().default(1),
  reviewRubricSummary: text("review_rubric_summary").notNull().default(""),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export const alternateProofRequestsTable = pgTable("alternate_proof_requests", {
  id:                  text("id").primaryKey(),
  missionId:           text("mission_id").notNull(),
  userId:              text("user_id").notNull(),
  requestedProofTypes: text("requested_proof_types").notNull().default("[]"),
  reason:              text("reason").notNull().default(""),
  status:              text("status").notNull().default("pending"),
  createdAt:           timestamp("created_at").notNull().defaultNow(),
});

export type AiMission = typeof aiMissionsTable.$inferSelect;
export type AiMissionVariant = typeof aiMissionVariantsTable.$inferSelect;
export type MissionAcceptanceEvent = typeof missionAcceptanceEventsTable.$inferSelect;
export type MissionProofRequirement = typeof missionProofRequirementsTable.$inferSelect;
