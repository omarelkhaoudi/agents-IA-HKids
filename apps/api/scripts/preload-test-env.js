/**
 * Preloaded before API tests via:
 *   node --import ./scripts/preload-test-env.js --test
 *
 * Isolates suites from developer .env so validation is reproducible
 * without a live PostgreSQL instance and with stable admin credentials.
 *
 * Set FORCE_REAL_DATABASE=true to exercise a real Postgres from .env instead.
 */
process.env.NODE_ENV = 'test';
process.env.DEFAULT_ADMIN_EMAIL = 'admin@hkids.app';
process.env.DEFAULT_ADMIN_PASSWORD = 'Admin123!';
process.env.DEFAULT_ADMIN_NAME = 'H-Kids Administrator';

if (process.env.FORCE_REAL_DATABASE !== 'true') {
  process.env.HKIDS_USE_IN_MEMORY_DB = 'true';
}
