-- Add permissions for user_restaurant_access
GRANT ALL ON ibgsc.user_restaurant_access TO anon,
authenticated,
service_role;

-- Re-apply policy since the table was renamed
DROP POLICY IF EXISTS "allow_all_user_restaurant_access" ON ibgsc.user_restaurant_access;

CREATE POLICY "allow_all_user_restaurant_access" ON ibgsc.user_restaurant_access FOR ALL USING (true)
WITH
    CHECK (true);