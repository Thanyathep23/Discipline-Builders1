import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const badgesTable = pgTable("badges", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description").notNull(),
  icon:        text("icon").notNull().default("ribbon"),
  category:    text("category").notNull().default("general"),
  rarity:      text("rarity").notNull().default("common"),
  condition:   text("condition").notNull().default("{}"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const userBadgesTable = pgTable("user_badges", {
  id:       text("id").primaryKey(),
  userId:   text("user_id").notNull(),
  badgeId:  text("badge_id").notNull(),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const titlesTable = pgTable("titles", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description").notNull(),
  category:    text("category").notNull().default("general"),
  rarity:      text("rarity").notNull().default("common"),
  condition:   text("condition").notNull().default("{}"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const userTitlesTable = pgTable("user_titles", {
  id:       text("id").primaryKey(),
  userId:   text("user_id").notNull(),
  titleId:  text("title_id").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export const milestoneUnlocksTable = pgTable("milestone_unlocks", {
  id:           text("id").primaryKey(),
  userId:       text("user_id").notNull(),
  milestoneKey: text("milestone_key").notNull(),
  details:      text("details").notNull().default("{}"),
  unlockedAt:   timestamp("unlocked_at").notNull().defaultNow(),
});

export type Badge = typeof badgesTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
export type Title = typeof titlesTable.$inferSelect;
export type UserTitle = typeof userTitlesTable.$inferSelect;
export type MilestoneUnlock = typeof milestoneUnlocksTable.$inferSelect;
