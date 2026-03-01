/**
 * Database migration runner for RestoHub.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:<password>@db.qnpnisokvcsiysiakayr.supabase.co:5432/postgres \
 *   node scripts/migrate.js
 *
 * Or set SUPABASE_DB_PASSWORD and the script will build the URL automatically.
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
const DB_HOST = 'db.qnpnisokvcsiysiakayr.supabase.co';

function buildConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    console.error('Error: set DATABASE_URL or SUPABASE_DB_PASSWORD');
    process.exit(1);
  }
  return {
    host: DB_HOST,
    port: 5432,
    user: 'postgres',
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  };
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
  const client = new Client(buildConnectionConfig());
  await client.connect();
  console.log('Connected to database');

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
