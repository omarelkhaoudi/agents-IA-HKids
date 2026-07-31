export interface AdminAgent {
  id: string;
  code: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | string;
  defaultProvider: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryCount: number;
  promptIds: string[];
  documentIds: string[];
  workflowCodes: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminResources {
  prompts: Array<{ id: string; name: string; description: string }>;
  documents: Array<{ id: string; title: string; category: string }>;
  workflowCodes: Array<{ code: string; label: string }>;
  providers: Array<{ id: string; label: string }>;
  models: Array<{ id: string; provider: string }>;
}

export interface AdminDashboardData {
  totalAgents: number;
  totalConversations: number;
  totalGeneratedDocuments: number;
  totalApprovedDocuments: number;
  activeWorkflows: number;
  knowledgeBaseDocuments: number;
  totalPrompts: number;
  totalFeedbacks: number;
  totalAiCost: number;
  totalTokens: number;
  averageResponseMs: number;
  totalRequests: number;
  costByProvider: Array<{
    provider: string;
    estimated_cost: number;
    total_tokens: number;
    requests: number;
  }>;
  costByAgent: Array<{
    agent_code: string;
    agent_name: string;
    estimated_cost: number;
    total_tokens: number;
    requests: number;
  }>;
  modelDistribution: Array<{
    model: string;
    provider: string;
    requests: number;
    total_tokens: number;
    estimated_cost: number;
  }>;
}

export type AdminSettings = Record<string, string>;

export interface SystemStatus {
  system: {
    status: string;
    version: string;
    uptimeSeconds: number;
    nodeEnv: string;
  };
  database: {
    status: string;
    latencyMs?: number;
    message?: string;
  };
  claudeApi: {
    status: string;
    configured: boolean;
    provider: string;
    model: string;
  };
  storage: {
    knowledgeDocuments: number;
    generatedDocuments: number;
    prompts: number;
    approximateBytes: number;
    approximateMegabytes: number;
    note: string;
  };
  vector?: {
    provider: string;
    model: string;
    chunks: number;
    embeddings: number;
    coveragePercent: number;
    averageChunkTokens: number;
    missingEmbeddings: number;
    failedIndexing: number;
    queueSize: number;
  };
  aiUsage: {
    totalRequests: number;
    totalCost: number;
    totalTokens: number;
    averageResponseMs: number;
  };
  currentModel: string;
  currentProvider: string;
  version: string;
  migrationVersion: string;
  environment: {
    valid: boolean;
    issues: string[];
    nodeEnv: string;
    defaultProvider: string;
    defaultModel: string;
    clientUrl: string;
    databaseConfigured: boolean;
    anthropicConfigured: boolean;
  };
  pendingWorkflows: number;
  pendingApprovals: number;
  pendingFeedback: number;
}
