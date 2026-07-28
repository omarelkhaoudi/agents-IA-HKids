import type {
  AdminAgent,
  AdminDashboardData,
  AdminResources,
  AdminSettings,
} from '../types/admin';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`);
  return parseResponse(response);
}

export async function getAdminStatistics(): Promise<AdminDashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/admin/statistics`);
  return parseResponse(response);
}

export async function getAdminAgents(): Promise<{ items: AdminAgent[]; resources: AdminResources }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/agents`);
  return parseResponse(response);
}

export async function createAdminAgent(payload: Partial<AdminAgent>): Promise<AdminAgent> {
  const response = await fetch(`${API_BASE_URL}/api/admin/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function updateAdminAgent(
  id: string,
  payload: Partial<AdminAgent>
): Promise<AdminAgent> {
  const response = await fetch(`${API_BASE_URL}/api/admin/agents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function deleteAdminAgent(id: string): Promise<{ deleted: boolean; id: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/agents/${id}`, {
    method: 'DELETE',
  });
  return parseResponse(response);
}

export async function getAdminSettings(): Promise<{ settings: AdminSettings }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/settings`);
  return parseResponse(response);
}

export async function updateAdminSettings(
  settings: AdminSettings
): Promise<{ settings: AdminSettings }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings }),
  });
  return parseResponse(response);
}
