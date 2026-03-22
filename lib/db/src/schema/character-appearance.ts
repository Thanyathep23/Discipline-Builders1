import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─────────────────────────────────────────────────────────────────────────────
// Allowed appearance values — shared with the API routes layer
// ─────────────────────────────────────────────────────────────────────────────

export const SKIN_TONES = [
  "tone-1", // ivory / very light
  "tone-2", // fair / light
  "tone-3", // medium / tan
  "tone-4", // brown / medium-dark
  "tone-5", // deep / dark
] as const;

export const HAIR_STYLES = [
  "low-fade",
  "caesar",
  "taper",
  "waves",
  "natural",
  "bald",
] as const;

export const HAIR_COLORS = [
  "black",
  "dark-brown",
  "medium-brown",
  "light-brown",
  "dirty-blonde",
  "blonde",
  "auburn",
  "platinum",
] as const;

export type SkinTone  = typeof SKIN_TONES[number];
export type HairStyle = typeof HAIR_STYLES[number];
export type HairColor = typeof HAIR_COLORS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────────────────────────

export const characterAppearanceTable = pgTable("character_appearance", {
  userId:    text("user_id").primaryKey(),
  skinTone:  text("skin_tone").notNull().default("tone-3"),
  hairStyle: text("hair_style").notNull().default("low-fade"),
  hairColor: text("hair_color").notNull().default("black"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCharacterAppearanceSchema = createInsertSchema(characterAppearanceTable).omit({ updatedAt: true });

export type CharacterAppearance       = typeof characterAppearanceTable.$inferSelect;
export type InsertCharacterAppearance = z.infer<typeof insertCharacterAppearanceSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Defaults (used when a user has never customized)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_APPEARANCE = {
  skinTone:  "tone-3" as SkinTone,
  hairStyle: "low-fade" as HairStyle,
  hairColor: "black" as HairColor,
} as const;
