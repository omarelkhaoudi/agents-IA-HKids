import { defaultDocumentSources } from '../../data/default-document-sources.js';
import { defaultKnowledgeDocuments } from '../../data/default-knowledge-documents.js';
import { defaultPromptDefinitions } from '../../data/default-prompt-definitions.js';
import { KnowledgeDocumentRepository } from '../../repositories/KnowledgeDocumentRepository.js';
import { PromptDefinitionRepository } from '../../repositories/PromptDefinitionRepository.js';

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
    this.documentsCache = [];
    this.promptsCache = [];
    this.sourcesCache = [];
  }

  async initialize() {
    await this.seedIfEmpty();
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
    const timestamp = getDisplayDate();
    const document = await this.documentRepository.create({
      id: `doc-${Date.now()}`,
      ...payload,
      content: buildDocumentContent({ ...payload, tags: payload.tags || [] }),
      priority: payload.status === 'active' ? 2 : 1,
      createdDate: timestamp,
      updatedDate: timestamp,
    });

    await this.refreshCaches();
    return document;
  }

  async updateDocument(documentId, payload) {
    const existing = await this.documentRepository.getById(documentId);

    if (!existing) {
      return null;
    }

    const merged = {
      ...existing,
      ...payload,
      updatedDate: getDisplayDate(),
      content: buildDocumentContent({
        ...existing,
        ...payload,
        tags: payload.tags || existing.tags,
      }),
      priority: (payload.status || existing.status) === 'active' ? 2 : 1,
    };

    const updatedDocument = await this.documentRepository.update(documentId, merged);
    await this.refreshCaches();
    return updatedDocument;
  }

  async removeDocument(documentId) {
    const deleted = await this.documentRepository.remove(documentId);

    if (deleted) {
      await this.refreshCaches();
    }

    return deleted;
  }

  async createPrompt(payload) {
    const prompt = await this.promptRepository.create({
      id: `prompt-${Date.now()}`,
      ...payload,
      updatedDate: getDisplayDate(),
    });

    await this.refreshCaches();
    return prompt;
  }

  async updatePrompt(promptId, payload) {
    const existing = await this.promptRepository.getById(promptId);

    if (!existing) {
      return null;
    }

    const updatedPrompt = await this.promptRepository.update(promptId, {
      ...existing,
      ...payload,
      updatedDate: getDisplayDate(),
    });

    await this.refreshCaches();
    return updatedPrompt;
  }

  async removePrompt(promptId) {
    const deleted = await this.promptRepository.remove(promptId);

    if (deleted) {
      await this.refreshCaches();
    }

    return deleted;
  }
}
