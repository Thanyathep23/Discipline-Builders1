import { pgTable, text, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─────────────────────────────────────────────────────────
// Phase 22: Catalog Categories
// ─────────────────────────────────────────────────────────
export const catalogCategoriesTable = pgTable("catalog_categories", {
  id:         text("id").primaryKey(),
  slug:       text("slug").notNull().unique(),
  name:       text("name").notNull(),
  parentId:   text("parent_id"),
  icon:       text("icon").notNull().default("grid-outline"),
  sortOrder:  integer("sort_order").notNull().default(0),
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const insertCatalogCategorySchema = createInsertSchema(catalogCategoriesTable).omit({ createdAt: true });
export type CatalogCategory = typeof catalogCategoriesTable.$inferSelect;
export type InsertCatalogCategory = z.infer<typeof insertCatalogCategorySchema>;

// ─────────────────────────────────────────────────────────
// Shop Items (Phase 17 base + Phase 22 catalog additions)
// ─────────────────────────────────────────────────────────
export const shopItemsTable = pgTable("shop_items", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  description: text("description").notNull(),
  cost:        integer("cost").notNull(),
  category:    text("category").notNull(),
  icon:        text("icon").notNull().default("gift"),
  isAvailable: boolean("is_available").notNull().default(true),
  // Phase 17 — Economy layer
  rarity:           text("rarity").notNull().default("common"),
  itemType:         text("item_type").notNull().default("cosmetic"),
  isLimited:        boolean("is_limited").notNull().default(false),
  isExclusive:      boolean("is_exclusive").notNull().default(false),
  featuredOrder:    integer("featured_order"),
  sellBackValue:    integer("sell_back_value").notNull().default(0),
  sortOrder:        integer("sort_order").notNull().default(0),
  acquisitionSource: text("acquisition_source").notNull().default("purchase"),
  // Phase 19 — Premium
  isPremiumOnly: boolean("is_premium_only").notNull().default(false),
  // Phase 22 — Catalog / Merchandising
  slug:            text("slug").unique(),
  fullDescription: text("full_description"),
  subcategory:     text("subcategory"),
  tags:            text("tags").notNull().default("[]"),
  status:          text("status").notNull().default("active"),
  previewImage:    text("preview_image"),
  availableFrom:   timestamp("available_from"),
  availableUntil:  timestamp("available_until"),
  isEquippable:    boolean("is_equippable").notNull().default(true),
  isDisplayable:   boolean("is_displayable").notNull().default(false),
  isProfileItem:   boolean("is_profile_item").notNull().default(false),
  isWorldItem:     boolean("is_world_item").notNull().default(false),
  eventId:         text("event_id"),
  contentPackId:   text("content_pack_id"),
  // Phase 29 — Wearables / Style / Identity
  wearableSlot:    text("wearable_slot"),                      // "top" | "outerwear" | "bottom" | "watch" | "accessory" | null
  minLevel:        integer("min_level").notNull().default(0),  // minimum user level to equip
  styleEffect:     text("style_effect"),                       // human-readable style impact
  // Phase 35 — Wardrobe Premium Catalog
  series:          text("series"),                             // collection/series name
  colorVariants:   text("color_variants"),                     // JSON array of {key, label, hex} objects
  // Phase 30 — Room Progression / Workspace Decor
  roomZone:        text("room_zone"),                          // "desk_setup" | "lifestyle_item" | null
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const userInventoryTable = pgTable("user_inventory", {
  id:           text("id").primaryKey(),
  userId:       text("user_id").notNull(),
  itemId:       text("item_id").notNull(),
  isEquipped:   boolean("is_equipped").notNull().default(false),
  source:       text("source").notNull().default("purchase"),
  redeemedAt:   timestamp("redeemed_at").notNull().defaultNow(),
  displaySlot:  text("display_slot"),
  colorVariant: text("color_variant"),
  wheelStyle:   text("wheel_style"),
});

export const insertShopItemSchema = createInsertSchema(shopItemsTable).omit({ createdAt: true, updatedAt: true });
export const insertUserInventorySchema = createInsertSchema(userInventoryTable).omit({ redeemedAt: true });

export type ShopItem = typeof shopItemsTable.$inferSelect;
export type UserInventory = typeof userInventoryTable.$inferSelect;
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
