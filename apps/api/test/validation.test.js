import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversationBodySchema,
  feedbackBodySchema,
  loginBodySchema,
  retrievalSearchBodySchema,
} from '../src/validation/schemas.js';

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
