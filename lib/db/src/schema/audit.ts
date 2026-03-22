import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const auditLogTable = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorRole: text("actor_role").notNull().default("system"),
  action: text("action").notNull(),
  targetId: text("target_id"),
  targetType: text("target_type"),
  details: text("details"),
  reason: text("reason"),
  result: text("result"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogTable).omit({
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogTable.$inferSelect;
