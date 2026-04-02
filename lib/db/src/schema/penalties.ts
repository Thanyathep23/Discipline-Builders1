import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const penaltyReasonEnum = pgEnum("penalty_reason", [
  "abandoned_session",
  "blocked_attempt",
  "failed_proof",
  "missed_deadline",
  "admin_penalty",
  "low_trust_score",
]);

export const penaltiesTable = pgTable("penalties", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  missionId: text("mission_id"),
  proofId: text("proof_id"),
  reason: penaltyReasonEnum("reason").notNull(),
  coinsDeducted: integer("coins_deducted").notNull().default(0),
  xpDeducted: integer("xp_deducted").notNull().default(0),
  description: text("description").notNull(),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  appliedBy: text("applied_by"), // userId of admin, or null for system
});

export const insertPenaltySchema = createInsertSchema(penaltiesTable).omit({
  appliedAt: true,
});

export type Penalty = typeof penaltiesTable.$inferSelect;
export type InsertPenalty = z.infer<typeof insertPenaltySchema>;
