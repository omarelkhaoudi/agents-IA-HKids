import { Pool } from 'pg';
import { newDb } from 'pg-mem';

function createInMemoryPool() {
  const db = newDb();
  const { Pool: InMemoryPool } = db.adapters.createPg();
  return new InMemoryPool();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldUseInMemoryDatabase({
  nodeEnv = process.env.NODE_ENV || 'development',
  databaseUrl = '',
  forceRealDatabase = process.env.FORCE_REAL_DATABASE === 'true',
  forceInMemory = process.env.HKIDS_USE_IN_MEMORY_DB === 'true',
} = {}) {
  if (forceInMemory) {
    return true;
  }

  if (forceRealDatabase) {
    return false;
  }

  if (nodeEnv === 'test') {
    return true;
  }

  return (nodeEnv === 'development' || nodeEnv === 'test') && !databaseUrl;
}

export function resolveDatabaseConnectionString({
  databaseUrl = process.env.DATABASE_URL || '',
  dbHost = process.env.DB_HOST || '',
  dbPort = process.env.DB_PORT || '5432',
  dbUser = process.env.DB_USER || '',
  dbPassword = process.env.DB_PASSWORD || '',
  dbName = process.env.DB_NAME || '',
} = {}) {
  if (databaseUrl) {
    return databaseUrl;
  }

  if (!dbHost || !dbUser || !dbName) {
    return '';
  }

  const auth =
    dbPassword !== undefined && dbPassword !== null
      ? `${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}`
      : encodeURIComponent(dbUser);

  return `postgresql://${auth}@${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`;
}

function parseDatabaseName(connectionString) {
  try {
    const url = new URL(connectionString);
    return decodeURIComponent(url.pathname.replace(/^\//, '') || '');
  } catch {
    return '';
  }
}

function toAdminConnectionString(connectionString) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

function assertSafeDatabaseName(databaseName) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
    throw new Error(
      `Refusing to create database with unsafe name "${databaseName}". Use letters, numbers, and underscores only.`
    );
  }
}

export async function ensureDatabaseExists(connectionString, { sslEnabled = false } = {}) {
  if (!connectionString) {
    return { created: false, skipped: true };
  }

  const databaseName = parseDatabaseName(connectionString);
  if (!databaseName) {
    throw new Error('DATABASE_URL is missing a database name.');
  }

  assertSafeDatabaseName(databaseName);

  const adminPool = new Pool({
    connectionString: toAdminConnectionString(connectionString),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });

  try {
    const existing = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      databaseName,
    ]);

    if (existing.rowCount > 0) {
      return { created: false, databaseName };
    }

    await adminPool.query(`CREATE DATABASE ${databaseName}`);
    console.info(`Created missing PostgreSQL database: ${databaseName}`);
    return { created: true, databaseName };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        `Unable to ensure PostgreSQL database "${databaseName}".`,
        message,
        'Start Postgres (or `docker compose up db`), then run `npm run db:ensure -w @hkids/api`.',
        'For local tests without Postgres, leave FORCE_REAL_DATABASE unset (in-memory DB is used).',
      ].join(' ')
    );
  } finally {
    await adminPool.end().catch(() => undefined);
  }
}

export async function waitForDatabaseConnection(
  pool,
  { retries = 10, delayMs = 500, label = 'PostgreSQL' } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query('SELECT 1 AS ok');
      return { ok: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.info(
          `${label} not ready (attempt ${attempt}/${retries}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        await sleep(delayMs * attempt);
      }
    }
  }

  throw new Error(
    `${label} connection failed after ${retries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export function createDatabasePool({ connectionString, sslEnabled, allowInMemory = false }) {
  if (!connectionString) {
    if (allowInMemory) {
      console.info('Using in-memory PostgreSQL (pg-mem).');
      return createInMemoryPool();
    }

    throw new Error('DATABASE_URL is required for persistent PostgreSQL storage.');
  }

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 10000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    max: Number(process.env.DB_POOL_MAX || 10),
  });
}
