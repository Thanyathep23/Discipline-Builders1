import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export type CycleType = "focus_season" | "recovery_sprint" | "trading_cycle" | "learning_sprint";
export type CycleStatus = "active" | "completed" | "expired";

export const CYCLE_DEFINITIONS: Record<CycleType, {
  label: string;
  description: string;
  durationDays: number;
  targetCount: number;
  skillId: string;
  rewardTitle: string;
  icon: string;
  color: string;
}> = {
  focus_season: {
    label: "Focus Season",
    description: "Complete 20 focus sessions over 30 days.",
    durationDays: 30,
    targetCount: 20,
    skillId: "focus",
    rewardTitle: "Season-Hardened",
    icon: "eye",
    color: "#7C5CFC",
  },
  recovery_sprint: {
    label: "Recovery Sprint",
    description: "Complete 15 sleep or recovery missions in 21 days.",
    durationDays: 21,
    targetCount: 15,
    skillId: "sleep",
    rewardTitle: "Iron Recovery",
    icon: "moon",
    color: "#00BCD4",
  },
  trading_cycle: {
    label: "Trading Practice Cycle",
    description: "Complete 20 trading practice missions in 28 days.",
    durationDays: 28,
    targetCount: 20,
    skillId: "trading",
    rewardTitle: "Market Practitioner",
    icon: "trending-up",
    color: "#F5C842",
  },
  learning_sprint: {
    label: "Learning Sprint",
    description: "Complete 15 learning missions in 21 days.",
    durationDays: 21,
    targetCount: 15,
    skillId: "learning",
    rewardTitle: "Knowledge Builder",
    icon: "book",
    color: "#00D4FF",
  },
};

export const userCyclesTable = pgTable("user_cycles", {
  id:             text("id").primaryKey(),
  userId:         text("user_id").notNull(),
  cycleType:      text("cycle_type").notNull(),
  status:         text("status").notNull().default("active"),
  progressCount:  integer("progress_count").notNull().default(0),
  targetCount:    integer("target_count").notNull(),
  startedAt:      timestamp("started_at").notNull().defaultNow(),
  endsAt:         timestamp("ends_at").notNull(),
  completedAt:    timestamp("completed_at"),
  rewardClaimed:  text("reward_claimed").notNull().default("false"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export type UserCycle = typeof userCyclesTable.$inferSelect;
