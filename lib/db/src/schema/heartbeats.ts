import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const heartbeatSourceEnum = pgEnum("heartbeat_source", ["mobile", "web", "extension"]);

export const sessionHeartbeatsTable = pgTable("session_heartbeats", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  source: heartbeatSourceEnum("source").notNull().default("mobile"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  meta: text("meta").notNull().default("{}"), // JSON string
});

export const insertSessionHeartbeatSchema = createInsertSchema(sessionHeartbeatsTable).omit({
  receivedAt: true,
});

export type SessionHeartbeat = typeof sessionHeartbeatsTable.$inferSelect;
export type InsertSessionHeartbeat = z.infer<typeof insertSessionHeartbeatSchema>;
