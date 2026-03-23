-- Phase 36: Add unique constraints for room decoration system integrity

-- Prevent duplicate badge awards per user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_badges_user_badge_unique'
  ) THEN
    CREATE UNIQUE INDEX user_badges_user_badge_unique ON user_badges (user_id, badge_id);
  END IF;
END $$;

-- Prevent duplicate slot assignments per user (only for non-null display_slot)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'user_inventory_user_slot_unique'
  ) THEN
    CREATE UNIQUE INDEX user_inventory_user_slot_unique ON user_inventory (user_id, display_slot) WHERE display_slot IS NOT NULL;
  END IF;
END $$;
