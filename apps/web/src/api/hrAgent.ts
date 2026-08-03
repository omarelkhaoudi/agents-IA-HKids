import { apiRequest, getAccessToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface EntityResult {
  id: string;
}

interface HrGenerationResponse {
  document: EntityResult;
}

interface HrSearchResponse {
  items: Array<EntityResult & { type: string; title: string }>;
}

export async function getHrAgentBootstrap() {
  return apiRequest<Record<string, any>>('/api/hr-agent/bootstrap');
}

export async function searchHrAgent(query: string) {
  return apiRequest<HrSearchResponse>(`/api/hr-agent/search?q=${encodeURIComponent(query)}`);
}

export async function createHrEmployee(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/hr-agent/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createHrCandidate(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/hr-agent/candidates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateHrCandidate(id: string, payload: Record<string, unknown>) {
  return apiRequest<EntityResult>(`/api/hr-agent/candidates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createHrAbsence(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/hr-agent/absences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateHrDocument(payload: Record<string, unknown>) {
  return apiRequest<HrGenerationResponse>('/api/hr-agent/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateHrJobDescription(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/hr-agent/generate-job-description', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recommendHrLeave(payload: Record<string, unknown>) {
  return apiRequest<EntityResult>('/api/hr-agent/leave-requests/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function decideHrLeave(id: string, decision: 'approved' | 'rejected') {
  return apiRequest<EntityResult>(`/api/hr-agent/leave-requests/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
}

export async function submitHrDocumentReview(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/documents/${id}/submit-review`, { method: 'POST' });
}

export async function approveHrDocument(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/documents/${id}/approve`, { method: 'POST' });
}

export async function rejectHrDocument(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/documents/${id}/reject`, { method: 'POST' });
}

export async function submitHrJobReview(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/job-descriptions/${id}/submit-review`, { method: 'POST' });
}

export async function approveHrJob(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/job-descriptions/${id}/approve`, { method: 'POST' });
}

export async function rejectHrJob(id: string) {
  return apiRequest<EntityResult>(`/api/hr-agent/job-descriptions/${id}/reject`, { method: 'POST' });
}

export async function exportHrDocument(
  id: string,
  format: 'markdown' | 'html' | 'csv' = 'markdown'
) {
  const response = await fetch(
    `${API_BASE_URL}/api/hr-agent/documents/${id}/export?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Unable to export document.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `hr-document.${format === 'markdown' ? 'md' : format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
