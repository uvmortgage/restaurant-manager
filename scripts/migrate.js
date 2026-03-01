/**
 * Database migration runner for RestoHub.
 *
 * Two connection modes (tried in order):
 *
 * 1. Supabase Management API (preferred — works over HTTPS, no direct TCP needed)
 *    Set SUPABASE_ACCESS_TOKEN to a Personal Access Token from:
 *    https://supabase.com/dashboard/account/tokens
 *
 * 2. Direct PostgreSQL (fallback — requires network access to DB host)
 *    Set DATABASE_URL  or  SUPABASE_DB_PASSWORD
 *
 * Tracks executed migrations in ibgsc._migrations so each file runs only once.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const PROJECT_REF = 'qnpnisokvcsiysiakayr';
const MGMT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// ---------------------------------------------------------------------------
// Management API path
// ---------------------------------------------------------------------------

async function apiQuery(sql, accessToken) {
  const res = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API ${res.status}: ${text}`);
  }
  return res.json();
}

async function runViaAPI(accessToken) {
  console.log('Connecting via Supabase Management API...');

  // Ensure tracking table
  await apiQuery(
    `CREATE TABLE IF NOT EXISTS ibgsc._migrations (
       id         SERIAL PRIMARY KEY,
       filename   TEXT NOT NULL UNIQUE,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    accessToken
  );

  // Applied migrations
  const rows = await apiQuery(
    'SELECT filename FROM ibgsc._migrations ORDER BY filename',
    accessToken
  );
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }

  console.log(`Found ${pending.length} pending migration(s):`);
  for (const file of pending) {
    console.log(`  Running ${file}...`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const safeFile = file.replace(/'/g, "''");
    // Run migration + record in one transaction
    await apiQuery(
      `BEGIN;\n${sql}\nINSERT INTO ibgsc._migrations (filename) VALUES ('${safeFile}');\nCOMMIT;`,
      accessToken
    );
    console.log(`  ✓ ${file}`);
  }

  console.log('\nAll migrations applied successfully.');
}

// ---------------------------------------------------------------------------
// Direct PostgreSQL path (fallback)
// ---------------------------------------------------------------------------

async function runViaPg(password) {
  const { default: pg } = await import('pg');
  const { Client } = pg;

  const POOLER_REGIONS = [
    'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1',
    'ap-southeast-1', 'ap-northeast-1',
  ];

  function buildConfigs() {
    if (process.env.DATABASE_URL) {
      return [{ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }];
    }
    const region = process.env.SUPABASE_DB_REGION;
    const regions = region ? [region] : POOLER_REGIONS;
    const configs = [];
    for (const r of regions) {
      const base = {
        host: `aws-0-${r}.pooler.supabase.com`,
        user: `postgres.${PROJECT_REF}`,
        password,
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      };
      configs.push({ ...base, port: 5432 });
      configs.push({ ...base, port: 6543 });
    }
    // Direct host as final attempt (IPv6 — only works if runner supports it)
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

  let client;
  for (const cfg of buildConfigs()) {
    const label = cfg.connectionString || `${cfg.user}@${cfg.host}:${cfg.port}`;
    const c = new Client(cfg);
    try {
      await c.connect();
      console.log(`Connected via ${label}`);
      client = c;
      break;
    } catch (err) {
      console.warn(`  ${label}: ${err.message}`);
      try { await c.end(); } catch {}
    }
  }

  if (!client) {
    throw new Error(
      'All connection attempts failed.\n' +
      'Tip: set SUPABASE_ACCESS_TOKEN (PAT from supabase.com/dashboard/account/tokens) ' +
      'to use the Management API instead of a direct connection.'
    );
  }

  async function dbQuery(sql, params) {
    return client.query(sql, params);
  }

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ibgsc._migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await dbQuery('SELECT filename FROM ibgsc._migrations ORDER BY filename');
  const applied = new Set(rows.map((r) => r.filename));

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
    console.log(`  Running ${file}...`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO ibgsc._migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log('\nAll migrations applied successfully.');
  await client.end();
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbUrl = process.env.DATABASE_URL;

  if (!accessToken && !password && !dbUrl) {
    console.error(
      'Error: set SUPABASE_ACCESS_TOKEN (recommended) or DATABASE_URL / SUPABASE_DB_PASSWORD'
    );
    process.exit(1);
  }

  if (accessToken) {
    await runViaAPI(accessToken);
  } else {
    await runViaPg(password);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
