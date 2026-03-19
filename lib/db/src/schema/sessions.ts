import { pgTable, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionStatusEnum = pgEnum("session_status", ["active", "paused", "completed", "abandoned", "low_confidence"]);
export const strictnessModeEnum = pgEnum("strictness_mode", ["normal", "strict", "extreme"]);

export const focusSessionsTable = pgTable("focus_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  missionId: text("mission_id").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  strictnessMode: strictnessModeEnum("strictness_mode").notNull().default("normal"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  pausedAt: timestamp("paused_at"),
  endedAt: timestamp("ended_at"),
  totalPausedSeconds: integer("total_paused_seconds").notNull().default(0),
  pauseCount: integer("pause_count").notNull().default(0),
  blockedAttemptCount: integer("blocked_attempt_count").notNull().default(0),
  heartbeatCount: integer("heartbeat_count").notNull().default(0),
  extensionConnected: boolean("extension_connected").notNull().default(false),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
});

export const insertSessionSchema = createInsertSchema(focusSessionsTable).omit({
  startedAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type FocusSession = typeof focusSessionsTable.$inferSelect;
