import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const inviteCodesTable = pgTable("invite_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  creatorId: text("creator_id").notNull(),
  usesCount: integer("uses_count").notNull().default(0),
  maxUses: integer("max_uses").notNull().default(50),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodesTable).omit({ createdAt: true });

export type InviteCode = typeof inviteCodesTable.$inferSelect;
