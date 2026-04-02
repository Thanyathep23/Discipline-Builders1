-- Phase 33: Car Catalog Upgrade — color variant column + milestone badges

ALTER TABLE "user_inventory" ADD COLUMN IF NOT EXISTS "color_variant" text;

-- Retire old car catalog entries (soft-delete by setting status to retired)
UPDATE "shop_items" SET "status" = 'retired', "is_available" = false
WHERE "category" = 'vehicle' AND "id" LIKE 'car-%'
  AND "id" NOT IN (
    'car-v2-starter', 'car-v2-series-m', 'car-v2-alpine-gt',
    'car-v2-continental', 'car-v2-phantom', 'car-v2-vulcan'
  );

-- Seed car-collection milestone badges (idempotent)
INSERT INTO "badges" ("id", "name", "description", "icon", "category", "rarity", "condition")
VALUES
  ('badge-first-wheel',    'First Wheel',    'Purchased your first car.',          'car-outline',       'collection', 'uncommon',  '{"carsOwned":1}'),
  ('badge-the-collection', 'The Collection', 'Own 3 cars in your garage.',         'car-sport-outline', 'collection', 'rare',      '{"carsOwned":3}'),
  ('badge-elite-garage',   'Elite Garage',   'Own a Legendary-class vehicle.',     'diamond-outline',   'collection', 'legendary', '{"legendaryOwned":1}')
ON CONFLICT ("id") DO NOTHING;
