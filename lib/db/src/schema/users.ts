import { pgTable, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  coinBalance: integer("coin_balance").notNull().default(0),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  trustScore: real("trust_score").notNull().default(1.0),
  isActive: boolean("is_active").notNull().default(true),
  lastActiveAt: timestamp("last_active_at"),
  lastStreakDate: text("last_streak_date"),
  acquisitionSource: text("acquisition_source"),
  invitedByCode: text("invited_by_code"),
  invitedBy: text("invited_by"),
  prestigeTier: integer("prestige_tier").notNull().default(0),
  prestigeReadyAt: timestamp("prestige_ready_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
