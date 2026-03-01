-- Run this in your Supabase SQL editor (schema: ibgsc)
-- This creates the 4 core tables used by RestoHub

CREATE TABLE IF NOT EXISTS ibgsc.users (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  role   TEXT NOT NULL,
  pin    TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  photo  TEXT
);

CREATE TABLE IF NOT EXISTS ibgsc.transactions (
  id                TEXT PRIMARY KEY,
  timestamp         TEXT NOT NULL,
  trans_type        TEXT NOT NULL,
  category          TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  logged_by         TEXT NOT NULL,
  payee_name        TEXT,
  reference_details TEXT,
  fund_source       TEXT NOT NULL,
  signature         TEXT,
  receipt_photo     TEXT
);

CREATE TABLE IF NOT EXISTS ibgsc.receipts (
  id          TEXT PRIMARY KEY,
  timestamp   TEXT NOT NULL,
  category    TEXT NOT NULL,
  vendor_name TEXT,
  amount      NUMERIC NOT NULL,
  photo       TEXT NOT NULL,
  logged_by   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Synced'
);

CREATE TABLE IF NOT EXISTS ibgsc.catering_events (
  id                   TEXT PRIMARY KEY,
  timestamp            TEXT NOT NULL,
  event_date           TEXT NOT NULL,
  ordering_person_name TEXT NOT NULL,
  phone_number         TEXT,
  photo                TEXT,
  status               TEXT NOT NULL DEFAULT 'Booked',
  payment_method       TEXT,
  amount               NUMERIC,
  payer_name           TEXT,
  payment_timestamp    TEXT,
  logged_by            TEXT NOT NULL,
  payment_logged_by    TEXT
);

-- Enable Row Level Security (open read/write for anon key; tighten as needed)
ALTER TABLE ibgsc.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ibgsc.transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ibgsc.receipts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ibgsc.catering_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_users"           ON ibgsc.users           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_transactions"    ON ibgsc.transactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_receipts"        ON ibgsc.receipts        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_catering_events" ON ibgsc.catering_events FOR ALL USING (true) WITH CHECK (true);
