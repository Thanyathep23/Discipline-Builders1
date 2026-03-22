-- Phase 35: Wardrobe Premium Catalog
-- Add series and colorVariants columns to shop_items

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS series TEXT;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS color_variants TEXT;
