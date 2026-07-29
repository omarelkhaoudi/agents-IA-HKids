import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDatabaseConnectionString,
  shouldUseInMemoryDatabase,
} from '../src/config/database.js';

test('resolveDatabaseConnectionString builds URL from DB_* parts', () => {
  const url = resolveDatabaseConnectionString({
    databaseUrl: '',
    dbHost: 'localhost',
    dbPort: '5432',
    dbUser: 'postgres',
    dbPassword: 'secret',
    dbName: 'hkids_admin_ai',
  });

  assert.equal(url, 'postgresql://postgres:secret@localhost:5432/hkids_admin_ai');
});

test('shouldUseInMemoryDatabase isolates automated tests by default', () => {
  assert.equal(
    shouldUseInMemoryDatabase({
      nodeEnv: 'test',
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/hkids_admin_ai',
      forceRealDatabase: false,
      forceInMemory: false,
    }),
    true
  );

  assert.equal(
    shouldUseInMemoryDatabase({
      nodeEnv: 'test',
      databaseUrl: 'postgresql://postgres:postgres@localhost:5432/hkids_admin_ai',
      forceRealDatabase: true,
      forceInMemory: false,
    }),
    false
  );
});
