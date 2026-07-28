import { runMigrations } from '../../database/runMigrations.js';
import { ConversationRepository } from '../../repositories/ConversationRepository.js';
import { GeneratedDocumentRepository } from '../../repositories/GeneratedDocumentRepository.js';
import { KnowledgeRepository } from '../../repositories/KnowledgeRepository.js';
import { MessageRepository } from '../../repositories/MessageRepository.js';
import { PromptRepository } from '../../repositories/PromptRepository.js';
import { SessionRepository } from '../../repositories/SessionRepository.js';

export class PersistenceService {
  constructor(pool, { listDocuments, listPrompts }) {
    this.pool = pool;
    this.conversationRepository = new ConversationRepository(pool);
    this.messageRepository = new MessageRepository(pool);
    this.generatedDocumentRepository = new GeneratedDocumentRepository(pool);
    this.knowledgeRepository = new KnowledgeRepository(pool, { listDocuments });
    this.promptRepository = new PromptRepository(pool, { listPrompts });
    this.sessionRepository = new SessionRepository({
      conversationRepository: this.conversationRepository,
      messageRepository: this.messageRepository,
      generatedDocumentRepository: this.generatedDocumentRepository,
      knowledgeRepository: this.knowledgeRepository,
      promptRepository: this.promptRepository,
    });
  }

  async initialize() {
    await runMigrations(this.pool);
  }
}
