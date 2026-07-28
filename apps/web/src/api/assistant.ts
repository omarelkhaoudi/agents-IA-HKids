import type { RetrievalSearchResponse } from '../types/retrieval';
import type { GeneratedDocumentRecord } from '../types/generated-documents';
import type { FeedbackDashboardData } from '../types/feedback';
import type { WorkflowData } from '../types/workflow';
import type { AiModelInfo, AiProviderInfo, AiStatistics, AiUsageRecord } from '../types/ai-gateway';
import type {
  AssistantBootstrapResponse,
  AssistantContext,
  AssistantSession,
} from '../types/assistant-runtime';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(errorBody.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getAssistantBootstrap(): Promise<AssistantBootstrapResponse> {
  const response = await fetch(`${API_BASE_URL}/api/assistant/bootstrap`);
  return parseResponse<AssistantBootstrapResponse>(response);
}

export async function createConversationSession(payload: {
  title: string;
  agentCode: string;
  selectedPromptId: string;
  selectedDocumentIds: string[];
  currentContext: AssistantContext;
  model: string;
  provider: string;
}): Promise<AssistantSession> {
  const response = await fetch(`${API_BASE_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<AssistantSession>(response);
}

export async function listConversationSessions(agentCode?: string): Promise<AssistantSession[]> {
  const query = agentCode ? `?agentCode=${encodeURIComponent(agentCode)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/conversations${query}`);
  const data = await parseResponse<{ items: AssistantSession[] }>(response);
  return data.items;
}

export async function getConversationSession(sessionId: string): Promise<AssistantSession> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${sessionId}`);
  return parseResponse<AssistantSession>(response);
}

export async function sendAssistantMessage(payload: {
  sessionId: string;
  provider: string;
  model: string;
  agentCode: string;
  selectedPromptId: string;
  selectedDocumentIds: string[];
  currentContext: AssistantContext;
  message: string;
}): Promise<{
  session: AssistantSession;
  assistantMessage: AssistantSession['messages'][number];
  requestPreview: {
    provider: string;
    model: string;
    agentCode: string;
    assembledPrompt: string;
    retrieval: RetrievalSearchResponse;
  };
}> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${payload.sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: payload.provider,
      model: payload.model,
      agentCode: payload.agentCode,
      selectedPromptId: payload.selectedPromptId,
      selectedDocumentIds: payload.selectedDocumentIds,
      currentContext: payload.currentContext,
      message: payload.message,
    }),
  });

  return parseResponse<{
    session: AssistantSession;
    assistantMessage: AssistantSession['messages'][number];
    requestPreview: {
      provider: string;
      model: string;
      agentCode: string;
      assembledPrompt: string;
      retrieval: RetrievalSearchResponse;
    };
  }>(response);
}

export async function searchRetrievalContext(question: string): Promise<RetrievalSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/retrieval/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  return parseResponse<RetrievalSearchResponse>(response);
}

export async function generateConversationDocument(payload: {
  sessionId: string;
  assistantResponse: string;
  documentType: string;
  variables: Record<string, string>;
  companyProfile: {
    companyName: string;
    companyAddress: string;
    contactName: string;
  };
  customerProfile: {
    clientName: string;
    address: string;
  };
  language: string;
}): Promise<GeneratedDocumentRecord> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse<GeneratedDocumentRecord>(response);
}

export async function updateConversationDocument(payload: {
  sessionId: string;
  documentId: string;
  variables: Record<string, string>;
  companyProfile: {
    companyName: string;
    companyAddress: string;
    contactName: string;
  };
  customerProfile: {
    clientName: string;
    address: string;
  };
  language: string;
}): Promise<GeneratedDocumentRecord> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  return parseResponse<GeneratedDocumentRecord>(response);
}

export async function approveConversationDocument(payload: {
  sessionId: string;
  documentId: string;
  actor?: string;
  comment?: string;
}): Promise<GeneratedDocumentRecord> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actor: payload.actor,
        comment: payload.comment,
      }),
    }
  );

  return parseResponse<GeneratedDocumentRecord>(response);
}

export async function downloadConversationDocument(payload: {
  sessionId: string;
  documentId: string;
  format: string;
}): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/export?format=${payload.format}`
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Export failed.' }));
    throw new Error(errorBody.message || 'Export failed.');
  }

  return response.blob();
}

export async function getDocumentWorkflow(payload: {
  sessionId: string;
  documentId: string;
}): Promise<WorkflowData> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/workflow`
  );

  return parseResponse<WorkflowData>(response);
}

export async function transitionDocumentWorkflow(payload: {
  sessionId: string;
  documentId: string;
  nextState: string;
  actor?: string;
  comment?: string;
}): Promise<WorkflowData> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/workflow/transition`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nextState: payload.nextState,
        actor: payload.actor,
        comment: payload.comment,
      }),
    }
  );

  return parseResponse<WorkflowData>(response);
}

export async function submitDocumentFeedback(payload: {
  conversationId: string;
  messageId?: string;
  documentId: string;
  agentCode: string;
  originalText: string;
  correctedText: string;
  feedbackType: string;
  rating: number;
  comment: string;
}) {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function getFeedbackDashboard(agentCode?: string): Promise<FeedbackDashboardData> {
  const query = agentCode ? `?agentCode=${encodeURIComponent(agentCode)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/feedback/dashboard${query}`);
  return parseResponse<FeedbackDashboardData>(response);
}

export async function approveFeedbackPattern(patternId: string) {
  const response = await fetch(`${API_BASE_URL}/api/feedback/patterns/${patternId}/approve`, {
    method: 'POST',
  });

  return parseResponse(response);
}

export async function approvePromptImprovement(improvementId: string) {
  const response = await fetch(`${API_BASE_URL}/api/feedback/improvements/${improvementId}/approve`, {
    method: 'POST',
  });

  return parseResponse(response);
}

export async function getAiProviders(): Promise<{
  items: AiProviderInfo[];
  current: AiStatistics['current'];
}> {
  const response = await fetch(`${API_BASE_URL}/api/ai/providers`);
  return parseResponse(response);
}

export async function getAiModels(provider?: string): Promise<{
  items: AiModelInfo[];
  current: AiStatistics['current'];
}> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/ai/models${query}`);
  return parseResponse(response);
}

export async function getAiUsage(filters: {
  provider?: string;
  model?: string;
  date?: string;
  agentCode?: string;
} = {}): Promise<{ items: AiUsageRecord[] }> {
  const params = new URLSearchParams();
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.model) params.set('model', filters.model);
  if (filters.date) params.set('date', filters.date);
  if (filters.agentCode) params.set('agentCode', filters.agentCode);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/ai/usage${query}`);
  return parseResponse(response);
}

export async function getAiStatistics(): Promise<AiStatistics> {
  const response = await fetch(`${API_BASE_URL}/api/ai/statistics`);
  return parseResponse(response);
}