import { apiRequest } from './client';
import type {
  AdminAgent,
  AdminDashboardData,
  AdminResources,
  AdminSettings,
} from '../types/admin';

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  return apiRequest('/api/admin/dashboard');
}

export async function getAdminStatistics(): Promise<AdminDashboardData> {
  return apiRequest('/api/admin/statistics');
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
