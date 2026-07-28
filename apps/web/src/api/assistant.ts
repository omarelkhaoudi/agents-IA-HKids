import { apiRequest, apiRequestBlob } from './client';
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

export async function getAssistantBootstrap(): Promise<AssistantBootstrapResponse> {
  return apiRequest('/api/assistant/bootstrap');
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
  return apiRequest('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listConversationSessions(agentCode?: string): Promise<AssistantSession[]> {
  const query = agentCode ? `?agentCode=${encodeURIComponent(agentCode)}` : '';
  const data = await apiRequest<{ items: AssistantSession[] }>(`/api/conversations${query}`);
  return data.items;
}

export async function getConversationSession(sessionId: string): Promise<AssistantSession> {
  return apiRequest(`/api/conversations/${sessionId}`);
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
  return apiRequest(`/api/conversations/${payload.sessionId}/messages`, {
    method: 'POST',
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
}

export async function searchRetrievalContext(question: string): Promise<RetrievalSearchResponse> {
  return apiRequest('/api/retrieval/search', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
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
  return apiRequest(`/api/conversations/${payload.sessionId}/generated-documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  return apiRequest(
    `/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

export async function approveConversationDocument(payload: {
  sessionId: string;
  documentId: string;
  actor?: string;
  comment?: string;
}): Promise<GeneratedDocumentRecord> {
  return apiRequest(
    `/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({
        actor: payload.actor,
        comment: payload.comment,
      }),
    }
  );
}

export async function downloadConversationDocument(payload: {
  sessionId: string;
  documentId: string;
  format: string;
}): Promise<Blob> {
  return apiRequestBlob(
    `/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/export?format=${payload.format}`
  );
}

export async function getDocumentWorkflow(payload: {
  sessionId: string;
  documentId: string;
}): Promise<WorkflowData> {
  return apiRequest(
    `/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/workflow`
  );
}

export async function transitionDocumentWorkflow(payload: {
  sessionId: string;
  documentId: string;
  nextState: string;
  actor?: string;
  comment?: string;
}): Promise<WorkflowData> {
  return apiRequest(
    `/api/conversations/${payload.sessionId}/generated-documents/${payload.documentId}/workflow/transition`,
    {
      method: 'POST',
      body: JSON.stringify({
        nextState: payload.nextState,
        actor: payload.actor,
        comment: payload.comment,
      }),
    }
  );
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
  return apiRequest('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getFeedbackDashboard(agentCode?: string): Promise<FeedbackDashboardData> {
  const query = agentCode ? `?agentCode=${encodeURIComponent(agentCode)}` : '';
  return apiRequest(`/api/feedback/dashboard${query}`);
}

export async function approveFeedbackPattern(patternId: string) {
  return apiRequest(`/api/feedback/patterns/${patternId}/approve`, {
    method: 'POST',
  });
}

export async function approvePromptImprovement(improvementId: string) {
  return apiRequest(`/api/feedback/improvements/${improvementId}/approve`, {
    method: 'POST',
  });
}

export async function getAiProviders(): Promise<{
  items: AiProviderInfo[];
  current: AiStatistics['current'];
}> {
  return apiRequest('/api/ai/providers');
}

export async function getAiModels(provider?: string): Promise<{
  items: AiModelInfo[];
  current: AiStatistics['current'];
}> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
  return apiRequest(`/api/ai/models${query}`);
}

export async function getAiUsage(
  filters: {
    provider?: string;
    model?: string;
    date?: string;
    agentCode?: string;
  } = {}
): Promise<{ items: AiUsageRecord[] }> {
  const params = new URLSearchParams();
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.model) params.set('model', filters.model);
  if (filters.date) params.set('date', filters.date);
  if (filters.agentCode) params.set('agentCode', filters.agentCode);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/ai/usage${query}`);
}

export async function getAiStatistics(): Promise<AiStatistics> {
  return apiRequest('/api/ai/statistics');
}
