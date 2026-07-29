import { apiRequest, getAccessToken } from './client';
import type {
  AdminAgent,
  AdminDashboardData,
  AdminResources,
  AdminSettings,
  SystemStatus,
} from '../types/admin';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiRequest('/api/admin/dashboard');
}

export async function getAdminStatistics(): Promise<AdminDashboardData> {
  return apiRequest('/api/admin/statistics');
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return apiRequest('/api/admin/system-status');
}

export async function downloadAdminExport(
  type: 'ai-usage' | 'feedback' | 'statistics' | 'generated-documents',
  format: 'json' | 'csv' = 'json'
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/exports/${type}?format=${format}`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Unable to export data.');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `${type}.${format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getAdminAgents(): Promise<{ items: AdminAgent[]; resources: AdminResources }> {
  return apiRequest('/api/admin/agents');
}

export async function createAdminAgent(payload: Partial<AdminAgent>): Promise<AdminAgent> {
  return apiRequest('/api/admin/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminAgent(
  id: string,
  payload: Partial<AdminAgent>
): Promise<AdminAgent> {
  return apiRequest(`/api/admin/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminAgent(id: string): Promise<{ deleted: boolean; id: string }> {
  return apiRequest(`/api/admin/agents/${id}`, {
    method: 'DELETE',
  });
}

export async function getAdminSettings(): Promise<{ settings: AdminSettings }> {
  return apiRequest('/api/admin/settings');
}

export async function updateAdminSettings(
  settings: AdminSettings
): Promise<{ settings: AdminSettings }> {
  return apiRequest('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}
