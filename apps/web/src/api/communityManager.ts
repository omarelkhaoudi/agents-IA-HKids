import { apiRequest, getAccessToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface EntityResult {
  id: string;
}

interface CommunityManagerBootstrap {
  posts?: Array<EntityResult & Record<string, unknown>>;
  campaigns?: Array<Record<string, unknown>>;
  library?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
  guidelines?: Record<string, unknown>;
  prompts?: Array<Record<string, unknown>>;
  knowledgeDocuments?: Array<Record<string, unknown>>;
  platforms?: string[];
  tones?: string[];
  contentTypes?: string[];
}

interface CommunityManagerSearchResponse {
  items: Array<EntityResult & { type: string; title: string }>;
}

interface CommunityManagerGenerationResponse {
  post: EntityResult;
}

export async function getCommunityManagerBootstrap() {
  return apiRequest<CommunityManagerBootstrap>('/api/community-manager/bootstrap');
}

export async function getCommunityManagerDashboard() {
  return apiRequest<Record<string, unknown>>('/api/community-manager/dashboard');
}

export async function searchCommunityManager(query: string) {
  return apiRequest<CommunityManagerSearchResponse>(
    `/api/community-manager/search?q=${encodeURIComponent(query)}`
  );
}

export async function getHashtagSuggestions(params: {
  theme?: string;
  audience?: string;
  platform?: string;
}) {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiRequest<{ items: string[] }>(`/api/community-manager/hashtags?${query}`);
}

export async function listCmCampaigns() {
  return apiRequest<{ items: Array<Record<string, unknown>> }>('/api/community-manager/campaigns');
}

export async function createCmCampaign(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/community-manager/campaigns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCmCampaign(id: string, payload: Record<string, unknown>) {
  return apiRequest<EntityResult>(`/api/community-manager/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listCmPosts(filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters).toString();
  return apiRequest<{ items: Array<Record<string, unknown>> }>(
    `/api/community-manager/posts${query ? `?${query}` : ''}`
  );
}

export async function createCmPost(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/community-manager/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCmPost(id: string, payload: Record<string, unknown>) {
  return apiRequest<EntityResult>(`/api/community-manager/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function duplicateCmPost(id: string) {
  return apiRequest<EntityResult>(`/api/community-manager/posts/${id}/duplicate`, { method: 'POST' });
}

export async function submitCmPostReview(id: string) {
  return apiRequest<EntityResult>(`/api/community-manager/posts/${id}/submit-review`, { method: 'POST' });
}

export async function approveCmPost(id: string) {
  return apiRequest<EntityResult>(`/api/community-manager/posts/${id}/approve`, { method: 'POST' });
}

export async function rejectCmPost(id: string) {
  return apiRequest<EntityResult>(`/api/community-manager/posts/${id}/reject`, { method: 'POST' });
}

export async function generateCmContent(payload: Record<string, unknown>) {
  return apiRequest<CommunityManagerGenerationResponse>('/api/community-manager/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCmGuidelines(payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/api/community-manager/guidelines', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createCmLibraryItem(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/community-manager/library', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportCmPost(id: string, format: 'markdown' | 'html' | 'json' = 'markdown') {
  const response = await fetch(
    `${API_BASE_URL}/api/community-manager/posts/${id}/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Unable to export content.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `content.${format === 'markdown' ? 'md' : format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
