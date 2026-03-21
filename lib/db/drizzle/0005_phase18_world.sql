-- Phase 18: World / Room / Lifestyle Presentation Layer Lite

-- Add display_slot to user_inventory for slot-based item placement
ALTER TABLE user_inventory ADD COLUMN IF NOT EXISTS display_slot text;
