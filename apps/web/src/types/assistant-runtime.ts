import type { KnowledgeBaseDocument } from './knowledge-base';
import type { PromptDefinition } from './prompts';
import type { GeneratedDocumentRecord } from './generated-documents';

export interface AssistantContext {
  department: string;
  language: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
}

export interface AssistantModelOption {
  id: string;
  label: string;
  provider: string;
}

export interface AssistantSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedPromptId: string;
  selectedDocumentIds: string[];
  currentContext: AssistantContext;
  model: string;
  provider: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
  }>;
  generatedDocuments: GeneratedDocumentRecord[];
}

export interface AssistantBootstrapResponse {
  prompts: PromptDefinition[];
  documents: KnowledgeBaseDocument[];
  models: AssistantModelOption[];
  defaultModel: string;
  defaultProvider: string;
  defaultContext: AssistantContext;
}
