ALTER TABLE ibgsc.restaurants
ADD COLUMN enable_inventory BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ibgsc.restaurants
ADD COLUMN enable_cash BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ibgsc.restaurants
ADD COLUMN enable_users BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ibgsc.restaurants
ADD COLUMN enable_catering BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ibgsc.restaurants
ADD COLUMN enable_receipts BOOLEAN NOT NULL DEFAULT true;