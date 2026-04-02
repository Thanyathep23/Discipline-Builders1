-- Phase 13: Endgame / Prestige / Long-term Retention
-- Additive only — no destructive changes

-- Mastery tiers on user_skills
ALTER TABLE "user_skills" ADD COLUMN IF NOT EXISTS "mastery_tier" integer NOT NULL DEFAULT 0;
ALTER TABLE "user_skills" ADD COLUMN IF NOT EXISTS "mastery_unlocked_at" timestamp;

-- Prestige on users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prestige_tier" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "prestige_ready_at" timestamp;

-- Arc stage on life_profiles
ALTER TABLE "life_profiles" ADD COLUMN IF NOT EXISTS "arc_stage" text NOT NULL DEFAULT 'beginning';
ALTER TABLE "life_profiles" ADD COLUMN IF NOT EXISTS "arc_stage_xp_snapshot" text NOT NULL DEFAULT '{}';

-- Seasonal / cyclical goal layer
CREATE TABLE IF NOT EXISTS "user_cycles" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "cycle_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "progress_count" integer NOT NULL DEFAULT 0,
  "target_count" integer NOT NULL,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "ends_at" timestamp NOT NULL,
  "completed_at" timestamp,
  "reward_claimed" text NOT NULL DEFAULT 'false',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
