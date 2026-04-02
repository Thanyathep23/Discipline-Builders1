import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

// ── API Keys ──────────────────────────────────────────────────────────────────
// Users can generate scoped API keys for safe programmatic access.
// Keys are stored as a SHA-256 hash; the raw key is shown only once on creation.
export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),        // e.g. "dos_1a2b" — safe to show
  scope: text("scope").notNull().default("read"),  // "read" | "read_write"
  revokedAt: timestamp("revoked_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Webhook Subscriptions ─────────────────────────────────────────────────────
// Users can subscribe to key product events and receive HTTP callbacks.
export const webhookSubscriptionsTable = pgTable("webhook_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  endpointUrl: text("endpoint_url").notNull(),
  events: text("events").notNull(),               // JSON array of event names
  secret: text("secret").notNull(),               // HMAC-SHA256 signing secret
  isActive: boolean("is_active").notNull().default(true),
  failureCount: integer("failure_count").notNull().default(0),
  lastDeliveredAt: timestamp("last_delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Webhook Deliveries ────────────────────────────────────────────────────────
// Audit log for every webhook delivery attempt (success or failure).
export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").notNull(),
  eventName: text("event_name").notNull(),
  payload: text("payload").notNull(),             // JSON string
  httpStatus: integer("http_status"),
  responseBody: text("response_body"),
  success: boolean("success").notNull().default(false),
  attemptCount: integer("attempt_count").notNull().default(1),
  deliveredAt: timestamp("delivered_at").notNull().defaultNow(),
});
