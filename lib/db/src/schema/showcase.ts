import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

// ── Per-user opt-in prestige showcase settings ─────────────────────────────
// All fields default to false (nothing shared by default).

export const showcaseSettingsTable = pgTable("showcase_settings", {
  id:            text("id").primaryKey(),
  userId:        text("user_id").notNull().unique(),
  showTitle:     boolean("show_title").notNull().default(false),
  showArc:       boolean("show_arc").notNull().default(false),
  showSkills:    boolean("show_skills").notNull().default(false),
  showBadges:    boolean("show_badges").notNull().default(false),
  showStreak:    boolean("show_streak").notNull().default(false),
  showLevel:     boolean("show_level").notNull().default(false),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export type ShowcaseSettings = typeof showcaseSettingsTable.$inferSelect;
