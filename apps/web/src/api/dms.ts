import { apiRequest } from './client';
import type { VectorIndexAction, VectorIndexJob, VectorKnowledgeStats } from '../types/knowledge-base';

interface EntityResult {
  id: string;
}

interface DmsUploadSession {
  id: string;
}

interface DmsUploadResult {
  duplicate?: boolean;
  matches?: EntityResult[];
  document?: EntityResult;
}

export async function getDmsBootstrap() {
  return apiRequest<Record<string, any>>('/api/dms/bootstrap');
}

export async function getDmsVectorStats(): Promise<VectorKnowledgeStats> {
  return apiRequest('/api/dms/vector/stats');
}

export async function searchDms(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return apiRequest<{ items: any[]; total: number }>(`/api/dms/search?${query.toString()}`);
}

export async function createDmsFolder(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/dms/folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDmsFolder(folderId: string, payload: Record<string, unknown>) {
  return apiRequest<EntityResult>(`/api/dms/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getDmsFolderBreadcrumb(folderId: string) {
  return apiRequest<{ items: any[] }>(`/api/dms/folders/${folderId}/breadcrumb`);
}

export async function uploadDmsDocument(payload: Record<string, unknown>) {
  return apiRequest<DmsUploadResult>('/api/dms/uploads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function startDmsUploadSession(payload: Record<string, unknown>) {
  return apiRequest<DmsUploadSession>('/api/dms/uploads/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDmsDocumentDetail(documentId: string) {
  return apiRequest<Record<string, any>>(`/api/dms/documents/${documentId}`);
}

export async function reindexDmsDocument(
  documentId: string,
  payload: VectorIndexAction = {}
): Promise<VectorIndexJob> {
  return apiRequest(`/api/dms/documents/${encodeURIComponent(documentId)}/reindex`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function moveDmsDocuments(documentIds: string[], folderId?: string | null) {
  return apiRequest<{ moved: number; items?: EntityResult[] }>('/api/dms/documents/move', {
    method: 'POST',
    body: JSON.stringify({ documentIds, folderId }),
  });
}

export async function runDmsWorkflow(
  documentId: string,
  action: 'submit' | 'approve' | 'publish' | 'corrections' | 'archive' | 'restore',
  comment = ''
) {
  return apiRequest<EntityResult>(`/api/dms/documents/${documentId}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function exportDmsMetadata(format: 'json' | 'csv' = 'json') {
  if (format === 'csv') {
    return apiRequest<string>('/api/dms/export?format=csv');
  }
  return apiRequest<Record<string, unknown>>('/api/dms/export?format=json');
}

export async function getDmsAudit() {
  return apiRequest<{ items: any[] }>('/api/dms/audit');
}
