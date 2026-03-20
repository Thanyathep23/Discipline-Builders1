import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const missionPriorityEnum = pgEnum("mission_priority", ["low", "medium", "high", "critical"]);
export const missionStatusEnum = pgEnum("mission_status", ["draft", "active", "completed", "rejected", "archived"]);
export const missionSourceEnum = pgEnum("mission_source", ["user_created", "ai_generated"]);

export const missionsTable = pgTable("missions", {
  id:                    text("id").primaryKey(),
  userId:                text("user_id").notNull(),
  title:                 text("title").notNull(),
  description:           text("description"),
  category:              text("category").notNull(),
  targetDurationMinutes: integer("target_duration_minutes").notNull(),
  priority:              missionPriorityEnum("priority").notNull().default("medium"),
  impactLevel:           integer("impact_level").notNull().default(5),
  dueDate:               text("due_date"),
  purpose:               text("purpose"),
  requiredProofTypes:    text("required_proof_types").notNull().default("text"),
  status:                missionStatusEnum("status").notNull().default("draft"),
  rewardPotential:       integer("reward_potential").notNull().default(0),
  source:                missionSourceEnum("source").notNull().default("user_created"),
  aiMissionId:           text("ai_mission_id"),
  relatedSkill:          text("related_skill"),
  difficultyColor:       text("difficulty_color"),
  rarity:                text("rarity").notNull().default("normal"),
  chainId:               text("chain_id"),
  chainStep:             integer("chain_step"),
  rarityBonusCoins:      integer("rarity_bonus_coins").notNull().default(0),
  chainBonusCoins:       integer("chain_bonus_coins").notNull().default(0),
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});

export const insertMissionSchema = createInsertSchema(missionsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missionsTable.$inferSelect;
