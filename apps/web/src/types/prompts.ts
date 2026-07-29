export type PromptStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'active'
  | 'archived'
  | 'deprecated';

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
  libraryId?: string | null;
  category?: string;
  tags?: string[];
  language?: string;
  owner?: string;
  author?: string;
  priority?: number;
  agentCode?: string;
  targetModel?: string;
  temperature?: number | null;
  maxTokens?: number | null;
  knowledgeCollectionIds?: string[];
  notes?: string;
  usageCount?: number;
  successCount?: number;
  approvalCount?: number;
  rejectionCount?: number;
  feedbackScore?: number;
  qualityScore?: number;
  completenessScore?: number;
  successRate?: number;
  approvalRate?: number;
  missingMetadata?: string[];
  lastReviewedAt?: string | null;
  lastReviewedBy?: string;
  publishedAt?: string | null;
  averageLatencyMs?: number;
  createdAt?: string;
  updatedAt?: string;
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
  libraryId?: string | null;
  category?: string;
  tags?: string[];
  language?: string;
  owner?: string;
  author?: string;
  priority?: number;
  agentCode?: string;
  targetModel?: string;
  temperature?: number | null;
  maxTokens?: number | null;
  knowledgeCollectionIds?: string[];
  notes?: string;
}

export interface PromptLibrary {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: string;
  language: string;
  priority: number;
  version: number;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptLink {
  id: string;
  promptId: string;
  linkedType: 'document' | 'collection' | 'template' | 'workflow' | 'agent' | 'analytics';
  linkedId: string;
  label: string;
  createdAt?: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  name: string;
  description: string;
  systemPrompt: string;
  author: string;
  changeSummary: string;
  createdAt?: string;
}

export interface PromptDashboard {
  totalPrompts: number;
  publishedPrompts: number;
  draftPrompts: number;
  archivedPrompts: number;
  pendingReviews: number;
  mostUsed: PromptDefinition[];
  recentlyEdited: PromptDefinition[];
  recentlyPublished: PromptDefinition[];
  mostSuccessful: PromptDefinition[];
  averageFeedback: number;
  averageApprovalRate: number;
  libraries: number;
}

export interface PromptAnalytics {
  mostUsed: PromptDefinition[];
  unusedPrompts: PromptDefinition[];
  highestRated: PromptDefinition[];
  lowestRated: PromptDefinition[];
  averageResponseTime: number;
  averageFeedback: number;
  approvalRate: number;
  promptGrowth: { total: number; published: number; draft: number; review: number };
  librariesUsage: Array<{ id: string; name: string; prompts: number }>;
  versionActivity: Array<{ promptId: string; version: number; name: string }>;
}

export interface PromptBootstrap {
  prompts: PromptDefinition[];
  libraries: PromptLibrary[];
  dashboard: PromptDashboard;
  analytics: PromptAnalytics;
  reviewQueue: PromptDefinition[];
  knownVariables: string[];
}

export interface PromptsApiResponse {
  items: PromptDefinition[];
}
