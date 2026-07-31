import { apiRequest, getAccessToken } from './client';
import type {
  AdminAgent,
  AdminDashboardData,
  AdminResources,
  AdminSettings,
  SecurityDashboard,
  SystemStatus,
} from '../types/admin';
import type { VectorIndexAction, VectorIndexJob, VectorKnowledgeStats } from '../types/knowledge-base';
import type {
  WorkflowAnalytics,
  WorkflowApprovalTask,
  WorkflowDashboard,
  WorkflowDefinition,
  WorkflowDefinitionShape,
  WorkflowSimulation,
  WorkflowTemplate,
} from '../types/workflow-governance';

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

export async function getAdminSecurityDashboard(): Promise<SecurityDashboard> {
  return apiRequest('/api/admin/security');
}

export async function getAdminWorkflowDashboard(
  days = 30
): Promise<WorkflowDashboard> {
  return apiRequest(`/api/admin/workflows?days=${encodeURIComponent(String(days))}`);
}

export async function getAdminWorkflowAnalytics(
  days = 30
): Promise<WorkflowAnalytics> {
  return apiRequest(`/api/admin/workflows/analytics?days=${encodeURIComponent(String(days))}`);
}

export async function getWorkflowDefinitions(): Promise<{ items: WorkflowDefinition[] }> {
  return apiRequest('/api/workflows/definitions?limit=100');
}

export async function getWorkflowTemplates(): Promise<{ items: WorkflowTemplate[] }> {
  return apiRequest('/api/workflows/templates');
}

export async function getWorkflowApprovalTasks(
  params: { status?: string; reviewer?: string } = {}
): Promise<{ items: WorkflowApprovalTask[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return apiRequest(`/api/workflows/approvals?${query.toString()}`);
}

export async function simulateWorkflow(
  payload: {
    workflowDefinitionId?: string;
    workflowDefinitionCode?: string;
    policyCode?: string;
    reviewers?: string[];
    definition?: WorkflowDefinitionShape;
  }
): Promise<WorkflowSimulation> {
  return apiRequest('/api/workflows/simulation', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createWorkflowDefinition(
  payload: WorkflowDefinitionShape & {
    name: string;
    code: string;
    category: string;
    status?: string;
    tags?: string[];
    owner?: string;
  }
): Promise<WorkflowDefinition> {
  return apiRequest('/api/workflows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function archiveWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function cloneWorkflowDefinition(id: string): Promise<WorkflowDefinition> {
  return apiRequest(`/api/workflows/${encodeURIComponent(id)}/clone`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function validateAdminSecrets(): Promise<SecurityDashboard['secretHealth']> {
  return apiRequest('/api/admin/security/secrets/validate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rotateAdminEncryptionKey(): Promise<{
  keyId: string;
  version: number;
  algorithm: string;
  rotatedAt: string;
}> {
  return apiRequest('/api/admin/security/encryption/rotate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getAdminVectorStats(): Promise<VectorKnowledgeStats> {
  return apiRequest('/api/admin/vector/stats');
}

export async function getAdminVectorJobs(
  params: { status?: string; limit?: number } = {}
): Promise<{ items: VectorIndexJob[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });
  return apiRequest(`/api/admin/vector/jobs?${query.toString()}`);
}

export async function reindexAdminVector(payload: VectorIndexAction = {}): Promise<VectorIndexJob> {
  return apiRequest('/api/admin/vector/reindex', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function retryFailedAdminVectorJobs(
  payload: VectorIndexAction = {}
): Promise<{ items: VectorIndexJob[]; retried: number }> {
  return apiRequest('/api/admin/vector/jobs/retry-failed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelAdminVectorJob(jobId: string): Promise<VectorIndexJob> {
  return apiRequest(`/api/admin/vector/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function clearAdminVectorCache(): Promise<{
  cleared: { retrievalCacheEntries: number; vectorIndexEntries: number; embeddingCacheEntries: number };
}> {
  return apiRequest('/api/admin/vector/cache/clear', {
    method: 'POST',
    body: JSON.stringify({}),
  });
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
