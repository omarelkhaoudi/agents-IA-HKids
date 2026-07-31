import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';

function normalizeQuestion(question) {
  return String(question || '').trim().replace(/\s+/g, ' ');
}

function dedupeByChunkId(items) {
  const seen = new Set();

  return items.filter((item) => {
    if (seen.has(item.chunk.id)) {
      return false;
    }

    seen.add(item.chunk.id);
    return true;
  });
}

function cosineSimilarity(left = [], right = []) {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index]) || 0;
    const rightValue = Number(right[index]) || 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  return dotProduct / ((Math.sqrt(leftMagnitude) || 1) * (Math.sqrt(rightMagnitude) || 1));
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ');
}

function tokenize(text) {
  return normalizeText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function countMatches(content, keywords) {
  const haystack = normalizeText(content);
  return keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
}

function parseTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function freshnessScore(updatedAt) {
  const timestamp = parseTimestamp(updatedAt);
  if (!timestamp) return 0.1;

  const days = Math.max(0, (Date.now() - timestamp) / 86400000);
  if (days <= 7) return 1;
  if (days <= 30) return 0.8;
  if (days <= 90) return 0.55;
  if (days <= 180) return 0.3;
  return 0.1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function questionHash(question) {
  return createHash('sha256').update(String(question || '')).digest('hex');
}

function rounded(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function normalizeIdSet(value) {
  const ids = Array.isArray(value) ? value : value ? [value] : [];
  return new Set(ids.filter(Boolean).map(String));
}

function buildCacheKey(question, options = {}) {
  return JSON.stringify({
    question,
    topK: options.topK,
    agentCode: options.agentCode,
    promptId: options.promptId,
    documentIds: toArray(options.documentIds).sort(),
    collectionIds: toArray(options.collectionIds).sort(),
    category: options.category || '',
    language: options.language || '',
    tags: toArray(options.tags).sort(),
  });
}

function buildQueryText(question, options = {}) {
  return [
    question,
    options.promptAwareText,
    options.promptContext,
    options.promptName,
    options.promptObjective,
    options.userIntent,
  ]
    .filter(Boolean)
    .join('\n');
}

const AGENT_FILTER_TERMS = {
  'community-manager': [
    'community',
    'marketing',
    'social',
    'instagram',
    'facebook',
    'linkedin',
    'campaign',
    'parents',
  ],
  'administrative-assistant': [
    'administration',
    'administrative',
    'enrollment',
    'policy',
    'procedure',
    'operations',
  ],
  'sales-agent': [
    'sales',
    'commercial',
    'pricing',
    'quotation',
    'proposal',
    'contract',
    'product',
  ],
  'hr-agent': ['hr', 'rh', 'policy', 'recruitment', 'leave', 'contract', 'onboarding', 'employee'],
};

function itemMatchesAgent(item, agentCode) {
  const terms = AGENT_FILTER_TERMS[agentCode] || [];
  if (!terms.length) return true;

  const metadata = item.metadata || {};
  const haystack = normalizeText(
    [
      metadata.title,
      metadata.category,
      metadata.description,
      ...(metadata.tags || []),
      ...(item.keywords || []),
      metadata.owner,
      metadata.author,
    ].join(' ')
  );

  return terms.some((term) => haystack.includes(term));
}

function filterItemsByOptions(items, options = {}) {
  const documentIds = normalizeIdSet(options.documentIds);
  const collectionIds = normalizeIdSet(options.collectionIds);
  const tags = toArray(options.tags).map((tag) => tag.toLowerCase());
  const securityClassifications = normalizeIdSet(options.securityClassifications);

  let filtered = items.filter((item) => {
    const metadata = item.metadata || {};

    if (documentIds.size && !documentIds.has(item.documentId)) return false;
    if (collectionIds.size && !collectionIds.has(String(metadata.collectionId || ''))) return false;
    if (options.category && String(metadata.category || '') !== String(options.category)) return false;
    if (options.language && String(metadata.language || item.language || '') !== String(options.language)) {
      return false;
    }
    if (securityClassifications.size && !securityClassifications.has(metadata.securityClassification)) {
      return false;
    }
    if (tags.length) {
      const itemTags = (metadata.tags || []).map((tag) => String(tag).toLowerCase());
      if (!tags.some((tag) => itemTags.includes(tag))) return false;
    }

    return metadata.aiVisibility !== false;
  });

  if (options.agentCode) {
    const agentFiltered = filtered.filter((item) => itemMatchesAgent(item, options.agentCode));
    if (agentFiltered.length) {
      filtered = agentFiltered;
    }
  }

  return filtered;
}

function documentFromVectorItem(item) {
  const metadata = item.metadata || {};

  return {
    id: item.documentId,
    title: metadata.title || 'Untitled document',
    category: metadata.category || '',
    description: metadata.description || '',
    tags: metadata.tags || [],
    author: metadata.author || '',
    owner: metadata.owner || '',
    priority: Number(metadata.priority || 1),
    collectionId: metadata.collectionId || null,
    updatedDate: metadata.updatedDate || metadata.updatedAt || '',
    qualityScore: Number(metadata.qualityScore || 0),
  };
}

function chunkFromVectorItem(item) {
  return {
    id: item.id,
    documentId: item.documentId,
    chunkNumber: item.chunkNumber,
    sectionTitle: item.sectionTitle || '',
    content: item.content,
    estimatedTokens: item.tokens || 0,
    tokenCount: item.tokens || 0,
    metadata: {
      ...(item.metadata || {}),
      provider: item.provider,
      model: item.model,
      sectionTitle: item.sectionTitle || item.metadata?.sectionTitle || '',
      keywords: item.keywords || [],
    },
  };
}

function buildVectorCandidate(item, queryEmbedding, keywords, options = {}) {
  const metadata = item.metadata || {};
  const itemTags = metadata.tags || [];
  const itemKeywords = item.keywords || metadata.keywords || [];
  const contentMatches = countMatches(item.content, keywords);
  const titleMatches = countMatches(metadata.title, keywords);
  const tagMatches = countMatches(itemTags.join(' '), keywords);
  const categoryMatches = countMatches(metadata.category, keywords);
  const metadataMatches = countMatches(
    [metadata.description, metadata.owner, metadata.author, itemKeywords.join(' ')].join(' '),
    keywords
  );
  const keywordScore =
    contentMatches + titleMatches * 2 + tagMatches * 2 + categoryMatches + metadataMatches;
  const semanticScore = clamp01(cosineSimilarity(queryEmbedding, item.embedding));
  const qualityScore = clamp01(Number(metadata.qualityScore || 0) / 100);
  const freshness = freshnessScore(metadata.updatedAt || metadata.updatedDate);
  const collectionBoost = toArray(options.collectionIds).includes(String(metadata.collectionId || ''))
    ? 1
    : 0;
  const agentScore = itemMatchesAgent(item, options.agentCode) ? 1 : 0;
  const metadataScore = clamp01(
    qualityScore * 0.3 + freshness * 0.3 + collectionBoost * 0.2 + agentScore * 0.2
  );

  return {
    chunk: chunkFromVectorItem(item),
    document: documentFromVectorItem(item),
    matchSignals: {
      contentMatches,
      titleMatches,
      tagMatches,
      categoryMatches,
      metadataMatches,
    },
    keywordScore,
    semanticScore,
    cosineSimilarity: cosineSimilarity(queryEmbedding, item.embedding),
    freshnessScore: freshness,
    collectionBoost,
    metadataScore,
    contentHash: item.metadata?.contentHash || '',
  };
}

function rankVectorCandidates(candidates, options = {}) {
  const topK = Math.min(Math.max(Number(options.topK) || env.vectorTopK || 6, 1), 30);
  const semanticWeight = Math.max(Number(env.retrievalSemanticWeight) || 0.5, 0);
  const keywordWeight = Math.max(Number(env.retrievalKeywordWeight) || 0.25, 0);
  const metadataWeight = Math.max(Number(env.retrievalMetadataWeight) || 0.25, 0);
  const totalWeight = semanticWeight + keywordWeight + metadataWeight || 1;
  const maxKeyword = Math.max(...candidates.map((candidate) => candidate.keywordScore || 0), 1);
  const bestByContent = new Map();

  candidates.forEach((candidate) => {
    const keywordScore = clamp01((candidate.keywordScore || 0) / maxKeyword);
    const finalScore = clamp01(
      (candidate.semanticScore * semanticWeight +
        keywordScore * keywordWeight +
        candidate.metadataScore * metadataWeight) /
        totalWeight
    );
    const ranked = {
      ...candidate,
      keywordScore,
      finalScore,
      rankingScore: finalScore,
      confidence: clamp01(finalScore * 0.75 + candidate.semanticScore * 0.25),
      relevance: clamp01(finalScore),
    };
    const key = candidate.contentHash || candidate.chunk.id;
    const current = bestByContent.get(key);
    if (!current || ranked.finalScore > current.finalScore) {
      bestByContent.set(key, ranked);
    }
  });

  return Array.from(bestByContent.values())
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, topK);
}

export class RetrievalService {
  constructor({
    documentIndexer,
    embeddingIndex,
    embeddingService,
    hybridRetriever,
    contextRanker,
    documents,
    rawSources,
    vectorRepository = null,
    vectorIndexBatchSize = env.vectorIndexBatchSize || 8,
    vectorCacheTtlMs = env.vectorCacheTtlMs || 5 * 60 * 1000,
  }) {
    this.documentIndexer = documentIndexer;
    this.embeddingIndex = embeddingIndex;
    this.embeddingService = embeddingService;
    this.hybridRetriever = hybridRetriever;
    this.contextRanker = contextRanker;
    this.documents = documents;
    this.rawSources = rawSources;
    this.vectorRepository = vectorRepository;
    this.vectorIndexBatchSize = Math.max(1, Number(vectorIndexBatchSize) || 8);
    this.vectorCacheTtlMs = Number(vectorCacheTtlMs) || 5 * 60 * 1000;
    this.index = [];
    this.refreshTimer = null;
    this.vectorIndexCache = null;
    this.retrievalCache = new Map();
    this.cancelledJobs = new Set();
    this.refreshIndex();
  }

  scheduleRefreshIndex(delayMs = 300, options = {}) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshIndex();
      if (this.vectorRepository) {
        void this.refreshIndexAsync({
          actor: options.actor || 'system',
          background: true,
          force: Boolean(options.force),
          scope: options.scope || 'all',
          targetId: options.targetId,
        }).catch(() => null);
      }
    }, delayMs);

    return this.index;
  }

  refreshIndex() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const documents = typeof this.documents === 'function' ? this.documents() : [];
    const rawSources = typeof this.rawSources === 'function' ? this.rawSources() : [];
    this.index = this.documentIndexer.indexDocuments(documents || [], rawSources || []);
    this.embeddingIndex.rebuild(
      this.index.flatMap((document) => document.chunks),
      this.embeddingService
    );
    return this.index;
  }

  buildResponse(question, rankedCandidates, retrievalStrategy, extra = {}) {
    const chunks = rankedCandidates.map((candidate) => ({
      id: candidate.chunk.id,
      documentId: candidate.document.id,
      documentName: candidate.document.title,
      chunkNumber: candidate.chunk.chunkNumber,
      sectionTitle: candidate.chunk.sectionTitle || candidate.chunk.metadata?.sectionTitle || '',
      content: candidate.chunk.content,
      estimatedTokens: candidate.chunk.estimatedTokens,
      metadata: candidate.chunk.metadata,
      cosineSimilarity: rounded(candidate.cosineSimilarity),
      semanticScore: rounded(candidate.semanticScore),
      keywordScore: rounded(candidate.keywordScore),
      metadataScore: rounded(candidate.metadataScore),
      freshnessScore: rounded(candidate.freshnessScore),
      finalScore: rounded(candidate.finalScore),
      rankingScore: rounded(candidate.rankingScore),
      confidence: rounded(candidate.confidence ?? candidate.finalScore),
      relevance: rounded(candidate.relevance ?? candidate.finalScore),
    }));
    const assembledContext = rankedCandidates
      .map((candidate) => {
        const section = candidate.chunk.sectionTitle ? ` - ${candidate.chunk.sectionTitle}` : '';
        return `[${candidate.document.title} - chunk ${candidate.chunk.chunkNumber}${section}]\n${candidate.chunk.content}`;
      })
      .join('\n\n');
    const documentNames = Array.from(new Set(rankedCandidates.map((candidate) => candidate.document.title)));
    const topScore = chunks[0]?.finalScore || 0;

    return {
      question,
      retrievedChunks: chunks,
      rankedChunks: chunks,
      citations: chunks.map((chunk, index) => ({
        rank: index + 1,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkId: chunk.id,
        chunkNumber: chunk.chunkNumber,
        sectionTitle: chunk.sectionTitle,
        score: chunk.finalScore,
        confidence: chunk.confidence,
      })),
      documentNames,
      retrievedDocuments: documentNames,
      retrievalStrategy,
      estimatedTokens: rankedCandidates.reduce(
        (total, candidate) => total + Number(candidate.chunk.estimatedTokens || 0),
        0
      ),
      assembledContext,
      contextText: assembledContext,
      context: assembledContext,
      confidence: rounded(topScore),
      relevance: chunks.length
        ? rounded(chunks.reduce((sum, chunk) => sum + Number(chunk.relevance || 0), 0) / chunks.length)
        : 0,
      ...extra,
    };
  }

  retrieveRelevantContext(question, options = {}) {
    const normalizedQuestion = normalizeQuestion(question);
    const candidates = this.hybridRetriever.retrieve(
      normalizedQuestion,
      this.index,
      this.embeddingIndex.toArray(),
      options.topK || env.vectorTopK || 10
    );
    const rankedCandidates = dedupeByChunkId(
      this.contextRanker.rank(candidates, options.topK || 5)
    );

    return this.buildResponse(normalizedQuestion, rankedCandidates, 'hybrid-semantic-keyword', {
      provider: this.embeddingService.provider,
      model: this.embeddingService.model,
      cacheHit: false,
    });
  }

  async retrieveRelevantContextAsync(question, options = {}) {
    const startedAt = Date.now();
    const normalizedQuestion = normalizeQuestion(question);
    const providerInfo = this.embeddingService.getProviderInfo();
    const cacheKey = buildCacheKey(normalizedQuestion, options);
    const cached = this.getRetrievalCache(cacheKey);

    if (cached) {
      await this.recordRetrievalEvent({
        question: normalizedQuestion,
        options,
        providerInfo,
        startedAt,
        status: 'success',
        cacheHit: true,
        response: cached,
      });
      return {
        ...cached,
        cacheHit: true,
        latencyMs: Date.now() - startedAt,
      };
    }

    try {
      if (!this.vectorRepository) {
        const fallback = this.retrieveRelevantContext(normalizedQuestion, options);
        return { ...fallback, retrievalStrategy: 'hybrid-semantic-keyword-fallback' };
      }

      let { items, cacheHit: indexCacheHit } = await this.loadPersistentIndexItems();

      if (!items.length) {
        await this.refreshIndexAsync({
          actor: 'lazy-retrieval',
          scope: 'all',
          force: false,
        });
        ({ items, cacheHit: indexCacheHit } = await this.loadPersistentIndexItems({ force: true }));
      }

      const filteredItems = filterItemsByOptions(items, options);
      const queryText = buildQueryText(normalizedQuestion, options);
      const queryEmbedding = await this.embeddingService.generateEmbeddingAsync(queryText);
      const keywords = tokenize(queryText);
      const candidates = filteredItems.map((item) =>
        buildVectorCandidate(item, queryEmbedding, keywords, options)
      );
      const rankedCandidates = rankVectorCandidates(candidates, options);

      if (!rankedCandidates.length) {
        const fallback = {
          ...this.retrieveRelevantContext(normalizedQuestion, options),
          retrievalStrategy: 'keyword-fallback',
          provider: providerInfo.provider,
          model: providerInfo.model,
          cacheHit: indexCacheHit,
          latencyMs: Date.now() - startedAt,
        };
        await this.recordRetrievalEvent({
          question: normalizedQuestion,
          options,
          providerInfo,
          startedAt,
          status: 'fallback',
          cacheHit: indexCacheHit,
          response: fallback,
        });
        return fallback;
      }

      const response = this.buildResponse(
        normalizedQuestion,
        rankedCandidates,
        'enterprise-vector-hybrid',
        {
          provider: providerInfo.provider,
          model: providerInfo.model,
          embeddingProvider: providerInfo.provider,
          embeddingModel: providerInfo.model,
          topK: Math.min(Math.max(Number(options.topK) || env.vectorTopK || 6, 1), 30),
          cacheHit: indexCacheHit,
          latencyMs: Date.now() - startedAt,
        }
      );

      this.setRetrievalCache(cacheKey, response);
      await this.recordRetrievalEvent({
        question: normalizedQuestion,
        options,
        providerInfo,
        startedAt,
        status: 'success',
        cacheHit: indexCacheHit,
        response,
      });
      return response;
    } catch (error) {
      const fallback = {
        ...this.retrieveRelevantContext(normalizedQuestion, options),
        retrievalStrategy: 'hybrid-semantic-keyword-fallback',
        provider: providerInfo.provider,
        model: providerInfo.model,
        cacheHit: false,
        latencyMs: Date.now() - startedAt,
        retrievalError: error instanceof Error ? error.message : String(error),
      };
      await this.recordRetrievalEvent({
        question: normalizedQuestion,
        options,
        providerInfo,
        startedAt,
        status: 'failed',
        cacheHit: false,
        response: fallback,
        error,
      });
      return fallback;
    }
  }

  getRetrievalCache(cacheKey) {
    const cached = this.retrievalCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() - cached.createdAt > this.vectorCacheTtlMs) {
      this.retrievalCache.delete(cacheKey);
      return null;
    }
    return cached.value;
  }

  setRetrievalCache(cacheKey, value) {
    this.retrievalCache.set(cacheKey, {
      value,
      createdAt: Date.now(),
    });
  }

  clearCache() {
    const retrievalCacheEntries = this.retrievalCache.size;
    const vectorIndexEntries = this.vectorIndexCache?.items?.length || 0;
    this.retrievalCache.clear();
    this.vectorIndexCache = null;
    const embedding = this.embeddingService.clearCache?.() || { cleared: 0 };
    return {
      retrievalCacheEntries,
      vectorIndexEntries,
      embeddingCacheEntries: embedding.cleared || 0,
    };
  }

  async loadPersistentIndexItems({ force = false } = {}) {
    if (!this.vectorRepository?.listVectorIndexItems) {
      return { items: [], cacheHit: false };
    }

    const now = Date.now();
    if (
      !force &&
      this.vectorIndexCache &&
      now - this.vectorIndexCache.createdAt <= this.vectorCacheTtlMs
    ) {
      return { items: this.vectorIndexCache.items, cacheHit: true };
    }

    const providerInfo = this.embeddingService.getProviderInfo();
    const items = await this.vectorRepository.listVectorIndexItems({
      provider: providerInfo.provider,
      model: providerInfo.model,
    });
    this.vectorIndexCache = { items, createdAt: now };
    return { items, cacheHit: false };
  }

  async refreshIndexAsync(options = {}) {
    if (!this.vectorRepository?.createIndexJob) {
      return {
        status: 'skipped',
        reason: 'Vector repository is not available.',
      };
    }

    const providerInfo = this.embeddingService.getProviderInfo();
    const job = await this.vectorRepository.createIndexJob({
      scope: options.scope || 'all',
      targetId: options.targetId || null,
      actor: options.actor || 'system',
      provider: providerInfo.provider,
      model: providerInfo.model,
      metadata: {
        force: Boolean(options.force),
        batchSize: this.vectorIndexBatchSize,
      },
    });

    if (options.background) {
      setTimeout(() => {
        void this.runIndexJob(job.id, options).catch(() => null);
      }, 0);
      return job;
    }

    return this.runIndexJob(job.id, options);
  }

  selectDocumentsForScope(indexedDocuments, { scope = 'all', targetId = null } = {}) {
    if (scope === 'document' && targetId) {
      return indexedDocuments.filter((document) => document.id === targetId);
    }
    if (scope === 'collection' && targetId) {
      return indexedDocuments.filter((document) => document.collectionId === targetId);
    }
    return indexedDocuments;
  }

  async runIndexJob(jobId, options = {}) {
    const providerInfo = this.embeddingService.getProviderInfo();
    const indexedDocuments = this.documentIndexer.indexDocuments(
      typeof this.documents === 'function' ? this.documents() || [] : [],
      typeof this.rawSources === 'function' ? this.rawSources() || [] : []
    );
    const selectedDocuments = this.selectDocumentsForScope(indexedDocuments, options);
    const totalChunks = selectedDocuments.reduce(
      (total, document) => total + (document.chunks?.length || 0),
      0
    );
    const counters = {
      processedDocuments: 0,
      processedChunks: 0,
      failedDocuments: 0,
      failedChunks: 0,
    };

    await this.vectorRepository.updateIndexJob(jobId, {
      status: 'running',
      startedAt: new Date(),
      totalDocuments: selectedDocuments.length,
      totalChunks,
      metadata: {
        scope: options.scope || 'all',
        targetId: options.targetId || null,
        provider: providerInfo.provider,
        model: providerInfo.model,
      },
    });

    for (const document of selectedDocuments) {
      if (this.cancelledJobs.has(jobId)) {
        this.cancelledJobs.delete(jobId);
        this.clearCache();
        return this.vectorRepository.updateIndexJob(jobId, {
          status: 'cancelled',
          finishedAt: new Date(),
          ...counters,
        });
      }

      try {
        if (document.processingStatus === 'failed') {
          throw new Error(document.processingError || 'Document ingestion failed.');
        }

        const duplicate = await this.vectorRepository.findDuplicateContent?.(
          document.contentHash,
          document.id
        );
        const duplicateOf = document.duplicateOf || duplicate?.id || null;
        await this.vectorRepository.replaceVectorChunks(document.id, document.chunks || []);

        for (let index = 0; index < (document.chunks || []).length; index += this.vectorIndexBatchSize) {
          const batch = document.chunks.slice(index, index + this.vectorIndexBatchSize);
          const embeddingResults = await this.embeddingService.generateBatch(
            batch.map((chunk) => chunk.content)
          );

          for (let localIndex = 0; localIndex < batch.length; localIndex += 1) {
            const chunk = batch[localIndex];
            const embedding = embeddingResults[localIndex];
            await this.vectorRepository.upsertEmbedding({
              chunkId: chunk.id,
              documentId: document.id,
              provider: embedding.provider || providerInfo.provider,
              model: embedding.model || providerInfo.model,
              dimensions: embedding.dimensions || embedding.embedding?.length || 0,
              embedding: embedding.embedding || [],
              embeddingHash: embedding.embeddingHash,
              status: 'ready',
              latencyMs: embedding.latencyMs || 0,
              metadata: {
                jobId,
                chunkNumber: chunk.chunkNumber,
                contentHash: chunk.contentHash,
                cacheHit: Boolean(embedding.cacheHit),
              },
            });
          }

          counters.processedChunks += batch.length;
        }

        counters.processedDocuments += 1;
        await this.vectorRepository.updateVectorDocumentState(document.id, {
          processingStatus: 'indexed',
          processingError: '',
          indexedAt: new Date(),
          embeddingStatus: document.chunks?.length ? 'ready' : 'missing',
          embeddingProvider: providerInfo.provider,
          embeddingModel: providerInfo.model,
          chunkCount: document.chunks?.length || 0,
          averageChunkTokens: document.averageChunkTokens || 0,
          summary: document.summary || '',
          keywords: document.keywords || [],
          detectedLanguage: document.detectedLanguage || document.language || '',
          contentHash: document.contentHash || '',
          duplicateOf,
          lastIndexError: '',
        });
      } catch (error) {
        counters.failedDocuments += 1;
        counters.failedChunks += Math.max(document.chunks?.length || 0, 1);
        await this.vectorRepository.updateVectorDocumentState?.(document.id, {
          processingStatus: 'failed',
          processingError: error instanceof Error ? error.message : String(error),
          embeddingStatus: 'failed',
          embeddingProvider: providerInfo.provider,
          embeddingModel: providerInfo.model,
          chunkCount: document.chunks?.length || 0,
          averageChunkTokens: document.averageChunkTokens || 0,
          summary: document.summary || '',
          keywords: document.keywords || [],
          detectedLanguage: document.detectedLanguage || document.language || '',
          contentHash: document.contentHash || '',
          duplicateOf: document.duplicateOf || null,
          lastIndexError: error instanceof Error ? error.message : String(error),
        });
      }

      await this.vectorRepository.updateIndexJob(jobId, {
        status: 'running',
        totalDocuments: selectedDocuments.length,
        totalChunks,
        ...counters,
      });
    }

    this.index = indexedDocuments;
    this.embeddingIndex.rebuild(
      this.index.flatMap((document) => document.chunks),
      this.embeddingService
    );
    this.clearCache();

    return this.vectorRepository.updateIndexJob(jobId, {
      status: counters.failedDocuments ? 'failed' : 'completed',
      totalDocuments: selectedDocuments.length,
      totalChunks,
      ...counters,
      finishedAt: new Date(),
      errorMessage: counters.failedDocuments
        ? `${counters.failedDocuments} document(s) failed during indexing.`
        : '',
    });
  }

  async reindexDocument(documentId, options = {}) {
    return this.refreshIndexAsync({
      ...options,
      scope: 'document',
      targetId: documentId,
      force: true,
    });
  }

  async reindexCollection(collectionId, options = {}) {
    return this.refreshIndexAsync({
      ...options,
      scope: 'collection',
      targetId: collectionId,
      force: true,
    });
  }

  async reindexAll(options = {}) {
    return this.refreshIndexAsync({
      ...options,
      scope: 'all',
      force: true,
    });
  }

  async cancelIndexJob(jobId, actor = '') {
    this.cancelledJobs.add(jobId);
    if (this.vectorRepository?.cancelIndexJob) {
      return this.vectorRepository.cancelIndexJob(jobId, actor);
    }
    return { id: jobId, status: 'cancelled' };
  }

  async retryFailedJobs(options = {}) {
    if (!this.vectorRepository?.listIndexJobs) {
      return { items: [] };
    }

    const failedJobs = await this.vectorRepository.listIndexJobs({ status: 'failed', limit: 25 });
    const jobs = [];

    for (const job of failedJobs) {
      jobs.push(
        await this.refreshIndexAsync({
          actor: options.actor || job.actor || 'system',
          scope: job.scope || 'all',
          targetId: job.targetId,
          force: true,
          background: Boolean(options.background),
        })
      );
    }

    return { items: jobs, retried: jobs.length };
  }

  async listIndexJobs(options = {}) {
    if (!this.vectorRepository?.listIndexJobs) {
      return { items: [] };
    }
    return { items: await this.vectorRepository.listIndexJobs(options) };
  }

  async getVectorStats() {
    const providerInfo = this.embeddingService.getProviderInfo();
    const stats = this.vectorRepository?.getVectorStats
      ? await this.vectorRepository.getVectorStats({})
      : {
          documentsIndexed: this.index.length,
          chunks: this.embeddingIndex.toArray().length,
          embeddings: this.embeddingIndex.toArray().length,
          averageChunkSize: 0,
          coverage: this.index.length ? 100 : 0,
          missingEmbeddings: 0,
          failedIndexing: 0,
          duplicates: 0,
          staleKnowledge: 0,
          retrievalLatency: 0,
          retrievalSuccess: 0,
          retrievalFailures: 0,
          cacheHitRatio: 0,
          embeddingLatency: providerInfo.stats.averageLatencyMs,
          queueSize: 0,
          jobs: {},
          latestRetrieval: null,
        };

    return {
      ...stats,
      provider: providerInfo.provider,
      model: providerInfo.model,
      dimensions: providerInfo.dimensions,
      embeddingProvider: providerInfo,
      cache: {
        retrievalEntries: this.retrievalCache.size,
        vectorIndexEntries: this.vectorIndexCache?.items?.length || 0,
        embeddingEntries: providerInfo.cacheSize,
      },
    };
  }

  getProviderInfo() {
    return this.embeddingService.getProviderInfo();
  }

  async recordRetrievalEvent({
    question,
    options,
    providerInfo,
    startedAt,
    status,
    cacheHit,
    response,
    error,
  }) {
    if (!this.vectorRepository?.recordRetrievalEvent) {
      return null;
    }

    return this.vectorRepository.recordRetrievalEvent({
      questionHash: questionHash(question),
      agentCode: options.agentCode || '',
      promptId: options.promptId || null,
      provider: providerInfo.provider,
      model: providerInfo.model,
      cacheHit,
      status,
      topK: response.topK || options.topK || env.vectorTopK || 0,
      retrievedChunkCount: response.retrievedChunks?.length || 0,
      semanticTopScore: response.retrievedChunks?.[0]?.semanticScore || 0,
      latencyMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : '',
      metadata: {
        strategy: response.retrievalStrategy,
        confidence: response.confidence || 0,
        relevance: response.relevance || 0,
        documents: response.retrievedDocuments || [],
        topDocuments: (response.retrievedChunks || []).slice(0, 5).map((chunk) => ({
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          score: chunk.finalScore,
        })),
      },
    });
  }
}
