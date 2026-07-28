import type { PromptDefinition, PromptPayload, PromptsApiResponse } from '../types/prompts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getPrompts(): Promise<PromptDefinition[]> {
  const response = await fetch(`${API_BASE_URL}/api/prompts`);
  const data = await parseResponse<PromptsApiResponse>(response);
  return data.items;
}

export async function createPrompt(payload: PromptPayload): Promise<PromptDefinition> {
  const response = await fetch(`${API_BASE_URL}/api/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<PromptDefinition>(response);
}

export async function updatePrompt(
  promptId: string,
  payload: PromptPayload
): Promise<PromptDefinition> {
  const response = await fetch(`${API_BASE_URL}/api/prompts/${promptId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<PromptDefinition>(response);
}

export async function deletePrompt(promptId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/prompts/${promptId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
