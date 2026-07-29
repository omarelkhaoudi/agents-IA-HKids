const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SetupStatus {
  requiresSetup: boolean;
  setupCompleted: boolean;
  hasAdministrator: boolean;
  anthropicConfigured: boolean;
  defaultProvider: string;
  defaultModel: string;
  companyName: string;
}

export interface SetupPayload {
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  administratorName: string;
  administratorEmail: string;
  administratorPassword: string;
  anthropicApiKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  language?: string;
  timezone?: string;
  currency?: string;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const response = await fetch(`${API_BASE_URL}/api/setup/status`);
  if (!response.ok) {
    throw new Error('Unable to load setup status.');
  }
  return response.json();
}

export async function completeSetup(payload: SetupPayload): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || 'Unable to complete setup.');
  }
  return body;
}
