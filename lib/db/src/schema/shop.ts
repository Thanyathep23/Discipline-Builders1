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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userInventoryTable = pgTable("user_inventory", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemId: text("item_id").notNull(),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export const insertShopItemSchema = createInsertSchema(shopItemsTable).omit({ createdAt: true });
export const insertUserInventorySchema = createInsertSchema(userInventoryTable).omit({ redeemedAt: true });

export type ShopItem = typeof shopItemsTable.$inferSelect;
export type UserInventory = typeof userInventoryTable.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
