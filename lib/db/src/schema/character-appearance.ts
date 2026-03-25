import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SKIN_TONES = [
  "tone-1",
  "tone-2",
  "tone-3",
  "tone-4",
  "tone-5",
] as const;

export const BODY_TYPES = [
  "male",
  "female",
] as const;

export const HAIR_STYLES_MALE = [
  "clean_cut",
  "side_part",
  "textured_crop",
  "buzz_cut",
  "medium_natural",
  "slicked_back",
] as const;

export const HAIR_STYLES_FEMALE = [
  "short_bob",
  "side_part_long",
  "textured_pixie",
  "ponytail_sleek",
  "natural_medium",
  "bun_top",
] as const;

export const HAIR_STYLES = [
  ...HAIR_STYLES_MALE,
  ...HAIR_STYLES_FEMALE,
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
export type BodyType  = typeof BODY_TYPES[number];
export type HairStyle = typeof HAIR_STYLES[number];
export type HairColor = typeof HAIR_COLORS[number];

export const characterAppearanceTable = pgTable("character_appearance", {
  userId:    text("user_id").primaryKey(),
  skinTone:  text("skin_tone").notNull().default("tone-3"),
  bodyType:  text("body_type").notNull().default("male"),
  hairStyle: text("hair_style").notNull().default("clean_cut"),
  hairColor: text("hair_color").notNull().default("black"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCharacterAppearanceSchema = createInsertSchema(characterAppearanceTable).omit({ updatedAt: true });

export type CharacterAppearance       = typeof characterAppearanceTable.$inferSelect;
export type InsertCharacterAppearance = z.infer<typeof insertCharacterAppearanceSchema>;

export const DEFAULT_APPEARANCE = {
  skinTone:  "tone-3" as SkinTone,
  bodyType:  "male" as BodyType,
  hairStyle: "clean_cut" as HairStyle,
  hairColor: "black" as HairColor,
} as const;
