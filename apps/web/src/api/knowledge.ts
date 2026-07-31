import { apiRequest } from './client';
import type {
  KnowledgeAnalytics,
  KnowledgeBaseDocument,
  KnowledgeBaseDocumentPayload,
  KnowledgeBootstrap,
  KnowledgeCollection,
  KnowledgeDashboard,
  KnowledgeLink,
  KnowledgeTag,
  KnowledgeVersion,
  VectorIndexAction,
  VectorIndexJob,
  VectorKnowledgeStats,
} from '../types/knowledge-base';

export async function getKnowledgeBootstrap(): Promise<KnowledgeBootstrap> {
  return apiRequest('/api/knowledge/bootstrap');
}

export async function getKnowledgeDashboard(): Promise<KnowledgeDashboard> {
  return apiRequest('/api/knowledge/dashboard');
}

export async function getKnowledgeAnalytics(): Promise<KnowledgeAnalytics> {
  return apiRequest('/api/knowledge/analytics');
}

export async function getKnowledgeVectorStats(): Promise<VectorKnowledgeStats> {
  return apiRequest('/api/knowledge/vector/stats');
}

export async function getKnowledgeIndexJobs(
  params: { status?: string; limit?: number } = {}
): Promise<{ items: VectorIndexJob[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  return apiRequest(`/api/knowledge/index/jobs?${query.toString()}`);
}

export async function reindexKnowledge(payload: VectorIndexAction = {}): Promise<VectorIndexJob> {
  return apiRequest('/api/knowledge/index/reindex', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reindexKnowledgeDocument(
  documentId: string,
  payload: VectorIndexAction = {}
): Promise<VectorIndexJob> {
  return apiRequest(`/api/knowledge/documents/${encodeURIComponent(documentId)}/reindex`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reindexKnowledgeCollection(
  collectionId: string,
  payload: VectorIndexAction = {}
): Promise<VectorIndexJob> {
  return apiRequest(`/api/knowledge/collections/${encodeURIComponent(collectionId)}/reindex`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function retryFailedKnowledgeIndexJobs(
  payload: VectorIndexAction = {}
): Promise<{ items: VectorIndexJob[]; retried: number }> {
  return apiRequest('/api/knowledge/index/jobs/retry-failed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelKnowledgeIndexJob(jobId: string): Promise<VectorIndexJob> {
  return apiRequest(`/api/knowledge/index/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function clearKnowledgeVectorCache(): Promise<{
  cleared: { retrievalCacheEntries: number; vectorIndexEntries: number; embeddingCacheEntries: number };
}> {
  return apiRequest('/api/knowledge/vector/cache/clear', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function searchKnowledge(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  return apiRequest<{ items: KnowledgeBaseDocument[]; total: number }>(
    `/api/knowledge/search?${query.toString()}`
  );
}

export async function getKnowledgeCollections(): Promise<KnowledgeCollection[]> {
  const data = await apiRequest<{ items: KnowledgeCollection[] }>('/api/knowledge/collections');
  return data.items;
}

export async function createKnowledgeCollection(
  payload: Partial<KnowledgeCollection> & { name: string }
): Promise<KnowledgeCollection> {
  return apiRequest('/api/knowledge/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getKnowledgeDocumentDetail(documentId: string) {
  return apiRequest<{
    document: KnowledgeBaseDocument;
    versions: KnowledgeVersion[];
    links: KnowledgeLink[];
    events: Array<{
      id: string;
      eventType: string;
      actor: string;
      summary: string;
      createdAt?: string;
    }>;
    timeline: Array<{ type: string; at?: string; label: string; actor: string }>;
  }>(`/api/knowledge/documents/${documentId}`);
}

export async function createKnowledgeDocument(
  payload: KnowledgeBaseDocumentPayload
): Promise<KnowledgeBaseDocument> {
  return apiRequest('/api/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateKnowledgeDocument(
  documentId: string,
  payload: Partial<KnowledgeBaseDocumentPayload>
): Promise<KnowledgeBaseDocument> {
  return apiRequest(`/api/knowledge/documents/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeDocument(documentId: string): Promise<void> {
  await apiRequest(`/api/knowledge/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export async function submitKnowledgeReview(documentId: string, comment = '') {
  return apiRequest(`/api/knowledge/documents/${documentId}/submit-review`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function publishKnowledgeDocument(documentId: string, comment = '') {
  return apiRequest(`/api/knowledge/documents/${documentId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function requestKnowledgeCorrections(documentId: string, comment = '') {
  return apiRequest(`/api/knowledge/documents/${documentId}/request-corrections`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function archiveKnowledgeDocument(documentId: string, comment = '') {
  return apiRequest(`/api/knowledge/documents/${documentId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function restoreKnowledgeVersion(documentId: string, version: number) {
  return apiRequest(`/api/knowledge/documents/${documentId}/versions/${version}/restore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function duplicateKnowledgeVersion(documentId: string, version: number) {
  return apiRequest(`/api/knowledge/documents/${documentId}/versions/${version}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function addKnowledgeLink(
  documentId: string,
  payload: { linkedType: KnowledgeLink['linkedType']; linkedId: string; label?: string }
) {
  return apiRequest(`/api/knowledge/documents/${documentId}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getKnowledgeTags(): Promise<KnowledgeTag[]> {
  const data = await apiRequest<{ items: KnowledgeTag[] }>('/api/knowledge/tags');
  return data.items;
}

export async function mergeKnowledgeTags(sourceName: string, targetName: string) {
  return apiRequest('/api/knowledge/tags/merge', {
    method: 'POST',
    body: JSON.stringify({ sourceName, targetName }),
  });
}

export async function bulkKnowledgeAction(payload: {
  action: 'archive' | 'delete' | 'move' | 'tag' | 'duplicate' | 'merge';
  documentIds: string[];
  collectionId?: string;
  tags?: string[];
}) {
  return apiRequest('/api/knowledge/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportKnowledgeMetadata() {
  return apiRequest<{ count: number; items: unknown[] }>('/api/knowledge/export');
}

export async function importKnowledgeMetadata(items: unknown[]) {
  return apiRequest('/api/knowledge/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
