import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-user strictness mode config. Each user has 3 rows (normal/strict/extreme).
 * The "custom" variant lets users tweak normal parameters.
 */
export const strictnessProfilesTable = pgTable("strictness_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  mode: text("mode").notNull(), // "normal" | "strict" | "extreme"
  maxPauses: integer("max_pauses").notNull().default(3),
  blockedAttemptPenaltyCost: integer("blocked_attempt_penalty_cost").notNull().default(10),
  proofQualityThreshold: real("proof_quality_threshold").notNull().default(0.5),
  rewardCeilingBonus: real("reward_ceiling_bonus").notNull().default(0.0),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStrictnessProfileSchema = createInsertSchema(strictnessProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type StrictnessProfile = typeof strictnessProfilesTable.$inferSelect;
export type InsertStrictnessProfile = z.infer<typeof insertStrictnessProfileSchema>;

export const DEFAULT_STRICTNESS_PROFILES = {
  normal: { maxPauses: 3, blockedAttemptPenaltyCost: 10, proofQualityThreshold: 0.5, rewardCeilingBonus: 0.0 },
  strict: { maxPauses: 1, blockedAttemptPenaltyCost: 25, proofQualityThreshold: 0.7, rewardCeilingBonus: 0.1 },
  extreme: { maxPauses: 0, blockedAttemptPenaltyCost: 40, proofQualityThreshold: 0.8, rewardCeilingBonus: 0.2 },
};
