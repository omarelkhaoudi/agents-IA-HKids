function cosineSimilarity(left, right) {
  const dotProduct = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0)) || 1;
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0)) || 1;

  return dotProduct / (leftMagnitude * rightMagnitude);
}

export class SemanticRetriever {
  constructor({ embeddingService }) {
    this.embeddingService = embeddingService;
  }

  retrieve(query, embeddingIndexItems, indexedDocuments, topK = 8) {
    const queryEmbedding = this.embeddingService.generateEmbedding(query);
    const documentMap = new Map(indexedDocuments.map((document) => [document.id, document]));

    return embeddingIndexItems
      .map((item) => ({
        chunk: {
          id: item.id,
          documentId: item.documentId,
          chunkNumber: item.chunkNumber,
          content: item.content,
          estimatedTokens: item.tokens,
          metadata: item.metadata,
        },
        document: documentMap.get(item.documentId),
        semanticScore: Math.max(0, cosineSimilarity(queryEmbedding, item.embedding)),
        cosineSimilarity: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .filter((candidate) => candidate.document)
      .sort((left, right) => right.semanticScore - left.semanticScore)
      .slice(0, topK);
  }
}
