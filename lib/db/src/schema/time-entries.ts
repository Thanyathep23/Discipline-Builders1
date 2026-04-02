import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timeEntrySourceEnum = pgEnum("time_entry_source", ["manual", "focus_session", "sleep_log"]);

export const timeEntriesTable = pgTable("time_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  sessionId: text("session_id"), // if sourced from a focus session
  missionId: text("mission_id"),
  category: text("category").notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  source: timeEntrySourceEnum("source").notNull().default("focus_session"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({
  createdAt: true,
  durationSeconds: true,
});

export type TimeEntry = typeof timeEntriesTable.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
