import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// admin_incidents — lightweight operational incident tracking
// ─────────────────────────────────────────────────────────────────────────────
export const adminIncidentsTable = pgTable("admin_incidents", {
  id:                text("id").primaryKey(),
  type:              text("type").notNull(),
  severity:          text("severity").notNull().default("medium"),
  status:            text("status").notNull().default("new"),
  summary:           text("summary").notNull(),
  affectedArea:      text("affected_area").notNull(),
  affectedCount:     integer("affected_count"),
  linkedEntityId:    text("linked_entity_id"),
  linkedEntityType:  text("linked_entity_type"),
  owner:             text("owner"),
  notes:             text("notes"),
  firstSeen:         timestamp("first_seen").notNull().defaultNow(),
  lastSeen:          timestamp("last_seen").notNull().defaultNow(),
  resolvedAt:        timestamp("resolved_at"),
  createdBy:         text("created_by"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export type AdminIncident = typeof adminIncidentsTable.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// admin_experiments — lightweight A/B experiment controls
// ─────────────────────────────────────────────────────────────────────────────
export const adminExperimentsTable = pgTable("admin_experiments", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  surface:        text("surface").notNull(),
  hypothesis:     text("hypothesis").notNull().default(""),
  status:         text("status").notNull().default("draft"),
  variants:       text("variants").notNull().default("[]"),
  assignmentMode: text("assignment_mode").notNull().default("user_id_mod"),
  rolloutPct:     integer("rollout_pct").notNull().default(100),
  startedAt:      timestamp("started_at"),
  endedAt:        timestamp("ended_at"),
  createdBy:      text("created_by"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export type AdminExperiment = typeof adminExperimentsTable.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// support_cases — player-centric support case tracking
// ─────────────────────────────────────────────────────────────────────────────
export const supportCasesTable = pgTable("support_cases", {
  id:          text("id").primaryKey(),
  playerId:    text("player_id").notNull(),
  title:       text("title").notNull(),
  status:      text("status").notNull().default("open"),
  priority:    text("priority").notNull().default("normal"),
  category:    text("category"),
  createdBy:   text("created_by").notNull(),
  resolvedAt:  timestamp("resolved_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export type SupportCase = typeof supportCasesTable.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// support_case_notes — threaded history for support cases
// ─────────────────────────────────────────────────────────────────────────────
export const supportCaseNotesTable = pgTable("support_case_notes", {
  id:           text("id").primaryKey(),
  caseId:       text("case_id").notNull(),
  actorId:      text("actor_id").notNull(),
  note:         text("note").notNull(),
  actionTaken:  text("action_taken"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export type SupportCaseNote = typeof supportCaseNotesTable.$inferSelect;
