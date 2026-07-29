import { apiRequest } from './client';
import type {
  PromptAnalytics,
  PromptBootstrap,
  PromptDashboard,
  PromptDefinition,
  PromptLibrary,
  PromptLink,
  PromptPayload,
  PromptVersion,
} from '../types/prompts';

export async function getPromptPlatformBootstrap(): Promise<PromptBootstrap> {
  return apiRequest('/api/prompt-platform/bootstrap');
}

export async function getPromptPlatformDashboard(): Promise<PromptDashboard> {
  return apiRequest('/api/prompt-platform/dashboard');
}

export async function getPromptPlatformAnalytics(): Promise<PromptAnalytics> {
  return apiRequest('/api/prompt-platform/analytics');
}

export async function searchPromptPlatform(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return apiRequest<{ items: PromptDefinition[]; total: number }>(
    `/api/prompt-platform/search?${query.toString()}`
  );
}

export async function getPromptLibraries(): Promise<PromptLibrary[]> {
  const data = await apiRequest<{ items: PromptLibrary[] }>('/api/prompt-platform/libraries');
  return data.items;
}

export async function getPromptPlatformDetail(promptId: string) {
  return apiRequest<{
    prompt: PromptDefinition;
    versions: PromptVersion[];
    links: PromptLink[];
    events: Array<{ id: string; eventType: string; actor: string; summary: string; createdAt?: string }>;
    testRuns: Array<{
      id: string;
      outputText: string;
      latencyMs: number;
      promptTokens: number;
      completionTokens: number;
      model: string;
      assembledPrompt: string;
      retrievedKnowledge: string;
      createdAt?: string;
    }>;
    variables: { required: string[]; knownSuggestions: string[] };
    timeline: Array<{ type: string; at?: string; label: string; actor: string }>;
  }>(`/api/prompt-platform/prompts/${promptId}`);
}

export async function submitPromptReview(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/submit-review`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function approvePromptChange(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function publishPromptChange(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function requestPromptCorrections(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/request-corrections`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function archivePromptPlatform(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function restorePromptPlatform(promptId: string, comment = '') {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
}

export async function duplicatePromptPlatform(promptId: string) {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function restorePromptVersion(promptId: string, version: number) {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/versions/${version}/restore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function addPromptLink(
  promptId: string,
  payload: { linkedType: PromptLink['linkedType']; linkedId: string; label?: string }
) {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function runPromptPlayground(
  promptId: string,
  payload: {
    variables?: Record<string, string>;
    userMessage?: string;
    includeKnowledge?: boolean;
    dryRun?: boolean;
  }
) {
  return apiRequest(`/api/prompt-platform/prompts/${promptId}/playground`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createPromptPlatform(payload: PromptPayload): Promise<PromptDefinition> {
  return apiRequest('/api/prompt-platform/prompts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
