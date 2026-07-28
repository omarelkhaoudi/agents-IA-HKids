import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { initializeAuthRuntime } from '../src/runtime/auth-runtime.js';
import { initializeContentRuntime } from '../src/runtime/content-runtime.js';

let runtimeReadyPromise;

async function ensureRuntimeReady() {
  if (!runtimeReadyPromise) {
    runtimeReadyPromise = (async () => {
      await initializeAuthRuntime();
      await initializeContentRuntime();
    })();
  }

  await runtimeReadyPromise;
}

async function createReadyApp() {
  await ensureRuntimeReady();

  const app = createApp();
  const server = app.listen(0);

  return {
    server,
    port: server.address().port,
  };
}

test('authenticated requests can access protected assistant bootstrap', async () => {
  const { server, port } = await createReadyApp();

  try {
    const loginResponse = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hkids.app',
        password: 'Admin123!',
      }),
    });

    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();

    const response = await fetch(`http://127.0.0.1:${port}/api/assistant/bootstrap`, {
      headers: {
        Authorization: `Bearer ${login.accessToken}`,
      },
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body.agents));
    assert.ok(body.defaultAgentCode);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('read_only role cannot create conversations', async () => {
  const { server, port } = await createReadyApp();

  try {
    const { authService } = await import('../src/runtime/auth-runtime.js');
    const readOnlyUser = await authService.userRepository.create({
      id: 'user-read-only',
      email: 'readonly@hkids.app',
      passwordHash: await authService.hashPassword('ReadOnly123!'),
      name: 'Read Only User',
      role: 'read_only',
      status: 'active',
    });

    const tokens = await authService.issueTokens(readOnlyUser);
    const response = await fetch(`http://127.0.0.1:${port}/api/conversations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Blocked conversation',
        agentCode: 'administrative-assistant',
        selectedPromptId: 'prompt-001',
        selectedDocumentIds: [],
        currentContext: { language: 'English' },
        model: 'claude-3-5-sonnet-latest',
        provider: 'anthropic',
      }),
    });

    assert.equal(response.status, 403);

    const { databasePool } = await import('../src/runtime/database-runtime.js');
    await databasePool.query('DELETE FROM users WHERE id = $1', [readOnlyUser.id]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
