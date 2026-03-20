import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blockedAttemptSourceEnum = pgEnum("blocked_attempt_source", ["extension", "mobile", "api"]);

export const blockedAttemptsTable = pgTable("blocked_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"),
  domain: text("domain").notNull(),
  source: blockedAttemptSourceEnum("source").notNull().default("extension"),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  meta: text("meta").notNull().default("{}"), // JSON string
});

export const insertBlockedAttemptSchema = createInsertSchema(blockedAttemptsTable).omit({
  blockedAt: true,
});

export type BlockedAttempt = typeof blockedAttemptsTable.$inferSelect;
export type InsertBlockedAttempt = z.infer<typeof insertBlockedAttemptSchema>;
