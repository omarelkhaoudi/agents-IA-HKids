import { apiRequest } from './client';
import type { PromptDefinition, PromptPayload, PromptsApiResponse } from '../types/prompts';

export async function getPrompts(): Promise<PromptDefinition[]> {
  const data = await apiRequest<PromptsApiResponse>('/api/prompts');
  return data.items;
}

export async function createPrompt(payload: PromptPayload): Promise<PromptDefinition> {
  return apiRequest('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePrompt(
  promptId: string,
  payload: PromptPayload
): Promise<PromptDefinition> {
  return apiRequest(`/api/prompts/${promptId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePrompt(promptId: string): Promise<void> {
  await apiRequest(`/api/prompts/${promptId}`, {
    method: 'DELETE',
  });
}
