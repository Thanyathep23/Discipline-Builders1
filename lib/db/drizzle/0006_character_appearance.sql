-- Phase 32: Character Appearance — user-controlled cosmetic layer

CREATE TABLE IF NOT EXISTS "character_appearance" (
	"user_id" text PRIMARY KEY NOT NULL,
	"skin_tone" text DEFAULT 'tone-3' NOT NULL,
	"hair_style" text DEFAULT 'low-fade' NOT NULL,
	"hair_color" text DEFAULT 'black' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
