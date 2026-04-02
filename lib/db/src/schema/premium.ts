// Phase 19 — Premium / Monetization schema
import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Premium Content / Challenge Packs catalog ───────────────────────────────
export const premiumPacksTable = pgTable("premium_packs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  tagline: text("tagline").notNull().default(""),
  icon: text("icon").notNull().default("cube"),
  category: text("category").notNull().default("challenge"),
  // "free" | "premium_required" | "purchase"
  accessModel: text("access_model").notNull().default("premium_required"),
  coinPrice: integer("coin_price").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── User-owned premium packs ─────────────────────────────────────────────────
export const userPremiumPacksTable = pgTable("user_premium_packs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  packId: text("pack_id").notNull(),
  grantedBy: text("granted_by").notNull().default("purchase"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

// ─── Purchase records (stub — real billing TODO) ──────────────────────────────
export const purchaseRecordsTable = pgTable("purchase_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  // "premium_membership" | "premium_pack" | "premium_item"
  productType: text("product_type").notNull(),
  productId: text("product_id").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  // "simulated" | "stripe" | "apple" | "google"
  provider: text("provider").notNull().default("simulated"),
  providerRef: text("provider_ref"),
  status: text("status").notNull().default("completed"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPremiumPackSchema = createInsertSchema(premiumPacksTable).omit({ createdAt: true });
export const insertUserPremiumPackSchema = createInsertSchema(userPremiumPacksTable).omit({ grantedAt: true });
export const insertPurchaseRecordSchema = createInsertSchema(purchaseRecordsTable).omit({ createdAt: true });

export type PremiumPack = typeof premiumPacksTable.$inferSelect;
export type UserPremiumPack = typeof userPremiumPacksTable.$inferSelect;
export type PurchaseRecord = typeof purchaseRecordsTable.$inferSelect;
export type InsertPremiumPack = z.infer<typeof insertPremiumPackSchema>;
