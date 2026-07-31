import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { KnowledgeDocumentRepository } from '../src/repositories/KnowledgeDocumentRepository.js';
import { EvaluationRepository } from '../src/repositories/EvaluationRepository.js';
import { KnowledgeEvaluationService } from '../src/services/evaluation/KnowledgeEvaluationService.js';
import { ContextRanker } from '../src/services/retrieval/ContextRanker.js';
import { DocumentChunker } from '../src/services/retrieval/DocumentChunker.js';
import { DocumentIndexer } from '../src/services/retrieval/DocumentIndexer.js';
import { DocumentIngestionService } from '../src/services/retrieval/DocumentIngestionService.js';
import { EmbeddingIndex } from '../src/services/retrieval/EmbeddingIndex.js';
import { EmbeddingService } from '../src/services/retrieval/EmbeddingService.js';
import { HybridRetriever } from '../src/services/retrieval/HybridRetriever.js';
import { KeywordRetriever } from '../src/services/retrieval/KeywordRetriever.js';
import { RetrievalService } from '../src/services/retrieval/RetrievalService.js';
import { SemanticRetriever } from '../src/services/retrieval/SemanticRetriever.js';

function baseDocument(overrides = {}) {
  return {
    id: overrides.id || `doc-${Date.now()}`,
    title: overrides.title || 'Enrollment Policy',
    category: overrides.category || 'Administration',
    description: overrides.description || 'Enrollment and guardian approval policy.',
    tags: overrides.tags || ['enrollment', 'policy'],
    createdDate: '31 Jul 2026',
    updatedDate: '31 Jul 2026',
    size: '2 KB',
    status: overrides.status || 'active',
    author: 'QA Lead',
    fileType: overrides.fileType || 'MD',
    sourceFileName: overrides.sourceFileName || 'policy.md',
    content:
      overrides.content ||
      '# Enrollment policy\nGuardian authorization, emergency contact details and director approval are required before onboarding.',
    priority: overrides.priority || 3,
    collectionId: overrides.collectionId || null,
    language: overrides.language || 'en',
    owner: 'Operations',
    aiVisibility: overrides.aiVisibility !== false,
    securityClassification: 'internal',
  };
}

async function createStack(documents) {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const repository = new KnowledgeDocumentRepository(pool);
  for (const document of documents) {
    await repository.create(document);
  }

  let documentCache = await repository.list();
  let sourceCache = await repository.listSources();
  const embeddingService = new EmbeddingService({
    provider: 'mock',
    model: 'mock-hash-v1',
    dimensions: 64,
  });
  const retrievalService = new RetrievalService({
    documentIndexer: new DocumentIndexer({
      documentChunker: new DocumentChunker({ chunkSize: 180, overlap: 30 }),
      documentIngestionService: new DocumentIngestionService({ maxFileBytes: 1024 * 1024 }),
    }),
    embeddingIndex: new EmbeddingIndex(),
    embeddingService,
    hybridRetriever: new HybridRetriever({
      keywordRetriever: new KeywordRetriever(),
      semanticRetriever: new SemanticRetriever({ embeddingService }),
    }),
    contextRanker: new ContextRanker(),
    documents: () => documentCache,
    rawSources: () => sourceCache,
    vectorRepository: repository,
    vectorIndexBatchSize: 2,
    vectorCacheTtlMs: 60_000,
  });

  return {
    pool,
    repository,
    retrievalService,
    refreshCaches: async () => {
      documentCache = await repository.list();
      sourceCache = await repository.listSources();
    },
  };
}

test('DocumentIngestionService validates supported formats, metadata and unsafe uploads', () => {
  const ingestion = new DocumentIngestionService({ maxFileBytes: 1024 });
  const markdown = ingestion.ingestDocument(baseDocument(), {
    content: '# Admissions\nParents must sign the authorization form before onboarding.',
    mimeType: 'text/markdown',
  });

  assert.equal(markdown.processingStatus, 'ready');
  assert.equal(markdown.fileType, 'MD');
  assert.ok(markdown.sections.length >= 1);
  assert.ok(markdown.keywords.includes('authorization'));
  assert.ok(markdown.qualityScore > 0);

  const html = ingestion.ingestDocument(
    baseDocument({ fileType: 'HTML', sourceFileName: 'page.html' }),
    { content: '<h1>Policy</h1><script>alert(1)</script><p>Safe content only.</p>', mimeType: 'text/html' }
  );
  assert.equal(html.processingStatus, 'ready');
  assert.doesNotMatch(html.content, /script|alert/i);

  const invalid = ingestion.ingestDocument(
    baseDocument({ fileType: 'EXE', sourceFileName: 'malware.exe' }),
    { content: 'do not execute', mimeType: 'application/x-msdownload' }
  );
  assert.equal(invalid.processingStatus, 'failed');
  assert.match(invalid.errors.join(' '), /Unsupported/);

  const tooLarge = ingestion.validate({
    filename: 'large.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    byteSize: 2048,
  });
  assert.equal(tooLarge.valid, false);
});

test('EmbeddingService supports mock, local and OpenAI providers through configuration', async () => {
  const mock = new EmbeddingService({ provider: 'mock', model: 'mock-hash-v1' });
  assert.equal(mock.generateEmbedding('stable embedding').length, 128);

  const local = new EmbeddingService({ provider: 'local', model: 'local-bow-v1', dimensions: 32 });
  const [localResult] = await local.generateBatch(['enterprise retrieval search']);
  assert.equal(localResult.provider, 'local');
  assert.equal(localResult.embedding.length, 32);

  const calls = [];
  const openai = new EmbeddingService({
    provider: 'openai',
    model: 'text-embedding-test',
    dimensions: 3,
    config: {
      openAiApiKey: 'test-key',
      openAiEmbeddingBaseUrl: 'https://embedding.example/v1',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          data: [
            { index: 0, embedding: [1, 0, 0] },
            { index: 1, embedding: [0, 1, 0] },
          ],
        }),
      };
    },
  });

  const results = await openai.generateBatch(['first', 'second']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://embedding.example/v1/embeddings');
  assert.equal(JSON.parse(calls[0].options.body).model, 'text-embedding-test');
  assert.equal(results[0].provider, 'openai');
  assert.equal(results[1].embedding.length, 3);
});

test('RetrievalService persists vector chunks, embeddings, jobs and semantic retrieval events', async () => {
  const stack = await createStack([baseDocument({ id: 'doc-admin' })]);

  const job = await stack.retrievalService.reindexAll({ actor: 'qa' });
  assert.equal(job.status, 'completed');
  assert.equal(job.processedDocuments, 1);
  assert.ok(job.processedChunks >= 1);

  const chunks = await stack.repository.listVectorChunks({ documentId: 'doc-admin' });
  assert.ok(chunks.length >= 1);
  const embeddings = await stack.repository.listVectorIndexItems({
    provider: 'mock',
    model: 'mock-hash-v1',
  });
  assert.equal(embeddings.length, chunks.length);

  const result = await stack.retrievalService.retrieveRelevantContextAsync(
    'What approvals are needed before enrollment onboarding?',
    { agentCode: 'administrative-assistant', topK: 3, promptAwareText: 'enrollment policy' }
  );
  assert.equal(result.retrievalStrategy, 'enterprise-vector-hybrid');
  assert.ok(result.retrievedChunks.length >= 1);
  assert.ok(result.citations[0].confidence >= 0);
  assert.match(result.contextText, /Enrollment policy/i);

  const stats = await stack.repository.getVectorStats();
  assert.ok(stats.chunks >= 1);
  assert.ok(stats.embeddings >= 1);
  assert.ok(stats.retrievalLatency >= 0);
});

test('Enterprise retrieval ranks with agent filters, metadata and duplicate detection', async () => {
  const stack = await createStack([
    baseDocument({
      id: 'doc-sales',
      title: 'Sales Pricing Guide',
      category: 'Sales',
      tags: ['sales', 'pricing', 'quotation'],
      content: 'Commercial pricing guide with quotation discounts and proposal follow-up rules.',
      priority: 5,
    }),
    baseDocument({
      id: 'doc-hr',
      title: 'HR Leave Policy',
      category: 'HR',
      tags: ['hr', 'leave'],
      content: 'Leave requests require manager review and HR tracking before any decision.',
    }),
    baseDocument({
      id: 'doc-sales-copy',
      title: 'Sales Pricing Guide Copy',
      category: 'Sales',
      tags: ['sales', 'pricing'],
      content: 'Commercial pricing guide with quotation discounts and proposal follow-up rules.',
    }),
  ]);

  const job = await stack.retrievalService.reindexAll({ actor: 'qa' });
  assert.equal(job.status, 'completed');

  const stats = await stack.retrievalService.getVectorStats();
  assert.ok(stats.duplicates >= 1);

  const result = await stack.retrievalService.retrieveRelevantContextAsync(
    'Which quotation discount rules apply?',
    { agentCode: 'sales-agent', topK: 2, promptAwareText: 'commercial proposal' }
  );
  assert.equal(result.retrievedChunks[0].documentId, 'doc-sales');
  assert.ok(result.relevance >= 0);
  assert.ok(result.retrievedChunks.length <= 2);
});

test('Vector administration actions clear cache, cancel jobs and feed evaluation metrics', async () => {
  const stack = await createStack([baseDocument({ id: 'doc-eval' })]);

  await stack.retrievalService.reindexAll({ actor: 'qa' });
  await stack.retrievalService.retrieveRelevantContextAsync('guardian authorization', {
    agentCode: 'administrative-assistant',
  });

  const cache = stack.retrievalService.clearCache();
  assert.ok(cache.retrievalCacheEntries >= 0);
  assert.ok(cache.embeddingCacheEntries >= 0);

  const queued = await stack.repository.createIndexJob({
    scope: 'all',
    status: 'queued',
    actor: 'qa',
  });
  const cancelled = await stack.retrievalService.cancelIndexJob(queued.id, 'qa');
  assert.equal(cancelled.status, 'cancelled');

  const knowledgeEvaluationService = new KnowledgeEvaluationService({
    evaluationRepository: new EvaluationRepository(stack.pool),
    staleDays: 90,
  });
  const quality = await knowledgeEvaluationService.getKnowledgeQuality({ days: 30 });

  assert.ok(quality.vectorHealth.chunks >= 1);
  assert.ok(quality.vectorCoveragePercent >= 0);
  assert.ok(quality.retrievalPrecision >= 0);
  assert.ok(quality.semanticRelevance >= 0);
});
