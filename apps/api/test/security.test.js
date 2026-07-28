import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('security headers are applied by helmet', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('x-content-type-options'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('unknown routes return structured 404 responses', async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/missing-route`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.match(body.message, /Route not found/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
