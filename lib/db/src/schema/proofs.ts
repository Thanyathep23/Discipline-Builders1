import { pgTable, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proofStatusEnum = pgEnum("proof_status", [
  "pending", "reviewing", "approved", "partial", "rejected", "flagged", "followup_needed"
]);

export const proofSubmissionsTable = pgTable("proof_submissions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  missionId: text("mission_id").notNull(),
  userId: text("user_id").notNull(),
  status: proofStatusEnum("status").notNull().default("pending"),
  textSummary: text("text_summary"),
  links: text("links").notNull().default("[]"),
  fileUrls: text("file_urls").notNull().default("[]"),
  aiConfidenceScore: real("ai_confidence_score"),
  aiVerdict: text("ai_verdict"),
  aiExplanation: text("ai_explanation"),
  aiRubricRelevance: real("ai_rubric_relevance"),
  aiRubricQuality: real("ai_rubric_quality"),
  aiRubricPlausibility: real("ai_rubric_plausibility"),
  aiRubricSpecificity: real("ai_rubric_specificity"),
  followupQuestions: text("followup_questions"),
  followupAnswers: text("followup_answers"),
  rewardMultiplier: real("reward_multiplier"),
  coinsAwarded: integer("coins_awarded"),
  manualReviewNote: text("manual_review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProofSchema = createInsertSchema(proofSubmissionsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertProof = z.infer<typeof insertProofSchema>;
export type ProofSubmission = typeof proofSubmissionsTable.$inferSelect;
