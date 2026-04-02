ALTER TABLE "life_profiles" ADD COLUMN IF NOT EXISTS "current_arc" text;
ALTER TABLE "life_profiles" ADD COLUMN IF NOT EXISTS "arc_set_at" timestamp;
ALTER TABLE "life_profiles" ADD COLUMN IF NOT EXISTS "arc_xp_snapshot" text NOT NULL DEFAULT '{}';
