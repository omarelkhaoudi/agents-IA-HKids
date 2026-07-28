import { createDatabasePool } from '../config/database.js';
import { env } from '../config/env.js';

export const databasePool = createDatabasePool({
  connectionString: env.databaseUrl,
  sslEnabled: env.dbSsl,
  allowInMemory: env.nodeEnv === 'development' && !env.databaseUrl,
});
