import { defaultDocumentSources } from '../../data/default-document-sources.js';
import { defaultKnowledgeDocuments } from '../../data/default-knowledge-documents.js';
import { defaultPromptDefinitions } from '../../data/default-prompt-definitions.js';
import { KnowledgeDocumentRepository } from '../../repositories/KnowledgeDocumentRepository.js';
import { PromptDefinitionRepository } from '../../repositories/PromptDefinitionRepository.js';
import { KnowledgePlatformService } from '../knowledge/KnowledgePlatformService.js';
import { PromptPlatformService } from '../prompt/PromptPlatformService.js';
import { DocumentManagementService } from '../dms/DocumentManagementService.js';

function getDisplayDate() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function buildDocumentContent(document) {
  return `
${document.title}

${document.description}

Category: ${document.category}
Tags: ${document.tags.join(', ')}
Author: ${document.author}
Type: ${document.fileType}
`.trim();
}

export class ContentCatalogService {
  constructor(pool) {
    this.documentRepository = new KnowledgeDocumentRepository(pool);
    this.promptRepository = new PromptDefinitionRepository(pool);
    this.knowledgePlatform = new KnowledgePlatformService(pool, {
      documentRepository: this.documentRepository,
      refreshCaches: () => this.refreshCaches(),
    });
    this.promptPlatform = new PromptPlatformService(pool, {
      promptRepository: this.promptRepository,
      refreshCaches: () => this.refreshCaches(),
    });
    this.documentManagement = new DocumentManagementService(pool, {
      documentRepository: this.documentRepository,
      knowledgePlatform: this.knowledgePlatform,
      refreshCaches: () => this.refreshCaches(),
    });
    this.documentsCache = [];
    this.promptsCache = [];
    this.sourcesCache = [];
  }

  async initialize() {
    await this.seedIfEmpty();
    await this.knowledgePlatform.seedCollectionsIfEmpty();
    await this.promptPlatform.seedLibrariesIfEmpty();
    await this.documentManagement.seedFoldersIfEmpty();
    await this.refreshCaches();
  }

  async seedIfEmpty() {
    const documentCount = await this.documentRepository.count();

    if (documentCount === 0) {
      const sourceByDocumentId = new Map(
        defaultDocumentSources.map((source) => [source.documentId, source])
      );

      for (const document of defaultKnowledgeDocuments) {
        const source = sourceByDocumentId.get(document.id);
        await this.documentRepository.create({
          ...document,
          content: source?.content?.trim() || buildDocumentContent(document),
          priority: source?.priority || (document.status === 'active' ? 2 : 1),
        });
      }
    }

    const promptCount = await this.promptRepository.count();

    if (promptCount === 0) {
      for (const prompt of defaultPromptDefinitions) {
        await this.promptRepository.create(prompt);
      }
    }
  }

  async refreshCaches() {
    this.documentsCache = await this.documentRepository.list();
    this.promptsCache = await this.promptRepository.list();
    this.sourcesCache = await this.documentRepository.listSources();
  }

  listDocuments() {
    return this.documentsCache;
  }

  listPrompts() {
    return this.promptsCache;
  }

  listDocumentSources() {
    return this.sourcesCache;
  }

  async createDocument(payload) {
    return this.knowledgePlatform.createDocument({
      ...payload,
      status: payload.status || 'active',
      content: buildDocumentContent({ ...payload, tags: payload.tags || [] }),
      priority: payload.status === 'active' || !payload.status ? 2 : 1,
      createdDate: getDisplayDate(),
      updatedDate: getDisplayDate(),
    });
  }

  async updateDocument(documentId, payload) {
    const existing = await this.documentRepository.getById(documentId);

    if (!existing) {
      return null;
    }

    return this.knowledgePlatform.updateDocument(documentId, {
      ...payload,
      content: buildDocumentContent({
        ...existing,
        ...payload,
        tags: payload.tags || existing.tags,
      }),
      priority: (payload.status || existing.status) === 'active' ? 2 : 1,
    });
  }

  async removeDocument(documentId) {
    return this.knowledgePlatform.removeDocument(documentId);
  }

  async createPrompt(payload) {
    return this.promptPlatform.createPrompt({
      ...payload,
      updatedDate: getDisplayDate(),
    });
  }

  async updatePrompt(promptId, payload) {
    return this.promptPlatform.updatePrompt(promptId, payload, '', {
      changeSummary: 'Prompt saved from Prompt Builder',
    });
  }

  async removePrompt(promptId) {
    return this.promptPlatform.removePrompt(promptId);
  }
}
