export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkNumber: number;
  content: string;
  estimatedTokens: number;
  metadata: {
    title: string;
    category: string;
    tags: string[];
    type: string;
    author: string;
    createdDate: string;
    updatedDate: string;
  };
  cosineSimilarity: number;
  semanticScore: number;
  keywordScore: number;
  finalScore: number;
  rankingScore: number;
}

export interface RetrievalSearchResponse {
  question: string;
  retrievedChunks: RetrievedChunk[];
  documentNames: string[];
  retrievedDocuments: string[];
  retrievalStrategy: string;
  estimatedTokens: number;
  assembledContext: string;
}
