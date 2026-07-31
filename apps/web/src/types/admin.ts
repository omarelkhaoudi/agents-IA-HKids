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

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical' | string;
  actorUserId?: string | null;
  actorEmail: string;
  tenantId: string;
  organizationId: string;
  subjectType: string;
  subjectId?: string | null;
  action: string;
  allowed: boolean;
  reason: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SecurityDashboard {
  generatedAt: string;
  metrics: {
    activeSessions: number;
    failedLogins: number;
    lockedAccounts: number;
    tenantViolations: number;
    permissionViolations: number;
    securityEvents: number;
    secretIssues: number;
    aclEntries: number;
  };
  scores: {
    securityScore: number;
    permissionScore: number;
    tenantIsolationScore: number;
    secretManagementScore: number;
    authenticationHealth: number;
    aclQuality: number;
  };
  activeSessions: Array<{
    id: string;
    userId: string;
    email: string;
    name: string;
    role: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
    tenantId: string;
    organizationId: string;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
  }>;
  lockedAccounts: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    failedLoginCount: number;
    lockedUntil: string;
    tenantId: string;
    organizationId: string;
  }>;
  secretHealth: {
    healthy: number;
    missing: number;
    expired: number;
    items: Array<{
      name: string;
      provider: string;
      configured: boolean;
      source: string;
      status: string;
      required: boolean;
      lastValidatedAt: string;
      rotatedAt?: string | null;
      expiresAt?: string | null;
    }>;
  };
  encryptionHealth: {
    status: string;
    configured: boolean;
    keyId: string;
    version: number;
    algorithm: string;
    rotatedAt?: string | null;
  };
  aclStatistics: {
    entries: number;
    restrictedDocuments: number;
    inheritedEntries: number;
  };
  events: SecurityEvent[];
}
