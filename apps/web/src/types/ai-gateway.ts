export interface AiProviderInfo {
  id: string;
  label: string;
  available: boolean;
  default: boolean;
}

export interface AiModelInfo {
  id: string;
  label: string;
  provider: string;
  available: boolean;
}

export interface AiUsageRecord {
  id: string;
  provider: string;
  model: string;
  conversation_id: string | null;
  user_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration_ms: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface AiStatistics {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  averageDurationMs: number;
  byModel: Array<{
    model: string;
    provider: string;
    requests: number;
    total_tokens: number;
    estimated_cost: number;
  }>;
  current: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    streaming: boolean;
    maxRetries: number;
  };
}
