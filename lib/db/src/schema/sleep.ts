import { pgTable, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sleepQualityEnum = pgEnum("sleep_quality", ["poor", "fair", "good", "excellent"]);

export const sleepLogsTable = pgTable("sleep_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  bedtime: timestamp("bedtime").notNull(),
  wakeTime: timestamp("wake_time").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  quality: sleepQualityEnum("quality").notNull().default("fair"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSleepLogSchema = createInsertSchema(sleepLogsTable).omit({
  createdAt: true,
  updatedAt: true,
  durationMinutes: true,
});

export type SleepLog = typeof sleepLogsTable.$inferSelect;
export type InsertSleepLog = z.infer<typeof insertSleepLogSchema>;
