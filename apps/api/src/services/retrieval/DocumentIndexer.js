function estimateTokens(content) {
  return Math.max(1, Math.ceil(content.trim().length / 4));
}

export class DocumentIndexer {
  constructor({ documentChunker }) {
    this.documentChunker = documentChunker;
  }

  indexDocuments(documents, rawSources) {
    return documents
      .map((document) => {
        const rawSource = rawSources.find((source) => source.documentId === document.id);

        if (!rawSource) {
          return null;
        }

        const chunks = this.documentChunker.chunk(document, rawSource.content);

        return {
          ...document,
          chunkCount: chunks.length,
          estimatedTokenCount: estimateTokens(rawSource.content),
          priority: rawSource.priority || 1,
          chunks,
        };
      })
      .filter(Boolean);
  }
}
