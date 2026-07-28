import test from 'node:test';
import assert from 'node:assert/strict';
import { ConversationService } from '../src/services/ConversationService.js';
import { KnowledgeContextBuilder } from '../src/services/KnowledgeContextBuilder.js';
import { PromptAssembler } from '../src/services/PromptAssembler.js';

const samplePrompt = {
  id: 'prompt-001',
  name: 'Administrative Assistant Core',
  description: 'Base orchestration prompt.',
  role: 'Administrative assistant',
  objective: 'Support operational drafting.',
  systemPrompt: 'Operate accurately.',
  instructions: ['Use the selected prompt.', 'Respect the current context.'],
  constraints: ['Do not invent facts.'],
  validationChecklist: ['Confirm document type.'],
  outputStyle: 'Structured and concise.',
};

const sampleDocument = {
  id: 'doc-001',
  title: 'Parent Enrollment Policy',
  category: 'Administration',
  description: 'Internal policy reference.',
  tags: ['policy', 'parents'],
  author: 'Sara El Idrissi',
  status: 'active',
  fileType: 'PDF',
  createdDate: '15 Jul 2026',
  updatedDate: '28 Jul 2026',
};

const sampleContext = {
  department: 'Administration',
  language: 'English',
  companyName: 'H-Kids',
  companyAddress: 'Casablanca',
  contactName: 'Sara El Idrissi',
};

test('KnowledgeContextBuilder includes selected documents and context', () => {
  const builder = new KnowledgeContextBuilder();

  const result = builder.build({
    selectedDocuments: [sampleDocument],
    currentContext: sampleContext,
  });

  assert.match(result, /Current Context:/);
  assert.match(result, /Parent Enrollment Policy/);
  assert.match(result, /H-Kids/);
});

test('PromptAssembler combines prompt sections and knowledge context', () => {
  const assembler = new PromptAssembler({
    knowledgeContextBuilder: new KnowledgeContextBuilder(),
  });

  const result = assembler.assemble({
    prompt: samplePrompt,
    selectedDocuments: [sampleDocument],
    currentContext: sampleContext,
    retrievedContext: {
      assembledContext: 'Retrieved context block.',
    },
  });

  assert.match(result, /System Prompt:/);
  assert.match(result, /Instructions:/);
  assert.match(result, /Selected Knowledge Documents:/);
  assert.match(result, /Automatically Retrieved Context:/);
});

test('ConversationService stores user and assistant messages', async () => {
  const storedSession = {
    id: 'session-001',
    title: 'Test conversation',
    selectedPromptId: samplePrompt.id,
    selectedDocumentIds: [sampleDocument.id],
    currentContext: sampleContext,
    model: 'claude-3-5-sonnet-latest',
    provider: 'anthropic',
    messages: [],
    generatedDocuments: [],
  };
  const aiGateway = {
    async generate() {
      return { text: 'Generated assistant response.', usage: { totalTokens: 42 } };
    },
  };
  const sessionRepository = {
    async createSession() {
      return storedSession;
    },
    async getSessionById() {
      return storedSession;
    },
    async updateSessionConfig(_sessionId, payload) {
      Object.assign(storedSession, payload);
      return storedSession;
    },
  };
  const messageRepository = {
    async create(message) {
      storedSession.messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: '10:00',
      });
    },
  };

  const service = new ConversationService({
    aiGateway,
    promptAssembler: new PromptAssembler({
      knowledgeContextBuilder: new KnowledgeContextBuilder(),
    }),
    retrievalService: {
      retrieveRelevantContext() {
        return {
          assembledContext: 'Retrieved context block.',
          retrievedChunks: [],
          documentNames: ['Parent Enrollment Policy'],
          estimatedTokens: 24,
        };
      },
    },
    feedbackService: {
      async getApprovedGuidance() {
        return '- Always use formal tone.';
      },
    },
    sessionRepository,
    messageRepository,
    promptRepository: {
      getPromptById() {
        return samplePrompt;
      },
    },
    knowledgeRepository: {
      getDocumentsByIds() {
        return [sampleDocument];
      },
    },
  });

  const session = await service.createSession({
    title: 'Test conversation',
    selectedPromptId: samplePrompt.id,
    selectedDocumentIds: [sampleDocument.id],
    currentContext: sampleContext,
    model: 'claude-3-5-sonnet-latest',
    provider: 'anthropic',
  });

  const result = await service.sendMessage({
    sessionId: session.id,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    selectedPromptId: samplePrompt.id,
    selectedDocumentIds: [sampleDocument.id],
    currentContext: sampleContext,
    userMessage: 'Create a draft quotation.',
  });

  assert.equal(result.session.messages.length, 2);
  assert.equal(result.session.messages[0].role, 'user');
  assert.equal(result.session.messages[1].role, 'assistant');
  assert.match(result.requestPreview.assembledPrompt, /Administrative Assistant Core/);
  assert.match(result.requestPreview.assembledPrompt, /Retrieved context block/);
  assert.match(result.requestPreview.assembledPrompt, /Always use formal tone/);
});
