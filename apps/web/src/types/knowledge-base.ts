export type SupportedDocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'CSV';

export type KnowledgeBaseStatus = 'active' | 'review' | 'archived';

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
}

export interface DocumentFilters {
  search: string;
  category: string;
  status: string;
  fileType: string;
}

export interface DocumentsApiResponse {
  items: KnowledgeBaseDocument[];
}
