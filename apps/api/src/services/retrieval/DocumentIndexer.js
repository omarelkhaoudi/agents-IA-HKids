import { DocumentIngestionService } from './DocumentIngestionService.js';
import { estimateTokens } from './DocumentChunker.js';

export class DocumentIndexer {
  constructor({ documentChunker, documentIngestionService = new DocumentIngestionService() }) {
    this.documentChunker = documentChunker;
    this.documentIngestionService = documentIngestionService;
  }

  indexDocuments(documents, rawSources) {
    const seenContentHashes = new Map();

    return documents
      .map((document) => {
        const rawSource = rawSources.find((source) => source.documentId === document.id);

        if (!rawSource) {
          return null;
        }

        const ingestion = this.documentIngestionService.ingestDocument(document, rawSource);
        const indexedDocument = {
          ...document,
          fileType: ingestion.fileType || document.fileType,
          content: ingestion.content || rawSource.content || document.content || '',
          contentHash: ingestion.contentHash || document.contentHash || '',
          detectedLanguage: ingestion.language || document.detectedLanguage || document.language,
          keywords: ingestion.keywords || document.keywords || document.tags || [],
          summary: ingestion.summary || document.summary || document.description || '',
          processingStatus: ingestion.processingStatus,
          processingError: ingestion.errors?.join('; ') || '',
          qualityScore: ingestion.qualityScore || document.qualityScore || 0,
          duplicateOf: null,
        };

        if (indexedDocument.contentHash) {
          indexedDocument.duplicateOf = seenContentHashes.get(indexedDocument.contentHash) || null;
          if (!indexedDocument.duplicateOf) {
            seenContentHashes.set(indexedDocument.contentHash, indexedDocument.id);
          }
        }

        const chunks = this.documentChunker.chunk(
          indexedDocument,
          indexedDocument.content,
          ingestion
        );

        return {
          ...indexedDocument,
          chunkCount: chunks.length,
          estimatedTokenCount: estimateTokens(indexedDocument.content),
          priority: rawSource.priority || 1,
          averageChunkTokens: chunks.length
            ? Number(
                (
                  chunks.reduce((total, chunk) => total + chunk.estimatedTokens, 0) / chunks.length
                ).toFixed(1)
              )
            : 0,
          sections: ingestion.sections || [],
          chunks,
        };
      })
      .filter(Boolean);
  }
}
