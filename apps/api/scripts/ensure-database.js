#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureDatabaseExists,
  resolveDatabaseConnectionString,
  createDatabasePool,
  waitForDatabaseConnection,
} from '../src/config/database.js';
import { runMigrations } from '../src/database/runMigrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');

dotenv.config({
  path: [path.join(apiRoot, '.env.local'), path.join(apiRoot, '.env')],
});

const connectionString = resolveDatabaseConnectionString({
  databaseUrl: process.env.DATABASE_URL || '',
  dbHost: process.env.DB_HOST || '',
  dbPort: process.env.DB_PORT || '5432',
  dbUser: process.env.DB_USER || '',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || '',
});

if (!connectionString) {
  console.error(
    'No DATABASE_URL or DB_HOST/DB_USER/DB_NAME configured. Copy apps/api/.env.example to apps/api/.env first.'
  );
  process.exit(1);
}

const sslEnabled = process.env.DB_SSL === 'true';

try {
  const ensured = await ensureDatabaseExists(connectionString, { sslEnabled });
  const pool = createDatabasePool({
    connectionString,
    sslEnabled,
    allowInMemory: false,
  });

  await waitForDatabaseConnection(pool, { retries: 12, delayMs: 500 });
  await runMigrations(pool);
  await pool.end();

  console.info(
    JSON.stringify(
      {
        ok: true,
        database: ensured.databaseName,
        created: ensured.created,
        migrations: 'applied',
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
