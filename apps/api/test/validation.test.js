import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { validate } from '../src/middleware/validate.js';
import {
  createConversationBodySchema,
  feedbackBodySchema,
  idParamsSchema,
  loginBodySchema,
  observabilityUsageQuerySchema,
  retrievalSearchBodySchema,
} from '../src/validation/schemas.js';

async function withProbeServer(handler) {
  const app = express();

  app.get(
    '/probe/:id',
    validate({ params: idParamsSchema, query: observabilityUsageQuerySchema }),
    (request, response) => {
      response.json({ params: request.params, query: request.query });
    }
  );

  const server = app.listen(0);

  try {
    await handler(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test('loginBodySchema validates credentials', () => {
  const valid = loginBodySchema.safeParse({
    email: 'admin@hkids.app',
    password: 'Admin123!',
  });

  assert.equal(valid.success, true);

  const invalid = loginBodySchema.safeParse({
    email: 'not-an-email',
    password: 'short',
  });

  assert.equal(invalid.success, false);
});

test('createConversationBodySchema validates conversation payload', () => {
  const valid = createConversationBodySchema.safeParse({
    title: 'New quotation',
    agentCode: 'administrative-assistant',
    selectedPromptId: 'prompt-001',
    selectedDocumentIds: ['doc-001'],
    currentContext: { language: 'English' },
    model: 'claude-3-5-sonnet-latest',
    provider: 'anthropic',
  });

  assert.equal(valid.success, true);
});

test('feedbackBodySchema validates feedback payload', () => {
  const valid = feedbackBodySchema.safeParse({
    conversationId: 'session-001',
    documentId: 'doc-001',
    agentCode: 'administrative-assistant',
    originalText: 'Original',
    correctedText: 'Corrected',
    feedbackType: 'Minor Edit',
    rating: 4,
  });

  assert.equal(valid.success, true);
});

test('retrievalSearchBodySchema validates search question', () => {
  const valid = retrievalSearchBodySchema.safeParse({ question: 'What is the enrollment policy?' });
  assert.equal(valid.success, true);

  const invalid = retrievalSearchBodySchema.safeParse({ question: '' });
  assert.equal(invalid.success, false);
});

test('validate middleware exposes parsed query and params on the request', async () => {
  await withProbeServer(async (baseUrl) => {
    const parsed = await fetch(`${baseUrl}/probe/alpha?granularity=weekly&days=28`);
    assert.equal(parsed.status, 200);
    assert.deepEqual(await parsed.json(), {
      params: { id: 'alpha' },
      query: { granularity: 'weekly', days: 28 },
    });

    const defaulted = await fetch(`${baseUrl}/probe/alpha`);
    assert.equal(defaulted.status, 200);
    assert.deepEqual((await defaulted.json()).query, { granularity: 'daily' });

    const rejected = await fetch(`${baseUrl}/probe/alpha?granularity=yearly`);
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).errors[0].path, 'granularity');
  });
});
