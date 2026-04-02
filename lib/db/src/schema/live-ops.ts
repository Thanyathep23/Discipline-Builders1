import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const contentPacksTable = pgTable("content_packs", {
  id:               text("id").primaryKey(),
  slug:             text("slug").notNull().unique(),
  name:             text("name").notNull(),
  description:      text("description").notNull().default(""),
  theme:            text("theme").notNull().default("focus"),
  targetSkill:      text("target_skill"),
  targetArc:        text("target_arc"),
  status:           text("status").notNull().default("draft"),
  isLimitedTime:    boolean("is_limited_time").notNull().default(false),
  startsAt:         timestamp("starts_at"),
  endsAt:           timestamp("ends_at"),
  missionTemplates: text("mission_templates").notNull().default("[]"),
  rewardTitle:      text("reward_title"),
  rewardBadge:      text("reward_badge"),
  rewardCoins:      integer("reward_coins").notNull().default(0),
  eligibilityRule:  text("eligibility_rule").notNull().default("none"),
  sortOrder:        integer("sort_order").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const liveEventsTable = pgTable("live_events", {
  id:               text("id").primaryKey(),
  slug:             text("slug").notNull().unique(),
  name:             text("name").notNull(),
  description:      text("description").notNull().default(""),
  status:           text("status").notNull().default("draft"),
  startsAt:         timestamp("starts_at"),
  endsAt:           timestamp("ends_at"),
  contentPackId:    text("content_pack_id"),
  bonusMultiplier:  text("bonus_multiplier").notNull().default("1.0"),
  rewardTitle:      text("reward_title"),
  rewardBadge:      text("reward_badge"),
  rewardCoins:      integer("reward_coins").notNull().default(0),
  targetArc:        text("target_arc"),
  targetUserState:  text("target_user_state").notNull().default("any"),
  bannerColor:      text("banner_color").notNull().default("#7C5CFC"),
  sortOrder:        integer("sort_order").notNull().default(0),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const contentVariantsTable = pgTable("content_variants", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  surface:        text("surface").notNull(),
  status:         text("status").notNull().default("draft"),
  variants:       text("variants").notNull().default("[]"),
  assignmentMode: text("assignment_mode").notNull().default("user_id_mod"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const userVariantAssignmentsTable = pgTable("user_variant_assignments", {
  id:          text("id").primaryKey(),
  userId:      text("user_id").notNull(),
  variantId:   text("variant_id").notNull(),
  assignedKey: text("assigned_key").notNull(),
  assignedAt:  timestamp("assigned_at").notNull().defaultNow(),
});

export type ContentPack           = typeof contentPacksTable.$inferSelect;
export type LiveEvent             = typeof liveEventsTable.$inferSelect;
export type ContentVariant        = typeof contentVariantsTable.$inferSelect;
export type UserVariantAssignment = typeof userVariantAssignmentsTable.$inferSelect;
