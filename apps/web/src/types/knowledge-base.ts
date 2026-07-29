export type SupportedDocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'CSV' | 'MD' | 'HTML';

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
