import { apiRequest } from './client';
import type {
  DocumentsApiResponse,
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
} from '../types/knowledge-base';

export async function getDocuments(): Promise<KnowledgeBaseDocument[]> {
  const data = await apiRequest<DocumentsApiResponse>('/api/documents');
  return data.items;
}

export async function createDocument(
  payload: KnowledgeBaseDocumentPayload
): Promise<KnowledgeBaseDocument> {
  return apiRequest('/api/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDocument(
  documentId: string,
  payload: KnowledgeBaseDocumentPayload
): Promise<KnowledgeBaseDocument> {
  return apiRequest(`/api/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiRequest(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });
}
