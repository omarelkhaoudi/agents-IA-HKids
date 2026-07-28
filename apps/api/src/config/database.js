import { Pool } from 'pg';
import { newDb } from 'pg-mem';

function createInMemoryPool() {
  const db = newDb();
  const { Pool: InMemoryPool } = db.adapters.createPg();
  return new InMemoryPool();
}

export function createDatabasePool({ connectionString, sslEnabled, allowInMemory = false }) {
  if (!connectionString) {
    if (allowInMemory) {
      console.info('DATABASE_URL is not set. Falling back to in-memory PostgreSQL for development.');
      return createInMemoryPool();
    }

    throw new Error('DATABASE_URL is required for persistent PostgreSQL storage.');
  }

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
}
