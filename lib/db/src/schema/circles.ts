import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// ── Accountability circles (private, invite-only pods) ──────────────────────

export const circlesTable = pgTable("circles", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  ownerId:     text("owner_id").notNull(),
  inviteCode:  text("invite_code").notNull().unique(),
  maxMembers:  integer("max_members").notNull().default(8),
  description: text("description").notNull().default(""),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type Circle = typeof circlesTable.$inferSelect;

// ── Circle members ─────────────────────────────────────────────────────────

export const circleMembersTable = pgTable("circle_members", {
  id:        text("id").primaryKey(),
  circleId:  text("circle_id").notNull(),
  userId:    text("user_id").notNull(),
  role:      text("role").notNull().default("member"),   // "owner" | "member"
  status:    text("status").notNull().default("active"), // "active" | "left" | "removed"
  joinedAt:  timestamp("joined_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CircleMember = typeof circleMembersTable.$inferSelect;

// ── Circle activity (meaningful moments only, surfaced to circle) ──────────

export const circleActivityTable = pgTable("circle_activity", {
  id:        text("id").primaryKey(),
  circleId:  text("circle_id").notNull(),
  userId:    text("user_id").notNull(),
  eventType: text("event_type").notNull(), // "title_unlocked" | "badge_earned" | "chain_completed" | "milestone" | "challenge_completed" | "win_shared"
  payload:   text("payload").notNull().default("{}"), // JSON: { label, detail, icon, color }
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CircleActivity = typeof circleActivityTable.$inferSelect;

// ── Circle reports (minimal moderation) ───────────────────────────────────

export const circleReportsTable = pgTable("circle_reports", {
  id:         text("id").primaryKey(),
  circleId:   text("circle_id").notNull(),
  reporterId: text("reporter_id").notNull(),
  targetId:   text("target_id"),   // userId being reported (nullable = circle-level)
  reason:     text("reason").notNull(),
  status:     text("status").notNull().default("pending"), // "pending" | "reviewed" | "dismissed"
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export type CircleReport = typeof circleReportsTable.$inferSelect;

// ── Circle challenge participation (shared challenges for a circle) ─────────

export const circleChallengesTable = pgTable("circle_challenges", {
  id:          text("id").primaryKey(),
  circleId:    text("circle_id").notNull(),
  label:       text("label").notNull(),
  description: text("description").notNull().default(""),
  skillId:     text("skill_id"),
  icon:        text("icon").notNull().default("flash"),
  color:       text("color").notNull().default("#7C5CFC"),
  startsAt:    timestamp("starts_at").notNull().defaultNow(),
  endsAt:      timestamp("ends_at").notNull(),
  createdBy:   text("created_by").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export type CircleChallenge = typeof circleChallengesTable.$inferSelect;

export const circleChallengeParticipantsTable = pgTable("circle_challenge_participants", {
  id:          text("id").primaryKey(),
  challengeId: text("challenge_id").notNull(),
  userId:      text("user_id").notNull(),
  status:      text("status").notNull().default("joined"), // "joined" | "completed"
  completedAt: timestamp("completed_at"),
  joinedAt:    timestamp("joined_at").notNull().defaultNow(),
});

export type CircleChallengeParticipant = typeof circleChallengeParticipantsTable.$inferSelect;
