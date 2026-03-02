-- Migration: Fix RLS policies + table grants for inventory tables
-- Applied 2026-03-02 via Supabase Management API
--
-- Problem 1: products, vendors, categories only had SELECT (anon_read) policy,
--            blocking INSERT / UPDATE / DELETE from the frontend anon key.
--
-- Problem 2: order_lines and orders were missing DELETE grant for anon role,
--            causing "permission denied" errors when deleting orders.

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- Products
DROP POLICY IF EXISTS anon_read ON ibgsc.products;
CREATE POLICY "allow_all_products" ON ibgsc.products
  FOR ALL USING (true) WITH CHECK (true);

-- Vendors
DROP POLICY IF EXISTS anon_read ON ibgsc.vendors;
CREATE POLICY "allow_all_vendors" ON ibgsc.vendors
  FOR ALL USING (true) WITH CHECK (true);

-- Categories
DROP POLICY IF EXISTS anon_read ON ibgsc.categories;
CREATE POLICY "allow_all_categories" ON ibgsc.categories
  FOR ALL USING (true) WITH CHECK (true);

-- Users (inventory staff table)
DROP POLICY IF EXISTS anon_read ON ibgsc.users;
CREATE POLICY "allow_all_users" ON ibgsc.users
  FOR ALL USING (true) WITH CHECK (true);

-- ── Table Grants ──────────────────────────────────────────────────────────────
-- Without these grants, even a permissive RLS policy won't help.

GRANT ALL ON ibgsc.order_lines  TO anon, authenticated;
GRANT ALL ON ibgsc.orders       TO anon, authenticated;
GRANT ALL ON ibgsc.products     TO anon, authenticated;
GRANT ALL ON ibgsc.categories   TO anon, authenticated;
GRANT ALL ON ibgsc.vendors      TO anon, authenticated;
GRANT ALL ON ibgsc.users        TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ibgsc TO anon, authenticated;
