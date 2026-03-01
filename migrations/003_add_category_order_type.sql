-- Migration 003: Add order_type to categories table + seed Bar/IBG data
-- Run this in the Supabase SQL editor (schema: ibgsc)

-- ── 1. Add order_type column to categories ───────────────────────────────────
ALTER TABLE ibgsc.categories
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'WEEKLY_FOOD';

-- Backfill existing categories (produce, meats, etc.) as WEEKLY_FOOD
UPDATE ibgsc.categories
  SET order_type = 'WEEKLY_FOOD'
  WHERE order_type IS NULL OR order_type = '';

-- ── 2. Add order_type column to categories ───────────────────────────────────
-- Bar & Front of House categories
INSERT INTO ibgsc.categories (name, sort_order, order_type) VALUES
  ('Non-Alcoholic Beverages', 10, 'BAR'),
  ('Beer and Wine',           20, 'BAR'),
  ('ABC Spirits',             30, 'BAR'),
  ('Bar Misc',                40, 'BAR');

-- IBG Order categories
INSERT INTO ibgsc.categories (name, sort_order, order_type) VALUES
  ('IBG Food',         10, 'IBG'),
  ('Paper Products',   20, 'IBG'),
  ('Crockery',         30, 'IBG'),
  ('IBG Misc',         40, 'IBG');

-- ── 3. Seed sample vendors for Bar & IBG ─────────────────────────────────────
INSERT INTO ibgsc.vendors (code, name, is_active) VALUES
  ('ABC',      'ABC Fine Wine & Spirits', true),
  ('SYSCO-BEV','Sysco Beverages',         true),
  ('IBG-DIST', 'IBG Distributor',         true)
ON CONFLICT (code) DO NOTHING;

-- ── 4. Seed Bar & Front of House sample products ─────────────────────────────
DO $$
DECLARE
  v_abc      INTEGER;
  v_sysv     INTEGER;
  c_nonalc   INTEGER;
  c_beer     INTEGER;
  c_spirits  INTEGER;
  c_misc_bar INTEGER;
BEGIN
  SELECT id INTO v_abc   FROM ibgsc.vendors     WHERE code = 'ABC'       LIMIT 1;
  SELECT id INTO v_sysv  FROM ibgsc.vendors     WHERE code = 'SYSCO-BEV' LIMIT 1;
  SELECT id INTO c_nonalc   FROM ibgsc.categories WHERE name = 'Non-Alcoholic Beverages' AND order_type = 'BAR' LIMIT 1;
  SELECT id INTO c_beer     FROM ibgsc.categories WHERE name = 'Beer and Wine'            AND order_type = 'BAR' LIMIT 1;
  SELECT id INTO c_spirits  FROM ibgsc.categories WHERE name = 'ABC Spirits'              AND order_type = 'BAR' LIMIT 1;
  SELECT id INTO c_misc_bar FROM ibgsc.categories WHERE name = 'Bar Misc'                 AND order_type = 'BAR' LIMIT 1;

  INSERT INTO ibgsc.products (name, category_id, vendor_id, unit, is_active) VALUES
    -- Non-Alcoholic Beverages
    ('Coke',              c_nonalc,   v_sysv, 'case',   true),
    ('Diet Coke',         c_nonalc,   v_sysv, 'case',   true),
    ('Sprite',            c_nonalc,   v_sysv, 'case',   true),
    ('Tonic Water',       c_nonalc,   v_sysv, 'case',   true),
    ('Ginger Beer',       c_nonalc,   v_sysv, 'case',   true),
    ('Club Soda',         c_nonalc,   v_sysv, 'case',   true),
    ('Orange Juice',      c_nonalc,   v_sysv, 'jug',    true),
    ('Cranberry Juice',   c_nonalc,   v_sysv, 'jug',    true),
    -- Beer and Wine
    ('Kingfisher Beer',   c_beer,     v_sysv, 'case',   true),
    ('Corona',            c_beer,     v_sysv, 'case',   true),
    ('Bud Light',         c_beer,     v_sysv, 'case',   true),
    ('House Red Wine',    c_beer,     v_abc,  'bottle', true),
    ('House White Wine',  c_beer,     v_abc,  'bottle', true),
    -- ABC Spirits
    ('Tito''s Vodka',     c_spirits,  v_abc,  'bottle', true),
    ('Bacardi Rum',       c_spirits,  v_abc,  'bottle', true),
    ('Jack Daniel''s Whiskey', c_spirits, v_abc, 'bottle', true),
    ('Bombay Sapphire Gin', c_spirits, v_abc, 'bottle', true),
    ('Triple Sec',        c_spirits,  v_abc,  'bottle', true),
    -- Misc (Bar)
    ('Bar Napkins',       c_misc_bar, v_sysv, 'pack',   true),
    ('Cocktail Straws',   c_misc_bar, v_sysv, 'pack',   true),
    ('Cocktail Picks',    c_misc_bar, v_sysv, 'pack',   true),
    ('Lime Juice',        c_misc_bar, v_sysv, 'bottle', true);
END $$;

-- ── 5. Seed IBG Order sample products ────────────────────────────────────────
DO $$
DECLARE
  v_ibg      INTEGER;
  c_food     INTEGER;
  c_paper    INTEGER;
  c_crock    INTEGER;
  c_misc_ibg INTEGER;
BEGIN
  SELECT id INTO v_ibg      FROM ibgsc.vendors     WHERE code = 'IBG-DIST'     LIMIT 1;
  SELECT id INTO c_food     FROM ibgsc.categories  WHERE name = 'IBG Food'       AND order_type = 'IBG' LIMIT 1;
  SELECT id INTO c_paper    FROM ibgsc.categories  WHERE name = 'Paper Products' AND order_type = 'IBG' LIMIT 1;
  SELECT id INTO c_crock    FROM ibgsc.categories  WHERE name = 'Crockery'       AND order_type = 'IBG' LIMIT 1;
  SELECT id INTO c_misc_ibg FROM ibgsc.categories  WHERE name = 'IBG Misc'       AND order_type = 'IBG' LIMIT 1;

  INSERT INTO ibgsc.products (name, category_id, vendor_id, unit, is_active) VALUES
    -- Food
    ('Jasmine Rice',    c_food,     v_ibg, '50lb bag', true),
    ('Soy Sauce',       c_food,     v_ibg, 'gallon',   true),
    ('Sesame Oil',      c_food,     v_ibg, 'bottle',   true),
    ('Oyster Sauce',    c_food,     v_ibg, 'gallon',   true),
    ('Chili Oil',       c_food,     v_ibg, 'bottle',   true),
    ('Hoisin Sauce',    c_food,     v_ibg, 'gallon',   true),
    ('Rice Noodles',    c_food,     v_ibg, 'lb',       true),
    -- Paper Products
    ('To-Go Boxes (Small)', c_paper, v_ibg, 'case',   true),
    ('To-Go Boxes (Large)', c_paper, v_ibg, 'case',   true),
    ('Paper Napkins',   c_paper,    v_ibg, 'case',     true),
    ('Chopstick Sleeves', c_paper,  v_ibg, 'pack',    true),
    ('Paper Bags',      c_paper,    v_ibg, 'case',     true),
    -- Crockery
    ('Small Plates',    c_crock,    v_ibg, 'pcs',      true),
    ('Large Plates',    c_crock,    v_ibg, 'pcs',      true),
    ('Sauce Dishes',    c_crock,    v_ibg, 'pcs',      true),
    ('Rice Bowls',      c_crock,    v_ibg, 'pcs',      true),
    ('Soup Bowls',      c_crock,    v_ibg, 'pcs',      true),
    -- Misc (IBG)
    ('Candles',         c_misc_ibg, v_ibg, 'box',      true),
    ('Table Numbers',   c_misc_ibg, v_ibg, 'pcs',      true),
    ('Rubber Bands',    c_misc_ibg, v_ibg, 'pack',     true);
END $$;

COMMENT ON COLUMN ibgsc.categories.order_type IS
  'Which order list this category belongs to: WEEKLY_FOOD | BAR | IBG';
