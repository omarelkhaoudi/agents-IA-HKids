export type SupportedDocumentType =
  | 'PDF'
  | 'DOCX'
  | 'XLSX'
  | 'PPTX'
  | 'TXT'
  | 'CSV'
  | 'MD'
  | 'HTML';

export type KnowledgeBaseStatus = 'draft' | 'active' | 'review' | 'archived' | 'deleted';

export interface KnowledgeBaseDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  createdDate: string;
  updatedDate: string;
  size: string;
  status: KnowledgeBaseStatus;
  author: string;
  fileType: SupportedDocumentType;
  sourceFileName: string;
  content?: string;
  priority?: number;
  collectionId?: string | null;
  language?: string;
  owner?: string;
  version?: number;
  reviewDate?: string;
  expirationDate?: string;
  notes?: string;
  viewCount?: number;
  aiUsageCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  feedbackScore?: number;
  qualityScore?: number;
  completenessScore?: number;
  lastReviewedAt?: string | null;
  lastReviewedBy?: string;
  missingMetadata?: string[];
  processingStatus?: string;
  processingError?: string;
  indexedAt?: string | null;
  indexVersion?: number;
  embeddingStatus?: string;
  embeddingProvider?: string;
  embeddingModel?: string;
  chunkCount?: number;
  averageChunkTokens?: number;
  summary?: string;
  keywords?: string[];
  detectedLanguage?: string;
  contentHash?: string;
  duplicateOf?: string | null;
  lastIndexError?: string;
  retrievalSuccessCount?: number;
  retrievalFailureCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBaseDocumentPayload {
  title: string;
  category: string;
  description: string;
  tags: string[];
  status: KnowledgeBaseStatus;
  author: string;
  fileType: SupportedDocumentType;
  size: string;
  sourceFileName: string;
  owner?: string;
  language?: string;
  collectionId?: string | null;
  priority?: number;
  reviewDate?: string;
  expirationDate?: string;
  notes?: string;
  content?: string;
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  owner: string;
  status: string;
  priority: number;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeTag {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
  usageCount: number;
}

export interface KnowledgeLink {
  id: string;
  documentId: string;
  linkedType: 'prompt' | 'workflow' | 'agent' | 'template' | 'document';
  linkedId: string;
  label: string;
  createdAt?: string;
}

export interface KnowledgeVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  description: string;
  content: string;
  tags: string[];
  author: string;
  changeSummary: string;
  createdAt?: string;
}

export interface KnowledgeEvent {
  id: string;
  documentId: string;
  eventType: string;
  actor: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface KnowledgeDashboard {
  totalDocuments: number;
  collections: number;
  categories: number;
  tags: number;
  pendingReviews: number;
  published: number;
  drafts: number;
  archived: number;
  mostViewed: KnowledgeBaseDocument[];
  mostUsedByAi: KnowledgeBaseDocument[];
  recentlyUpdated: KnowledgeBaseDocument[];
  recentlyUploaded: KnowledgeBaseDocument[];
  knowledgeQualityScore: number;
}

export interface KnowledgeAnalytics {
  mostViewed: KnowledgeBaseDocument[];
  mostRetrievedByAi: KnowledgeBaseDocument[];
  unusedDocuments: KnowledgeBaseDocument[];
  knowledgeFreshness: { fresh: number; stale: number };
  collectionsGrowth: Array<{ id: string; name: string; documents: number }>;
  tagStatistics: Array<{ name: string; count: number }>;
  documentQuality: { average: number; incomplete: number };
  reviewBacklog: number;
  managedTags: number;
}

export interface KnowledgeBootstrap {
  documents: KnowledgeBaseDocument[];
  collections: KnowledgeCollection[];
  tags: KnowledgeTag[];
  dashboard: KnowledgeDashboard;
  analytics: KnowledgeAnalytics;
  reviewQueue: KnowledgeBaseDocument[];
}

export interface DocumentFilters {
  search: string;
  category: string;
  status: string;
  fileType: string;
  collectionId?: string;
  owner?: string;
  language?: string;
  tag?: string;
  sort?: string;
}

export interface DocumentsApiResponse {
  items: KnowledgeBaseDocument[];
}

export interface VectorEmbeddingProviderInfo {
  provider: string;
  model: string;
  dimensions: number;
  batchSize: number;
  remote: boolean;
  cacheSize: number;
  stats: {
    requests: number;
    cacheHits: number;
    failures: number;
    totalLatencyMs: number;
    lastError: string;
    averageLatencyMs: number;
    cacheHitRatio: number;
  };
}

export interface VectorKnowledgeStats {
  documentsIndexed: number;
  chunks: number;
  embeddings: number;
  averageChunkSize: number;
  coverage: number;
  missingEmbeddings: number;
  failedIndexing: number;
  duplicates: number;
  staleKnowledge: number;
  retrievalLatency: number;
  retrievalSuccess: number;
  retrievalFailures: number;
  cacheHitRatio: number;
  embeddingLatency: number;
  queueSize: number;
  provider: string;
  model: string;
  dimensions: number;
  embeddingProvider?: VectorEmbeddingProviderInfo;
  cache?: {
    retrievalEntries: number;
    vectorIndexEntries: number;
    embeddingEntries: number;
  };
  jobs?: Record<string, number>;
  latestRetrieval?: {
    at: string;
    agentCode: string;
    topK: number;
    chunks: number;
    semanticTopScore: number;
    status: string;
  } | null;
}

export interface VectorIndexJob {
  id: string;
  scope: 'document' | 'collection' | 'all' | 'cache' | string;
  targetId: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  provider: string;
  model: string;
  totalDocuments: number;
  totalChunks: number;
  processedDocuments: number;
  processedChunks: number;
  failedDocuments: number;
  failedChunks: number;
  errorMessage: string;
  actor: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VectorIndexAction {
  scope?: 'document' | 'collection' | 'all' | 'cache';
  targetId?: string | null;
  force?: boolean;
  background?: boolean;
  actor?: string;
}
