import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userFeedbackTable = pgTable("user_feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  note: text("note"),
  context: text("context"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserFeedbackSchema = createInsertSchema(userFeedbackTable).omit({ createdAt: true });
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedbackTable.$inferSelect;
