-- Phase 17: Economy / Marketplace / Trading Layer Lite

-- Add rarity and type classification to shop_items
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'cosmetic';
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_limited boolean NOT NULL DEFAULT false;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS featured_order integer;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS sell_back_value integer NOT NULL DEFAULT 0;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS acquisition_source text NOT NULL DEFAULT 'purchase';

-- Add equip state and source tracking to user_inventory
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS is_equipped boolean NOT NULL DEFAULT false;
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'purchase';

-- Prevent duplicate purchases: unique constraint on (user_id, item_id)
-- Use DO block to add only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_inventory_user_item_unique'
  ) THEN
    ALTER TABLE user_inventory ADD CONSTRAINT user_inventory_user_item_unique UNIQUE (user_id, item_id);
  END IF;
END $$;
