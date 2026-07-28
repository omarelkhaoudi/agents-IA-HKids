function buildChunkSignature(chunk) {
  return `${chunk.content}|${chunk.estimatedTokens}|${chunk.metadata.updatedDate}`;
}

export class EmbeddingIndex {
  constructor() {
    this.items = new Map();
  }

  insert(chunk, embedding) {
    const item = {
      id: chunk.id,
      documentId: chunk.documentId,
      embedding,
      metadata: chunk.metadata,
      tokens: chunk.estimatedTokens,
      content: chunk.content,
      chunkNumber: chunk.chunkNumber,
      signature: buildChunkSignature(chunk),
    };

    this.items.set(chunk.id, item);
    return item;
  }

  update(chunk, embedding) {
    return this.insert(chunk, embedding);
  }

  delete(chunkId) {
    this.items.delete(chunkId);
  }

  rebuild(chunks, embeddingService) {
    const activeChunkIds = new Set(chunks.map((chunk) => chunk.id));

    Array.from(this.items.keys()).forEach((chunkId) => {
      if (!activeChunkIds.has(chunkId)) {
        this.delete(chunkId);
      }
    });

    chunks.forEach((chunk) => {
      const signature = buildChunkSignature(chunk);
      const currentItem = this.items.get(chunk.id);

      if (currentItem && currentItem.signature === signature) {
        return;
      }

      const embedding = embeddingService.generateEmbedding(chunk.content);

      if (currentItem) {
        this.update(chunk, embedding);
      } else {
        this.insert(chunk, embedding);
      }
    });

    return this.toArray();
  }

  toArray() {
    return Array.from(this.items.values());
  }
}
