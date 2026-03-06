-- Consolidate app_users and users
-- 1. Rename existing tables
ALTER TABLE ibgsc.users RENAME TO legacy_inventory_users;

ALTER TABLE ibgsc.app_users RENAME TO users;

-- 2. Create the usr_restaurant_access table for multilevel access
CREATE TABLE IF NOT EXISTS ibgsc.usr_restaurant_access (
    user_id TEXT REFERENCES ibgsc.users (id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES ibgsc.restaurants (id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone ('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, restaurant_id)
);

-- 3. Enable RLS and policies for the new access table
ALTER TABLE ibgsc.usr_restaurant_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_usr_restaurant_access" ON ibgsc.usr_restaurant_access FOR ALL USING (true)
WITH
    CHECK (true);

-- 4. Re-map old user references if any (optional based on application code state)
-- Our codebase uses app_users as the main staff table so simply renaming to users resolves the duplication.
-- Users from legacy_inventory_users (like Chef Dilip, Prince) should be migrated manually if they use the app.