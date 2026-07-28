import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextRanker } from '../src/services/retrieval/ContextRanker.js';
import { DocumentChunker } from '../src/services/retrieval/DocumentChunker.js';
import { DocumentIndexer } from '../src/services/retrieval/DocumentIndexer.js';
import { EmbeddingIndex } from '../src/services/retrieval/EmbeddingIndex.js';
import { EmbeddingService } from '../src/services/retrieval/EmbeddingService.js';
import { HybridRetriever } from '../src/services/retrieval/HybridRetriever.js';
import { KeywordRetriever } from '../src/services/retrieval/KeywordRetriever.js';
import { RetrievalService } from '../src/services/retrieval/RetrievalService.js';
import { SemanticRetriever } from '../src/services/retrieval/SemanticRetriever.js';

const sampleDocument = {
  id: 'doc-001',
  title: 'Parent Enrollment Policy',
  category: 'Administration',
  description: 'Enrollment policy reference.',
  tags: ['enrollment', 'policy'],
  fileType: 'PDF',
  author: 'Sara El Idrissi',
  createdDate: '15 Jul 2026',
  updatedDate: '28 Jul 2026',
};

const sampleSource = {
  documentId: 'doc-001',
  priority: 3,
  content: `
Parent Enrollment Policy

Administrative onboarding requires signed authorization, guardian identification,
and complete emergency contact details before approval.

The assistant should verify the enrollment file before scheduling onboarding.
`,
};

test('DocumentChunker creates logical chunks with metadata', () => {
  const chunker = new DocumentChunker({ chunkSize: 120, overlap: 20 });
  const chunks = chunker.chunk(sampleDocument, sampleSource.content);

  assert.ok(chunks.length >= 1);
  assert.equal(chunks[0].documentId, sampleDocument.id);
  assert.ok(chunks[0].estimatedTokens > 0);
});

test('EmbeddingService returns stable cached embeddings', () => {
  const embeddingService = new EmbeddingService({ provider: 'mock', model: 'mock-hash-v1' });

  const first = embeddingService.generateEmbedding('enrollment authorization onboarding');
  const second = embeddingService.generateEmbedding('enrollment authorization onboarding');

  assert.deepEqual(first, second);
  assert.equal(first.length, 128);
});

test('KeywordRetriever returns matching chunks for the query', () => {
  const chunker = new DocumentChunker({ chunkSize: 120, overlap: 20 });
  const indexer = new DocumentIndexer({ documentChunker: chunker });
  const indexedDocuments = indexer.indexDocuments([sampleDocument], [sampleSource]);
  const retriever = new KeywordRetriever();

  const candidates = retriever.retrieve('enrollment authorization onboarding', indexedDocuments);

  assert.ok(candidates.length >= 1);
  assert.ok(candidates[0].baseScore > 0);
});

test('SemanticRetriever returns top semantic candidates', () => {
  const chunker = new DocumentChunker({ chunkSize: 120, overlap: 20 });
  const indexer = new DocumentIndexer({ documentChunker: chunker });
  const indexedDocuments = indexer.indexDocuments([sampleDocument], [sampleSource]);
  const embeddingService = new EmbeddingService({ provider: 'mock', model: 'mock-hash-v1' });
  const embeddingIndex = new EmbeddingIndex();

  embeddingIndex.rebuild(indexedDocuments.flatMap((document) => document.chunks), embeddingService);

  const retriever = new SemanticRetriever({ embeddingService });
  const candidates = retriever.retrieve(
    'How do we verify enrollment authorization?',
    embeddingIndex.toArray(),
    indexedDocuments
  );

  assert.ok(candidates.length >= 1);
  assert.ok(candidates[0].semanticScore >= 0);
});

test('HybridRetriever merges semantic and keyword candidates', () => {
  const chunker = new DocumentChunker({ chunkSize: 120, overlap: 20 });
  const indexer = new DocumentIndexer({ documentChunker: chunker });
  const indexedDocuments = indexer.indexDocuments([sampleDocument], [sampleSource]);
  const embeddingService = new EmbeddingService({ provider: 'mock', model: 'mock-hash-v1' });
  const embeddingIndex = new EmbeddingIndex();

  embeddingIndex.rebuild(indexedDocuments.flatMap((document) => document.chunks), embeddingService);

  const retriever = new HybridRetriever({
    keywordRetriever: new KeywordRetriever(),
    semanticRetriever: new SemanticRetriever({ embeddingService }),
  });

  const candidates = retriever.retrieve(
    'How do we verify enrollment authorization?',
    indexedDocuments,
    embeddingIndex.toArray()
  );

  assert.ok(candidates.length >= 1);
  assert.ok(typeof candidates[0].semanticScore === 'number');
  assert.ok(typeof candidates[0].keywordScore === 'number');
});

test('ContextRanker sorts candidates by normalized final score', () => {
  const ranker = new ContextRanker();
  const candidates = [
    {
      chunk: { id: 'a', chunkNumber: 1, content: 'alpha', estimatedTokens: 5 },
      document: { ...sampleDocument, updatedDate: '01 Jan 2024', priority: 1 },
      matchSignals: {
        contentMatches: 1,
        titleMatches: 0,
        tagMatches: 0,
        categoryMatches: 0,
        metadataMatches: 0,
      },
      keywordScore: 1,
      semanticScore: 0.2,
    },
    {
      chunk: { id: 'b', chunkNumber: 2, content: 'beta', estimatedTokens: 5 },
      document: { ...sampleDocument, priority: 3 },
      matchSignals: {
        contentMatches: 2,
        titleMatches: 1,
        tagMatches: 1,
        categoryMatches: 0,
        metadataMatches: 0,
      },
      keywordScore: 6,
      semanticScore: 0.8,
    },
  ];

  const ranked = ranker.rank(candidates, 2);

  assert.equal(ranked[0].chunk.id, 'b');
  assert.ok(ranked[0].finalScore >= ranked[1].finalScore);
});

test('RetrievalService returns structured context and ranked chunks', () => {
  const embeddingService = new EmbeddingService({ provider: 'mock', model: 'mock-hash-v1' });
  const service = new RetrievalService({
    documentIndexer: new DocumentIndexer({
      documentChunker: new DocumentChunker({ chunkSize: 120, overlap: 20 }),
    }),
    embeddingIndex: new EmbeddingIndex(),
    embeddingService,
    hybridRetriever: new HybridRetriever({
      keywordRetriever: new KeywordRetriever(),
      semanticRetriever: new SemanticRetriever({ embeddingService }),
    }),
    contextRanker: new ContextRanker(),
    documents: () => [sampleDocument],
    rawSources: () => [sampleSource],
  });

  const result = service.retrieveRelevantContext('How do we verify enrollment authorization?');

  assert.equal(result.question, 'How do we verify enrollment authorization?');
  assert.ok(result.retrievedChunks.length >= 1);
  assert.match(result.assembledContext, /Parent Enrollment Policy/);
  assert.ok(result.estimatedTokens > 0);
  assert.equal(result.retrievalStrategy, 'hybrid-semantic-keyword');
  assert.ok(typeof result.retrievedChunks[0].semanticScore === 'number');
  assert.ok(typeof result.retrievedChunks[0].keywordScore === 'number');
  assert.ok(typeof result.retrievedChunks[0].finalScore === 'number');
});
