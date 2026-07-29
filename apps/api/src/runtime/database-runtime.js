import {
  createDatabasePool,
  ensureDatabaseExists,
  resolveDatabaseConnectionString,
  shouldUseInMemoryDatabase,
  waitForDatabaseConnection,
} from '../config/database.js';
import { env } from '../config/env.js';

const resolvedConnectionString = resolveDatabaseConnectionString({
  databaseUrl: env.databaseUrl,
  dbHost: env.dbHost,
  dbPort: env.dbPort,
  dbUser: env.dbUser,
  dbPassword: env.dbPassword,
  dbName: env.dbName,
});

const useInMemory = shouldUseInMemoryDatabase({
  nodeEnv: env.nodeEnv,
  databaseUrl: resolvedConnectionString,
});

export const databasePool = createDatabasePool({
  connectionString: useInMemory ? '' : resolvedConnectionString,
  sslEnabled: env.dbSsl,
  allowInMemory: useInMemory,
});

export async function initializeDatabaseRuntime() {
  if (useInMemory) {
    return {
      mode: 'in-memory',
      databaseUrlConfigured: Boolean(resolvedConnectionString),
    };
  }

  if (!resolvedConnectionString) {
    throw new Error(
      'DATABASE_URL (or DB_HOST/DB_USER/DB_NAME) is required when not using the in-memory database.'
    );
  }

  await ensureDatabaseExists(resolvedConnectionString, { sslEnabled: env.dbSsl });
  await waitForDatabaseConnection(databasePool, {
    retries: Number(process.env.DB_CONNECT_RETRIES || 10),
    delayMs: Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 500),
  });

  return {
    mode: 'postgresql',
    databaseUrlConfigured: true,
  };
}
