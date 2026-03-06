-- Migration: Add default_restaurant_id to users
ALTER TABLE ibgsc.users
ADD COLUMN default_restaurant_id UUID REFERENCES ibgsc.restaurants(id);
