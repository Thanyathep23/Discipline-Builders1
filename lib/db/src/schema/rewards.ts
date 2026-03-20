import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rewardTypeEnum = pgEnum("reward_type", [
  "earned", "spent", "bonus", "penalty", "admin_grant", "admin_revoke"
]);

export const rewardTransactionsTable = pgTable("reward_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: rewardTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),        // coins (positive = credit, negative = debit)
  xpAmount: integer("xp_amount").notNull().default(0),
  reason: text("reason").notNull(),
  missionId: text("mission_id"),
  sessionId: text("session_id"),
  proofId: text("proof_id"),
  penaltyId: text("penalty_id"),
  balanceAfter: integer("balance_after"),     // snapshot of balance post-transaction
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRewardTransactionSchema = createInsertSchema(rewardTransactionsTable).omit({
  createdAt: true,
});

export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
export type RewardTransaction = typeof rewardTransactionsTable.$inferSelect;
