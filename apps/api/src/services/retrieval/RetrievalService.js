function normalizeQuestion(question) {
  return question.trim().replace(/\s+/g, ' ');
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

export class RetrievalService {
  constructor({
    documentIndexer,
    embeddingIndex,
    embeddingService,
    hybridRetriever,
    contextRanker,
    documents,
    rawSources,
  }) {
    this.documentIndexer = documentIndexer;
    this.embeddingIndex = embeddingIndex;
    this.embeddingService = embeddingService;
    this.hybridRetriever = hybridRetriever;
    this.contextRanker = contextRanker;
    this.documents = documents;
    this.rawSources = rawSources;
    this.index = [];
    this.refreshTimer = null;
    this.refreshIndex();
  }

  scheduleRefreshIndex(delayMs = 300) {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshIndex();
    }, delayMs);

    return this.index;
  }

  refreshIndex() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.index = this.documentIndexer.indexDocuments(this.documents(), this.rawSources());
    this.embeddingIndex.rebuild(
      this.index.flatMap((document) => document.chunks),
      this.embeddingService
    );
    return this.index;
  }

  retrieveRelevantContext(question) {
    const normalizedQuestion = normalizeQuestion(question);
    const candidates = this.hybridRetriever.retrieve(
      normalizedQuestion,
      this.index,
      this.embeddingIndex.toArray()
    );
    const rankedCandidates = dedupeByChunkId(this.contextRanker.rank(candidates));
    const assembledContext = rankedCandidates
      .map(
        (candidate) =>
          `[${candidate.document.title} - chunk ${candidate.chunk.chunkNumber}]\n${candidate.chunk.content}`
      )
      .join('\n\n');

    return {
      question: normalizedQuestion,
      retrievedChunks: rankedCandidates.map((candidate) => ({
        id: candidate.chunk.id,
        documentId: candidate.document.id,
        documentName: candidate.document.title,
        chunkNumber: candidate.chunk.chunkNumber,
        content: candidate.chunk.content,
        estimatedTokens: candidate.chunk.estimatedTokens,
        metadata: candidate.chunk.metadata,
        cosineSimilarity: candidate.cosineSimilarity,
        semanticScore: candidate.semanticScore,
        keywordScore: candidate.keywordScore,
        finalScore: candidate.finalScore,
        rankingScore: candidate.rankingScore,
      })),
      documentNames: Array.from(new Set(rankedCandidates.map((candidate) => candidate.document.title))),
      retrievedDocuments: Array.from(
        new Set(rankedCandidates.map((candidate) => candidate.document.title))
      ),
      retrievalStrategy: 'hybrid-semantic-keyword',
      estimatedTokens: rankedCandidates.reduce(
        (total, candidate) => total + candidate.chunk.estimatedTokens,
        0
      ),
      assembledContext,
    };
  }
}
