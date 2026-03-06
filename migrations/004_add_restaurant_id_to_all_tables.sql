-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Add restaurant_id to all data tables
-- Run this in the Supabase SQL editor (schema: ibgsc)
--
-- Purpose: Scope all operational data to a specific restaurant so the app
--          can support multiple restaurants. Existing rows are backfilled
--          with the default "Inchin's Bamboo Garden" restaurant.
--
-- Prerequisites:
--   • Migration 003_add_restaurants.sql must have been run first
--     (creates ibgsc.restaurants and ibgsc.access_requests tables)
--
-- Tables modified:
--   • transactions      — add restaurant_id (UUID FK)
--   • receipts           — add restaurant_id (UUID FK)
--   • catering_events    — add restaurant_id (UUID FK)
--   • orders             — add restaurant_id (UUID FK)
--   • categories         — add restaurant_id (UUID FK)
--   • vendors            — add restaurant_id (UUID FK)
--   • products           — add restaurant_id (UUID FK)
--
-- Tables NOT modified:
--   • app_users          — already has restaurant_id (migration 003)
--   • access_requests    — already has restaurant_id (migration 003)
--   • order_lines        — inherits restaurant scope via order_id FK
--   • restaurants        — IS the restaurant table
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Step 0: Ensure the default restaurant exists ─────────────────────────────
-- (Idempotent — will not create duplicates)
INSERT INTO
    ibgsc.restaurants (name, location, admin_email)
SELECT 'Inchin''s Bamboo Garden', 'South Charlotte', 'sri7576@gmail.com'
WHERE
    NOT EXISTS (
        SELECT 1
        FROM ibgsc.restaurants
        WHERE
            name = 'Inchin''s Bamboo Garden'
    );

-- ── Step 1: Add restaurant_id column to each table ──────────────────────────

-- 1a. transactions
ALTER TABLE ibgsc.transactions
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1b. receipts
ALTER TABLE ibgsc.receipts
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1c. catering_events
ALTER TABLE ibgsc.catering_events
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1d. orders
ALTER TABLE ibgsc.orders
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1e. categories
ALTER TABLE ibgsc.categories
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1f. vendors
ALTER TABLE ibgsc.vendors
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- 1g. products
ALTER TABLE ibgsc.products
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants (id);

-- ── Step 2: Backfill existing rows with default restaurant ──────────────────
-- All existing data belongs to "Inchin's Bamboo Garden"

DO $$
DECLARE
  v_default_id UUID;
BEGIN
  SELECT id INTO v_default_id
    FROM ibgsc.restaurants
    WHERE name = 'Inchin''s Bamboo Garden'
    LIMIT 1;

  IF v_default_id IS NULL THEN
    RAISE EXCEPTION 'Default restaurant "Inchin''s Bamboo Garden" not found. Run migration 003_add_restaurants.sql first.';
  END IF;

  -- Backfill each table
  UPDATE ibgsc.transactions     SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.receipts         SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.catering_events  SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.orders           SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.categories       SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.vendors          SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;
  UPDATE ibgsc.products         SET restaurant_id = v_default_id WHERE restaurant_id IS NULL;

  -- Also ensure all active app_users are assigned (from migration 003)
  UPDATE ibgsc.app_users
    SET restaurant_id = v_default_id
    WHERE restaurant_id IS NULL AND status = 'Active';

  RAISE NOTICE 'Backfill complete: all existing rows assigned to restaurant_id = %', v_default_id;
END $$;

-- ── Step 3: Create indexes for efficient restaurant-scoped queries ──────────

CREATE INDEX IF NOT EXISTS idx_transactions_restaurant ON ibgsc.transactions (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_receipts_restaurant ON ibgsc.receipts (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_catering_events_restaurant ON ibgsc.catering_events (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON ibgsc.orders (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON ibgsc.categories (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_vendors_restaurant ON ibgsc.vendors (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_products_restaurant ON ibgsc.products (restaurant_id);

-- ── Step 4: Enable RLS on new tables (if not already) ───────────────────────

ALTER TABLE ibgsc.restaurants ENABLE ROW LEVEL SECURITY;

ALTER TABLE ibgsc.access_requests ENABLE ROW LEVEL SECURITY;

-- Permissive policies (tighten later as needed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND schemaname = 'ibgsc') THEN
    EXECUTE 'CREATE POLICY "allow_all_restaurants" ON ibgsc.restaurants FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'access_requests' AND schemaname = 'ibgsc') THEN
    EXECUTE 'CREATE POLICY "allow_all_access_requests" ON ibgsc.access_requests FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Grants for anon / authenticated roles
GRANT ALL ON ibgsc.restaurants TO anon, authenticated;

GRANT ALL ON ibgsc.access_requests TO anon, authenticated;

-- ── Step 5: Add comments ────────────────────────────────────────────────────

COMMENT ON COLUMN ibgsc.transactions.restaurant_id IS 'FK to restaurants — scopes cash transactions per location';

COMMENT ON COLUMN ibgsc.receipts.restaurant_id IS 'FK to restaurants — scopes receipts per location';

COMMENT ON COLUMN ibgsc.catering_events.restaurant_id IS 'FK to restaurants — scopes catering events per location';

COMMENT ON COLUMN ibgsc.orders.restaurant_id IS 'FK to restaurants — scopes inventory orders per location';

COMMENT ON COLUMN ibgsc.categories.restaurant_id IS 'FK to restaurants — scopes product categories per location';

COMMENT ON COLUMN ibgsc.vendors.restaurant_id IS 'FK to restaurants — scopes vendor list per location';

COMMENT ON COLUMN ibgsc.products.restaurant_id IS 'FK to restaurants — scopes product catalog per location';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Done! Verify with:
--   SELECT table_name, column_name
--   FROM information_schema.columns
--   WHERE table_schema = 'ibgsc' AND column_name = 'restaurant_id'
--   ORDER BY table_name;
-- ═══════════════════════════════════════════════════════════════════════════════