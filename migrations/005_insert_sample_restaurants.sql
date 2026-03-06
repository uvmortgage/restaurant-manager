-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 005: Insert Sample Restaurants
-- Run this in the Supabase SQL editor (schema: ibgsc)
--
-- Purpose: Create some additional sample restaurants to demonstrate the multi-restaurant capabilities.
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO
    ibgsc.restaurants (
        name,
        location,
        admin_email,
        is_active
    )
VALUES (
        'Inchin''s Bamboo Garden',
        'North Charlotte',
        'sri7576@gmail.com',
        true
    ),
    (
        'Inchin''s Bamboo Garden',
        'Raleigh',
        'sri7576@gmail.com',
        true
    ),
    (
        'Inchin''s Bamboo Garden',
        'Atlanta',
        'sri7576@gmail.com',
        true
    ),
    (
        'Inchin''s Bamboo Garden',
        'Miami (Temporarily Closed)',
        'sri7576@gmail.com',
        false
    )
ON CONFLICT DO NOTHING;

-- Verification query
-- SELECT id, name, location, admin_email, is_active FROM ibgsc.restaurants;