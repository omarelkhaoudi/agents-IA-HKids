import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { ROLES } from '../src/constants/roles.js';
import { RefreshTokenRepository } from '../src/repositories/RefreshTokenRepository.js';
import { UserRepository } from '../src/repositories/UserRepository.js';
import { AuthService } from '../src/services/auth/AuthService.js';
import { TokenService } from '../src/services/auth/TokenService.js';
import { createApp } from '../src/app.js';

async function createAuthStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const userRepository = new UserRepository(pool);
  const refreshTokenRepository = new RefreshTokenRepository(pool);
  const authService = new AuthService({
    userRepository,
    refreshTokenRepository,
    tokenService: new TokenService(),
  });

  return { pool, authService, userRepository, refreshTokenRepository };
}

test('AuthService creates default super admin and authenticates users', async () => {
  const { authService } = await createAuthStack();

  const created = await authService.ensureDefaultAdmin({
    email: 'admin@hkids.app',
    password: 'Admin123!',
    name: 'H-Kids Administrator',
  });

  assert.ok(created);
  assert.equal(created.role, ROLES.SUPER_ADMIN);

  const loginResult = await authService.login({
    email: 'admin@hkids.app',
    password: 'Admin123!',
  });

  assert.ok(loginResult.accessToken);
  assert.ok(loginResult.refreshToken);
  assert.equal(loginResult.user.email, 'admin@hkids.app');

  const refreshed = await authService.refresh(loginResult.refreshToken);
  assert.ok(refreshed.accessToken);
  assert.notEqual(refreshed.refreshToken, loginResult.refreshToken);

  await authService.logout(refreshed.refreshToken);

  await assert.rejects(
    () => authService.refresh(refreshed.refreshToken),
    /Invalid refresh token/
  );
});

test('AuthService rejects invalid credentials', async () => {
  const { authService } = await createAuthStack();

  await authService.ensureDefaultAdmin({
    email: 'admin@hkids.app',
    password: 'Admin123!',
    name: 'H-Kids Administrator',
  });

  await assert.rejects(
    () => authService.login({ email: 'admin@hkids.app', password: 'wrong-password' }),
    /Invalid email or password/
  );
});

test('protected routes require authentication', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/documents`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('migrations create auth tables', async () => {
  const { pool } = await createAuthStack();
  await pool.query('SELECT * FROM users');
  await pool.query('SELECT * FROM refresh_tokens');
  assert.ok(true);
});
