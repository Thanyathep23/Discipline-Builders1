import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blockingConfigTable = pgTable("blocking_config", {
  userId: text("user_id").primaryKey(),
  blockedDomains: text("blocked_domains").notNull().default("[]"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBlockingConfigSchema = createInsertSchema(blockingConfigTable).omit({ updatedAt: true });

export type BlockingConfig = typeof blockingConfigTable.$inferSelect;
export type InsertBlockingConfig = z.infer<typeof insertBlockingConfigSchema>;
