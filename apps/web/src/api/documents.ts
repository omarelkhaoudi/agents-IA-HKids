import type {
  DocumentsApiResponse,
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
} from '../types/knowledge-base';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDocuments(): Promise<KnowledgeBaseDocument[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents`);
  const data = await parseResponse<DocumentsApiResponse>(response);
  return data.items;
}

export async function createDocument(
  payload: KnowledgeBaseDocumentPayload
): Promise<KnowledgeBaseDocument> {
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<KnowledgeBaseDocument>(response);
}

export async function updateDocument(
  documentId: string,
  payload: KnowledgeBaseDocumentPayload
): Promise<KnowledgeBaseDocument> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<KnowledgeBaseDocument>(response);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
