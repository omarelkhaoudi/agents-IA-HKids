export type PromptStatus = 'active' | 'draft' | 'archived';

export interface PromptDefinition {
  id: string;
  promptGroupId: string;
  version: number;
  status: PromptStatus;
  name: string;
  description: string;
  role: string;
  objective: string;
  systemPrompt: string;
  instructions: string[];
  constraints: string[];
  validationChecklist: string[];
  outputStyle: string;
  updatedDate: string;
}

export interface PromptPayload {
  promptGroupId: string;
  version: number;
  status: PromptStatus;
  name: string;
  description: string;
  role: string;
  objective: string;
  systemPrompt: string;
  instructions: string[];
  constraints: string[];
  validationChecklist: string[];
  outputStyle: string;
}

export interface PromptsApiResponse {
  items: PromptDefinition[];
}
