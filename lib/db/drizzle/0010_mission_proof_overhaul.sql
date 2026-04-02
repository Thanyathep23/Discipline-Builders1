-- Mission + Proof + AI Judge Engine Overhaul

ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "proof_required" boolean NOT NULL DEFAULT true;
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "proof_requirements" text;
ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "mission_value_score" real NOT NULL DEFAULT 0;

ALTER TABLE "proof_submissions" ADD COLUMN IF NOT EXISTS "text_hash" text;
ALTER TABLE "proof_submissions" ADD COLUMN IF NOT EXISTS "followup_count" integer NOT NULL DEFAULT 0;

ALTER TYPE "proof_status" ADD VALUE IF NOT EXISTS 'manual_review';

CREATE INDEX IF NOT EXISTS "idx_proof_user_text_hash" ON "proof_submissions" ("user_id", "text_hash");
