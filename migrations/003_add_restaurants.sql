-- Migration 003: Add multi-restaurant support
-- Run this in the Supabase SQL editor

-- ── Restaurants table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ibgsc.restaurants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  location     TEXT,
  admin_email  TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Access requests table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ibgsc.access_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email      TEXT NOT NULL,
  user_name       TEXT,
  restaurant_id   UUID NOT NULL REFERENCES ibgsc.restaurants(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Add restaurant_id column to app_users ────────────────────────────────────
ALTER TABLE ibgsc.app_users
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES ibgsc.restaurants(id);

-- ── Seed: Insert default restaurant (Inchin's Bamboo Garden South Charlotte) ─
INSERT INTO ibgsc.restaurants (name, location, admin_email)
VALUES ('Inchin''s Bamboo Garden', 'South Charlotte', 'sri7576@gmail.com')
ON CONFLICT DO NOTHING;

-- ── Assign all existing active users to the default restaurant ───────────────
UPDATE ibgsc.app_users
SET restaurant_id = (
  SELECT id FROM ibgsc.restaurants
  WHERE name = 'Inchin''s Bamboo Garden'
  LIMIT 1
)
WHERE restaurant_id IS NULL
  AND status = 'Active';
