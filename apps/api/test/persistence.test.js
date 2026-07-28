import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { listDocuments } from '../src/data/mock-documents.js';
import { listPrompts } from '../src/data/mock-prompts.js';
import { ConversationRepository } from '../src/repositories/ConversationRepository.js';
import { GeneratedDocumentRepository } from '../src/repositories/GeneratedDocumentRepository.js';
import { KnowledgeRepository } from '../src/repositories/KnowledgeRepository.js';
import { MessageRepository } from '../src/repositories/MessageRepository.js';
import { PromptRepository } from '../src/repositories/PromptRepository.js';
import { SessionRepository } from '../src/repositories/SessionRepository.js';
import { ConversationService } from '../src/services/ConversationService.js';
import { KnowledgeContextBuilder } from '../src/services/KnowledgeContextBuilder.js';
import { PromptAssembler } from '../src/services/PromptAssembler.js';

async function createTestPool() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  return pool;
}

test('migrations create persistence tables', async () => {
  const pool = await createTestPool();
  await pool.query('SELECT * FROM conversations');
  await pool.query('SELECT * FROM messages');
  await pool.query('SELECT * FROM generated_documents');
  await pool.query('SELECT * FROM conversation_knowledge');
  await pool.query('SELECT * FROM conversation_prompts');
  await pool.query('SELECT * FROM feedback');
  await pool.query('SELECT * FROM feedback_patterns');
  await pool.query('SELECT * FROM prompt_improvements');
  await pool.query('SELECT * FROM document_corrections');
  await pool.query('SELECT * FROM workflow_instances');
  await pool.query('SELECT * FROM workflow_history');
  await pool.query('SELECT * FROM workflow_rules');
  await pool.query('SELECT * FROM workflow_comments');
  await pool.query('SELECT * FROM workflow_assignments');
  await pool.query('SELECT * FROM ai_usage');
  assert.ok(true);
});

test('repositories persist and hydrate a conversation session', async () => {
  const pool = await createTestPool();
  const conversationRepository = new ConversationRepository(pool);
  const messageRepository = new MessageRepository(pool);
  const generatedDocumentRepository = new GeneratedDocumentRepository(pool);
  const knowledgeRepository = new KnowledgeRepository(pool, { listDocuments });
  const promptRepository = new PromptRepository(pool, { listPrompts });
  const sessionRepository = new SessionRepository({
    conversationRepository,
    messageRepository,
    generatedDocumentRepository,
    knowledgeRepository,
    promptRepository,
  });

  const session = await sessionRepository.createSession({
    id: 'session-001',
    title: 'Persistent quotation',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    currentContext: { language: 'English' },
    selectedPromptId: 'prompt-001',
    selectedDocumentIds: ['doc-001', 'doc-003'],
  });

  await messageRepository.create({
    id: 'message-001',
    conversationId: session.id,
    role: 'user',
    content: 'Create a quotation.',
    createdAt: new Date().toISOString(),
  });

  await generatedDocumentRepository.create({
    id: 'generated-001',
    conversationId: session.id,
    documentType: 'quotation',
    reference: 'QT-001',
    structuredDocument: { reference: 'QT-001', title: 'Quotation' },
    resolvedVariables: { client_name: 'Greenfield Nursery' },
    renderedPreview: '<html><body>Quotation</body></html>',
    validationWarnings: [],
    availableExportFormats: ['pdf', 'docx', 'html'],
    approved: false,
    status: 'draft',
    version: 1,
    createdBy: 'system',
    input: { customerProfile: { clientName: 'Greenfield Nursery' } },
    metadata: {},
  });

  const hydrated = await sessionRepository.getSessionById(session.id);
  const searchResults = await generatedDocumentRepository.search('Greenfield');

  assert.equal(hydrated.selectedPromptId, 'prompt-001');
  assert.deepEqual(hydrated.selectedDocumentIds, ['doc-001', 'doc-003']);
  assert.equal(hydrated.messages.length, 1);
  assert.equal(hydrated.generatedDocuments.length, 1);
  assert.equal(searchResults.length, 1);
});

test('conversation service integrates with repositories', async () => {
  const pool = await createTestPool();
  const conversationRepository = new ConversationRepository(pool);
  const messageRepository = new MessageRepository(pool);
  const generatedDocumentRepository = new GeneratedDocumentRepository(pool);
  const knowledgeRepository = new KnowledgeRepository(pool, { listDocuments });
  const promptRepository = new PromptRepository(pool, { listPrompts });
  const sessionRepository = new SessionRepository({
    conversationRepository,
    messageRepository,
    generatedDocumentRepository,
    knowledgeRepository,
    promptRepository,
  });

  const service = new ConversationService({
    aiGateway: {
      async generate() {
        return { text: 'Persistent assistant response.' };
      },
    },
    promptAssembler: new PromptAssembler({
      knowledgeContextBuilder: new KnowledgeContextBuilder(),
    }),
    retrievalService: {
      retrieveRelevantContext() {
        return {
          assembledContext: 'Persistent retrieved context.',
          retrievedChunks: [],
          documentNames: [],
          retrievedDocuments: [],
          retrievalStrategy: 'hybrid-semantic-keyword',
          estimatedTokens: 10,
        };
      },
    },
    sessionRepository,
    messageRepository,
    promptRepository,
    knowledgeRepository,
  });

  const session = await service.createSession({
    title: 'Persistent session',
    selectedPromptId: 'prompt-001',
    selectedDocumentIds: ['doc-001'],
    currentContext: {
      department: 'Administration',
      language: 'English',
      companyName: 'H-Kids',
      companyAddress: 'Casablanca',
      contactName: 'Sara El Idrissi',
    },
    model: 'claude-3-5-sonnet-latest',
    provider: 'anthropic',
  });

  const result = await service.sendMessage({
    sessionId: session.id,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    selectedPromptId: 'prompt-001',
    selectedDocumentIds: ['doc-001'],
    currentContext: session.currentContext,
    userMessage: 'Create a persistent quotation.',
  });

  assert.equal(result.session.messages.length, 2);
  assert.equal(result.session.messages[1].content, 'Persistent assistant response.');
});
