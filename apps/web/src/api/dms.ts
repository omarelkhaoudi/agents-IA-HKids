import { apiRequest } from './client';

export async function getDmsBootstrap() {
  return apiRequest('/api/dms/bootstrap');
}

export async function searchDms(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return apiRequest<{ items: any[]; total: number }>(`/api/dms/search?${query.toString()}`);
}

export async function createDmsFolder(payload: Record<string, unknown>) {
  return apiRequest('/api/dms/folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDmsFolder(folderId: string, payload: Record<string, unknown>) {
  return apiRequest(`/api/dms/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getDmsFolderBreadcrumb(folderId: string) {
  return apiRequest<{ items: any[] }>(`/api/dms/folders/${folderId}/breadcrumb`);
}

export async function uploadDmsDocument(payload: Record<string, unknown>) {
  return apiRequest('/api/dms/uploads', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function startDmsUploadSession(payload: Record<string, unknown>) {
  return apiRequest('/api/dms/uploads/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDmsDocumentDetail(documentId: string) {
  return apiRequest(`/api/dms/documents/${documentId}`);
}

export async function moveDmsDocuments(documentIds: string[], folderId?: string | null) {
  return apiRequest('/api/dms/documents/move', {
    method: 'POST',
    body: JSON.stringify({ documentIds, folderId }),
  });
}

export async function runDmsWorkflow(
  documentId: string,
  action: 'submit' | 'approve' | 'publish' | 'corrections' | 'archive' | 'restore',
  comment = ''
) {
  return apiRequest(`/api/dms/documents/${documentId}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function exportDmsMetadata(format: 'json' | 'csv' = 'json') {
  if (format === 'csv') {
    return apiRequest<string>('/api/dms/export?format=csv');
  }
  return apiRequest('/api/dms/export?format=json');
}

export async function getDmsAudit() {
  return apiRequest<{ items: any[] }>('/api/dms/audit');
}
