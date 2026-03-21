-- Phase 16: Platformization — API Keys, Webhook Subscriptions, Webhook Deliveries

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "label" text NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text NOT NULL,
  "scope" text NOT NULL DEFAULT 'read',
  "revoked_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "label" text NOT NULL,
  "endpoint_url" text NOT NULL,
  "events" text NOT NULL,
  "secret" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "failure_count" integer NOT NULL DEFAULT 0,
  "last_delivered_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "subscription_id" text NOT NULL,
  "event_name" text NOT NULL,
  "payload" text NOT NULL,
  "http_status" integer,
  "response_body" text,
  "success" boolean NOT NULL DEFAULT false,
  "attempt_count" integer NOT NULL DEFAULT 1,
  "delivered_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "webhook_subs_user_id_idx" ON "webhook_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_sub_id_idx" ON "webhook_deliveries" ("subscription_id");
