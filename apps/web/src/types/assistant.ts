export type DocumentKind =
  | 'quotation'
  | 'invoice'
  | 'purchase-order'
  | 'delivery-note'
  | 'letter'
  | 'email';

export interface QuickAction {
  id: DocumentKind;
  label: string;
  prompt: string;
  summary: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastUpdated: string;
  category: 'drafting' | 'finance' | 'operations';
}

export interface AssistantVariable {
  key: string;
  label: string;
  value: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  audience: string;
}

export interface GeneratedDocumentSummary {
  id: string;
  name: string;
  type: DocumentKind;
  status: 'draft' | 'review' | 'ready';
  updatedAt: string;
}

export interface ContextSnapshot {
  department: string;
  language: string;
  companyName: string;
  companyAddress: string;
  contactName: string;
}

export interface FutureAiRequest {
  conversationId: string;
  action: DocumentKind;
  userInput: string;
  variables: Record<string, string>;
  templateId?: string;
  knowledgeBaseIds: string[];
}

export interface FutureAiResponse {
  message: string;
  suggestedTitle: string;
  structuredDocument?: {
    type: DocumentKind;
    sections: Array<{
      id: string;
      heading: string;
      content: string;
    }>;
  };
}
