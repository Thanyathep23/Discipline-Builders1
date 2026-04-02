CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."mission_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('draft', 'active', 'completed', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'paused', 'completed', 'abandoned', 'low_confidence');--> statement-breakpoint
CREATE TYPE "public"."strictness_mode" AS ENUM('normal', 'strict', 'extreme');--> statement-breakpoint
CREATE TYPE "public"."proof_status" AS ENUM('pending', 'reviewing', 'approved', 'partial', 'rejected', 'flagged', 'followup_needed');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('earned', 'spent', 'bonus', 'penalty', 'admin_grant', 'admin_revoke');--> statement-breakpoint
CREATE TYPE "public"."sleep_quality" AS ENUM('poor', 'fair', 'good', 'excellent');--> statement-breakpoint
CREATE TYPE "public"."penalty_reason" AS ENUM('abandoned_session', 'blocked_attempt', 'failed_proof', 'missed_deadline', 'admin_penalty', 'low_trust_score');--> statement-breakpoint
CREATE TYPE "public"."heartbeat_source" AS ENUM('mobile', 'web', 'extension');--> statement-breakpoint
CREATE TYPE "public"."blocked_attempt_source" AS ENUM('extension', 'mobile', 'api');--> statement-breakpoint
CREATE TYPE "public"."time_entry_source" AS ENUM('manual', 'focus_session', 'sleep_log');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"coin_balance" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"trust_score" real DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_active_at" timestamp,
	"last_streak_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"target_duration_minutes" integer NOT NULL,
	"priority" "mission_priority" DEFAULT 'medium' NOT NULL,
	"impact_level" integer DEFAULT 5 NOT NULL,
	"due_date" text,
	"purpose" text,
	"required_proof_types" text DEFAULT 'text' NOT NULL,
	"status" "mission_status" DEFAULT 'draft' NOT NULL,
	"reward_potential" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"strictness_mode" "strictness_mode" DEFAULT 'normal' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"paused_at" timestamp,
	"ended_at" timestamp,
	"total_paused_seconds" integer DEFAULT 0 NOT NULL,
	"pause_count" integer DEFAULT 0 NOT NULL,
	"blocked_attempt_count" integer DEFAULT 0 NOT NULL,
	"heartbeat_count" integer DEFAULT 0 NOT NULL,
	"extension_connected" boolean DEFAULT false NOT NULL,
	"last_heartbeat_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "proof_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"mission_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "proof_status" DEFAULT 'pending' NOT NULL,
	"text_summary" text,
	"links" text DEFAULT '[]' NOT NULL,
	"file_urls" text DEFAULT '[]' NOT NULL,
	"ai_confidence_score" real,
	"ai_verdict" text,
	"ai_explanation" text,
	"ai_rubric_relevance" real,
	"ai_rubric_quality" real,
	"ai_rubric_plausibility" real,
	"ai_rubric_specificity" real,
	"followup_questions" text,
	"followup_answers" text,
	"reward_multiplier" real,
	"coins_awarded" integer,
	"manual_review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "reward_type" NOT NULL,
	"amount" integer NOT NULL,
	"xp_amount" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"mission_id" text,
	"session_id" text,
	"proof_id" text,
	"penalty_id" text,
	"balance_after" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_role" text DEFAULT 'system' NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"target_type" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"cost" integer NOT NULL,
	"category" text NOT NULL,
	"icon" text DEFAULT 'gift' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"redeemed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocking_config" (
	"user_id" text PRIMARY KEY NOT NULL,
	"blocked_domains" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"bedtime" timestamp NOT NULL,
	"wake_time" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"quality" "sleep_quality" DEFAULT 'fair' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "penalties" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"mission_id" text,
	"proof_id" text,
	"reason" "penalty_reason" NOT NULL,
	"coins_deducted" integer DEFAULT 0 NOT NULL,
	"xp_deducted" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"applied_by" text
);
--> statement-breakpoint
CREATE TABLE "strictness_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"max_pauses" integer DEFAULT 3 NOT NULL,
	"blocked_attempt_penalty_cost" integer DEFAULT 10 NOT NULL,
	"proof_quality_threshold" real DEFAULT 0.5 NOT NULL,
	"reward_ceiling_bonus" real DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_heartbeats" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"source" "heartbeat_source" DEFAULT 'mobile' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"meta" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"domain" text NOT NULL,
	"source" "blocked_attempt_source" DEFAULT 'extension' NOT NULL,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"meta" text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"mission_id" text,
	"category" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"source" time_entry_source DEFAULT 'focus_session' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
