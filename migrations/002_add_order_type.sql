-- Migration: Add order_type to orders table
-- Run this in Supabase SQL editor (ibgsc schema)

ALTER TABLE ibgsc.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'WEEKLY_FOOD'
    CHECK (order_type IN ('WEEKLY_FOOD', 'BAR', 'IBG'));

-- Backfill existing orders as WEEKLY_FOOD (already the default, but explicit)
UPDATE ibgsc.orders SET order_type = 'WEEKLY_FOOD' WHERE order_type IS NULL;

COMMENT ON COLUMN ibgsc.orders.order_type IS
  'Sub-category of order: WEEKLY_FOOD | BAR | IBG';
