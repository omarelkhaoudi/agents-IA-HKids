import { Pool } from 'pg';

export function createDatabasePool({ connectionString, sslEnabled }) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for persistent PostgreSQL storage.');
  }

  return new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
}
