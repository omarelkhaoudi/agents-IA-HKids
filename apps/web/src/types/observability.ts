export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type UsageGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ActiveRequest {
  id: string;
  provider: string;
  model: string;
  agentCode: string;
  conversationId: string | null;
  streaming: boolean;
  elapsedMs: number;
}

export interface QueueStatus {
  capacity: number;
  inFlight: number;
  queued: number;
  saturationPercent: number;
  oldestWaitMs: number;
  peakConcurrency: number;
  state: 'idle' | 'nominal' | 'busy' | 'saturated';
}

export interface LatencyProfile {
  samples: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface RealtimeWindow {
  requests: number;
  requestsPerHour: number;
  successRequests?: number;
  failedRequests: number;
  successRatePercent?: number;
  errorRatePercent?: number;
  averageLatencyMs: number;
  maxLatencyMs?: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface RecentOutcome {
  id: string;
  provider: string;
  model: string;
  agentCode: string;
  conversationId: string | null;
  status: string;
  errorMessage: string | null;
  durationMs: number;
  finishedAt: string;
}

export interface RecentFailure {
  id: string;
  provider: string;
  model: string;
  agentCode: string;
  conversationId: string | null;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface AlertCounts {
  open: number;
  acknowledged: number;
  resolved: number;
  critical: number;
}

export interface RealtimeSnapshot {
  generatedAt: string;
  activeRequests: ActiveRequest[];
  activeRequestCount: number;
  queue: QueueStatus;
  latency: LatencyProfile;
  lastHour: RealtimeWindow;
  lastDay: RealtimeWindow;
  recentOutcomes: RecentOutcome[];
  recentFailures: RecentFailure[];
  alerts: AlertCounts;
}

export interface UsageBucket {
  bucket: string;
  requests: number;
  failedRequests: number;
  successRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
  errorRatePercent: number;
}

export interface UsageDimension {
  key: string;
  requests: number;
  failedRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
}

export interface AgentUsage {
  agentCode: string;
  agentName: string;
  requests: number;
  failedRequests: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
}

export interface UsageReport {
  granularity: UsageGranularity;
  windowDays: number;
  since: string;
  summary: {
    requests: number;
    successRequests: number;
    failedRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    averageLatencyMs: number;
    errorRatePercent: number;
  };
  series: UsageBucket[];
  byAgent: AgentUsage[];
  byModel: UsageDimension[];
  byProvider: UsageDimension[];
}

export interface ConversationLogSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  language: string;
  agentCode: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  aiRequests: number;
  failedRequests: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
  generatedDocuments: number;
  approvedDocuments: number;
  knowledgeUsed: number;
  promptsUsed: number;
  workflows: number;
  workflowStates: { state: string; count: number }[];
}

export interface ConversationLogList {
  items: ConversationLogSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExecutionHistoryEntry {
  at: string;
  type: 'message' | 'ai_request' | 'document' | 'workflow' | 'event';
  label: string;
  detail: string;
  metadata: Record<string, unknown>;
}

export interface ConversationLogDetail {
  conversation: {
    id: string;
    title: string;
    provider: string;
    model: string;
    language: string;
    agentCode: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }[];
  aiRequests: {
    id: string;
    provider: string;
    model: string;
    agentCode: string;
    status: string;
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
    errorMessage: string | null;
    createdAt: string;
  }[];
  knowledgeRetrieved: { documentId: string; at: string }[];
  promptsUsed: { promptId: string; at: string }[];
  workflowsExecuted: {
    id: string;
    documentId: string;
    state: string;
    approverMode: string;
    requiredApprovals: number;
    createdAt: string;
    updatedAt: string;
  }[];
  workflowHistory: {
    id: string;
    workflowId: string;
    actor: string;
    previousState: string | null;
    newState: string;
    comment: string | null;
    createdAt: string;
  }[];
  approvalState: {
    generatedDocuments: number;
    approvedDocuments: number;
    pendingDocuments: number;
    workflowStates: {
      id: string;
      documentId: string;
      state: string;
      requiredApprovals: number;
    }[];
  };
  exportEvents: {
    documentId: string;
    reference: string;
    format: string;
    approved: boolean;
    at: string;
  }[];
  executionHistory: ExecutionHistoryEntry[];
}

export interface ModuleHealth {
  status: string;
  message?: string;
  [key: string]: unknown;
}

export interface StorageHealth extends ModuleHealth {
  diskMegabytes: number;
  databaseMegabytes: number;
  usedMegabytes: number;
  quotaMegabytes: number;
  usedPercent: number;
  storedFiles: number;
  root: string;
}

export interface SystemHealth {
  status: string;
  version: string;
  nodeEnv: string;
  modules: {
    database: ModuleHealth;
    aiGateway: ModuleHealth;
    retrieval: ModuleHealth;
    workflow: ModuleHealth;
    knowledgePlatform: ModuleHealth;
    promptPlatform: ModuleHealth;
    dms: ModuleHealth;
    storage: StorageHealth;
  };
  memory: {
    heapUsedBytes: number;
    heapTotalBytes: number;
    rssBytes: number;
    heapUsedMegabytes: number;
    rssMegabytes: number;
    systemTotalMegabytes: number;
    systemFreeMegabytes: number;
    systemUsedPercent: number;
    heapUsedPercent: number;
  };
  cpu: {
    cores: number;
    processUsagePercent: number;
    loadAverage1m: number;
    loadPercent: number;
    platform: string;
  };
  uptime: {
    processUptimeSeconds: number;
    systemUptimeSeconds: number;
    serviceUptimeSeconds: number;
    startedAt: string;
  };
  queue: QueueStatus;
  checkedAt: string;
}

export interface PlatformAlert {
  id: string;
  alert_key: string;
  rule_code: string;
  category: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  observed_value: string | number;
  threshold_value: string | number;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_by: string | null;
  resolved_by: string | null;
}

export interface AlertThresholds {
  latencyMs: number;
  errorRatePercent: number;
  storagePercent: number;
  pendingApprovals: number;
  failedWorkflows: number;
  retrievalFailures: number;
}

export interface AlertList {
  items: PlatformAlert[];
  counts: AlertCounts;
  thresholds: AlertThresholds;
}

export interface AlertEvaluation {
  evaluatedAt: string;
  triggered: number;
  autoResolved: number;
  thresholds: AlertThresholds;
  alerts: PlatformAlert[];
}

export interface PromptUsage {
  id: string;
  name: string;
  status: string;
  agentCode: string;
  usageCount: number;
  successCount: number;
  averageLatencyMs: number;
}

export interface DocumentUsage {
  id: string;
  title: string;
  category: string;
  status: string;
  viewCount: number;
  aiUsageCount: number;
  downloadCount: number;
  approvalCount: number;
}

export interface UserActivity {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  requests: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ApprovalStatistics {
  totalDocuments: number;
  approvedDocuments: number;
  pendingDocuments: number;
  approvalRate: number;
  workflowStates: { state: string; count: number }[];
  activeWorkflows: number;
  failedWorkflows: number;
  knowledgeDocuments: number;
  knowledgeInReview: number;
  knowledgeApproved: number;
}

export interface AnalyticsReport {
  windowDays: number;
  since: string;
  mostActiveAgents: AgentUsage[];
  allAgents: AgentUsage[];
  mostUsedPrompts: PromptUsage[];
  mostUsedDocuments: DocumentUsage[];
  userActivity: UserActivity[];
  approvals: ApprovalStatistics;
  responseTime: { averageMs: number; maxMs: number; requests: number };
  platform: {
    totalAgents: number;
    totalConversations: number;
    totalGeneratedDocuments: number;
    knowledgeBaseDocuments: number;
    totalPrompts: number;
    totalFeedbacks: number;
  };
}

export interface TimelineEntry {
  id: string;
  source: string;
  category: string;
  eventType: string;
  severity: AlertSeverity;
  actor: string;
  subjectType: string;
  subjectId: string | null;
  summary: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface TimelineReport {
  items: TimelineEntry[];
  total: number;
  categories: string[];
  windowDays: number;
}

export interface ObservabilityOverview {
  generatedAt: string;
  environment: string;
  realtime: RealtimeSnapshot;
  health: SystemHealth;
  usage: UsageReport;
  alerts: AlertList;
  analytics: AnalyticsReport;
}
