import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const userQuestChainsTable = pgTable("user_quest_chains", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  chainId: text("chain_id").notNull(),
  chainName: text("chain_name").notNull(),
  relatedSkill: text("related_skill").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  totalSteps: integer("total_steps").notNull(),
  completionBonusCoins: integer("completion_bonus_coins").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserQuestChain = typeof userQuestChainsTable.$inferSelect;
