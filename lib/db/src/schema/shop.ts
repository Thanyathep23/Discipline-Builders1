import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopItemsTable = pgTable("shop_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cost: integer("cost").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull().default("gift"),
  isAvailable: boolean("is_available").notNull().default(true),
  // Phase 17 — Economy layer
  rarity: text("rarity").notNull().default("common"),
  itemType: text("item_type").notNull().default("cosmetic"),
  isLimited: boolean("is_limited").notNull().default(false),
  isExclusive: boolean("is_exclusive").notNull().default(false),
  featuredOrder: integer("featured_order"),
  sellBackValue: integer("sell_back_value").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  acquisitionSource: text("acquisition_source").notNull().default("purchase"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userInventoryTable = pgTable("user_inventory", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  isEquipped: boolean("is_equipped").notNull().default(false),
  source: text("source").notNull().default("purchase"),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export const insertShopItemSchema = createInsertSchema(shopItemsTable).omit({ createdAt: true });
export const insertUserInventorySchema = createInsertSchema(userInventoryTable).omit({ redeemedAt: true });

export type ShopItem = typeof shopItemsTable.$inferSelect;
export type UserInventory = typeof userInventoryTable.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
