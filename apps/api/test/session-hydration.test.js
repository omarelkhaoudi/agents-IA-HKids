import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { ContentCatalogService } from '../src/services/content/ContentCatalogService.js';
import { ConversationRepository } from '../src/repositories/ConversationRepository.js';
import { GeneratedDocumentRepository } from '../src/repositories/GeneratedDocumentRepository.js';
import { KnowledgeRepository } from '../src/repositories/KnowledgeRepository.js';
import { MessageRepository } from '../src/repositories/MessageRepository.js';
import { PromptRepository } from '../src/repositories/PromptRepository.js';
import { SessionRepository } from '../src/repositories/SessionRepository.js';

async function createSessionStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const catalog = new ContentCatalogService(pool);
  await catalog.initialize();

  const listDocuments = () => catalog.listDocuments();
  const listPrompts = () => catalog.listPrompts();

  return {
    pool,
    sessionRepository: new SessionRepository({
      conversationRepository: new ConversationRepository(pool),
      messageRepository: new MessageRepository(pool),
      generatedDocumentRepository: new GeneratedDocumentRepository(pool),
      knowledgeRepository: new KnowledgeRepository(pool, { listDocuments }),
      promptRepository: new PromptRepository(pool, { listPrompts }),
    }),
  };
}

test('listSessions hydrates multiple conversations with batched queries', async () => {
  const { sessionRepository } = await createSessionStack();

  for (let index = 0; index < 3; index += 1) {
    await sessionRepository.createSession({
      id: `session-batch-${index}`,
      title: `Batch session ${index}`,
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      agentCode: 'administrative-assistant',
      currentContext: { language: 'English' },
      selectedPromptId: 'prompt-001',
      selectedDocumentIds: ['doc-001'],
    });
  }

  const sessions = await sessionRepository.listSessions({ limit: 3 });
  assert.equal(sessions.length, 3);
  assert.equal(sessions[0].messages.length, 0);
  assert.equal(sessions[0].selectedPromptId, 'prompt-001');
});

test('integrity migration enforces agent_code foreign keys', async () => {
  const { pool } = await createSessionStack();

  await assert.rejects(
    () =>
      pool.query(
        `
          INSERT INTO conversations (id, title, provider, model, language, agent_code, current_context, metadata)
          VALUES ('invalid-agent-session', 'Invalid', 'anthropic', 'claude-3-5-sonnet-latest', 'English', 'unknown-agent', '{}'::jsonb, '{}'::jsonb)
        `
      ),
    /foreign key|violates foreign key constraint/i
  );
});
