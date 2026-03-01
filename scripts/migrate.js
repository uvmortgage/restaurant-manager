/**
 * Database migration runner for RestoHub.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres \
 *   node scripts/migrate.js
 *
 * Or set SUPABASE_DB_PASSWORD (and optionally SUPABASE_DB_REGION, default: us-east-1).
 * The script connects via the Supabase session pooler (IPv4-compatible).
 *
 * Tracks executed migrations in ibgsc._migrations so each file runs only once.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const PROJECT_REF = 'qnpnisokvcsiysiakayr';

// Supabase session pooler regions to try in order (all are IPv4-accessible).
// Direct DB host (db.<ref>.supabase.co) is IPv6-only on newer projects.
const POOLER_REGIONS = [
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'ap-southeast-1',
];

function buildConnectionConfigs(password) {
  if (process.env.DATABASE_URL) {
    return [{ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }];
  }

  const region = process.env.SUPABASE_DB_REGION;
  const regions = region ? [region] : POOLER_REGIONS;

  const configs = regions.map((r) => ({
    host: `aws-0-${r}.pooler.supabase.com`,
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  }));

  // Also append the direct host as last resort (works if runner has IPv6).
  configs.push({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  return configs;
}

async function connectWithFallback(password) {
  const configs = buildConnectionConfigs(password);
  for (const config of configs) {
    const label = config.connectionString || `${config.user}@${config.host}`;
    const client = new Client(config);
    try {
      await client.connect();
      console.log(`Connected via ${config.connectionString ? 'DATABASE_URL' : config.host}`);
      return client;
    } catch (err) {
      console.warn(`  ${label}: ${err.message}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error('All connection attempts failed. Check SUPABASE_DB_PASSWORD and network access.');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ibgsc._migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename FROM ibgsc._migrations ORDER BY filename'
  );
  return new Set(rows.map((r) => r.filename));
}

async function runMigration(client, filename, sql) {
  console.log(`  Running ${filename}...`);
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      'INSERT INTO ibgsc._migrations (filename) VALUES ($1)',
      [filename]
    );
    await client.query('COMMIT');
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const password = process.env.DATABASE_URL ? null : process.env.SUPABASE_DB_PASSWORD;
  if (!process.env.DATABASE_URL && !password) {
    console.error('Error: set DATABASE_URL or SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  const client = await connectWithFallback(password);

  await ensureMigrationsTable(client);

  const applied = await appliedMigrations(client);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    await client.end();
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):`);
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await runMigration(client, file, sql);
  }

  console.log('\nAll migrations applied successfully.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
