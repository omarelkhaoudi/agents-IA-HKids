export class HybridRetriever {
  constructor({ keywordRetriever, semanticRetriever }) {
    this.keywordRetriever = keywordRetriever;
    this.semanticRetriever = semanticRetriever;
  }

  retrieve(query, indexedDocuments, embeddingIndexItems, topK = 10) {
    const keywordCandidates = this.keywordRetriever.retrieve(query, indexedDocuments);
    const semanticCandidates = this.semanticRetriever.retrieve(
      query,
      embeddingIndexItems,
      indexedDocuments,
      topK
    );

    const mergedCandidates = new Map();

    keywordCandidates.forEach((candidate) => {
      mergedCandidates.set(candidate.chunk.id, {
        chunk: candidate.chunk,
        document: candidate.document,
        matchSignals: candidate.matchSignals,
        keywordScore: candidate.baseScore,
        semanticScore: 0,
        cosineSimilarity: 0,
      });
    });

    semanticCandidates.forEach((candidate) => {
      const existing = mergedCandidates.get(candidate.chunk.id);

      if (existing) {
        mergedCandidates.set(candidate.chunk.id, {
          ...existing,
          semanticScore: candidate.semanticScore,
          cosineSimilarity: candidate.cosineSimilarity,
        });
        return;
      }

      mergedCandidates.set(candidate.chunk.id, {
        chunk: candidate.chunk,
        document: candidate.document,
        matchSignals: {
          contentMatches: 0,
          titleMatches: 0,
          tagMatches: 0,
          categoryMatches: 0,
          metadataMatches: 0,
        },
        keywordScore: 0,
        semanticScore: candidate.semanticScore,
        cosineSimilarity: candidate.cosineSimilarity,
      });
    });

    return Array.from(mergedCandidates.values());
  }
}
