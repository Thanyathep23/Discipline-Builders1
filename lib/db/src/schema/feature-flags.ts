import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const featureFlagsTable = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlagsTable).omit({ updatedAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlagsTable.$inferSelect;
