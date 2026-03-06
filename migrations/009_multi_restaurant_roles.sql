-- Migration: Move roles and restaurant assignment out of users into usr_restaurant_access

-- 1. If not already populated, insert the mappings from the current columns into the access table
INSERT INTO
    ibgsc.usr_restaurant_access (user_id, restaurant_id, role)
SELECT id, restaurant_id, role
FROM ibgsc.users
WHERE
    restaurant_id IS NOT NULL
    AND id IS NOT NULL
ON CONFLICT (user_id, restaurant_id) DO
UPDATE
SET role = EXCLUDED.role;

-- 2. Drop the original columns from the users table
ALTER TABLE ibgsc.users DROP COLUMN IF EXISTS role;

ALTER TABLE ibgsc.users DROP COLUMN IF EXISTS restaurant_id;