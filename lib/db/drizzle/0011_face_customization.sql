-- Add face shape and eye shape columns to character_appearance

ALTER TABLE "character_appearance"
  ADD COLUMN IF NOT EXISTS "face_shape" text DEFAULT 'oval' NOT NULL;

ALTER TABLE "character_appearance"
  ADD COLUMN IF NOT EXISTS "eye_shape" text DEFAULT 'almond' NOT NULL;
