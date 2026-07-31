import { apiRequest, getAccessToken } from './client';
import type {
  AgentBenchmark,
  AgentScorecard,
  EvaluationAlert,
  EvaluationAlertList,
  EvaluationAnalytics,
  EvaluationGranularity,
  EvaluationHistory,
  EvaluationOverview,
  EvaluationRunDetail,
  EvaluationSuggestion,
  EvaluationSuite,
  EvaluationTrend,
  FeedbackSignals,
  KnowledgeEvaluation,
  PromptComparison,
  PromptMetricList,
  RegressionReport,
  SuggestionList,
  SuiteDetail,
  SuiteRunResult,
  WorkflowEvaluation,
} from '../types/aiEvaluation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function buildQuery(params: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString();
}

export async function getEvaluationOverview(params: { days?: number } = {}): Promise<EvaluationOverview> {
  return apiRequest(`/api/evaluation/overview?${buildQuery(params)}`);
}

export async function getEvaluationTrend(
  params: { granularity?: EvaluationGranularity; days?: number } = {}
): Promise<EvaluationTrend> {
  return apiRequest(`/api/evaluation/trend?${buildQuery(params)}`);
}

export async function getEvaluationAnalytics(
  params: { granularity?: EvaluationGranularity; days?: number } = {}
): Promise<EvaluationAnalytics> {
  return apiRequest(`/api/evaluation/analytics?${buildQuery(params)}`);
}

export async function getEvaluationHistory(
  params: {
    agentCode?: string;
    promptId?: string;
    verdict?: string;
    source?: string;
    days?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<EvaluationHistory> {
  return apiRequest(`/api/evaluation/history?${buildQuery(params)}`);
}

export async function getEvaluationRun(id: string): Promise<EvaluationRunDetail> {
  return apiRequest(`/api/evaluation/history/${encodeURIComponent(id)}`);
}

export async function getAgentBenchmark(params: { days?: number } = {}): Promise<AgentBenchmark> {
  return apiRequest(`/api/evaluation/benchmark?${buildQuery(params)}`);
}

export async function getAgentScorecard(
  agentCode: string,
  params: { days?: number } = {}
): Promise<AgentScorecard> {
  return apiRequest(
    `/api/evaluation/scorecards/${encodeURIComponent(agentCode)}?${buildQuery(params)}`
  );
}

export async function getPromptMetrics(
  params: { days?: number; limit?: number } = {}
): Promise<PromptMetricList> {
  return apiRequest(`/api/evaluation/prompts?${buildQuery(params)}`);
}

export async function getPromptComparison(
  promptId: string,
  params: { left?: number; right?: number } = {}
): Promise<PromptComparison> {
  return apiRequest(
    `/api/evaluation/prompts/${encodeURIComponent(promptId)}/comparison?${buildQuery(params)}`
  );
}

export async function getPromptRegressions(): Promise<RegressionReport> {
  return apiRequest('/api/evaluation/regressions');
}

export async function getKnowledgeEvaluation(
  params: { days?: number } = {}
): Promise<KnowledgeEvaluation> {
  return apiRequest(`/api/evaluation/knowledge?${buildQuery(params)}`);
}

export async function getWorkflowEvaluation(
  params: { days?: number } = {}
): Promise<WorkflowEvaluation> {
  return apiRequest(`/api/evaluation/workflows?${buildQuery(params)}`);
}

export async function getEvaluationSuites(
  params: { agentCode?: string; status?: string } = {}
): Promise<{ items: EvaluationSuite[] }> {
  return apiRequest(`/api/evaluation/suites?${buildQuery(params)}`);
}

export async function getEvaluationSuite(id: string): Promise<SuiteDetail> {
  return apiRequest(`/api/evaluation/suites/${encodeURIComponent(id)}`);
}

export async function runEvaluationSuite(id: string): Promise<SuiteRunResult> {
  return apiRequest(`/api/evaluation/suites/${encodeURIComponent(id)}/run`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getEvaluationAlerts(
  params: { status?: string; severity?: string; limit?: number } = {}
): Promise<EvaluationAlertList> {
  return apiRequest(`/api/evaluation/alerts?${buildQuery(params)}`);
}

export async function evaluateEvaluationAlerts(): Promise<{ triggered: number; autoResolved: number }> {
  return apiRequest('/api/evaluation/alerts/evaluate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function acknowledgeEvaluationAlert(id: string): Promise<EvaluationAlert> {
  return apiRequest(`/api/evaluation/alerts/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function resolveEvaluationAlert(id: string): Promise<EvaluationAlert> {
  return apiRequest(`/api/evaluation/alerts/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getFeedbackIntelligence(
  params: { days?: number } = {}
): Promise<FeedbackSignals> {
  return apiRequest(`/api/evaluation/feedback-intelligence?${buildQuery(params)}`);
}

export async function getEvaluationSuggestions(
  params: { status?: string; category?: string; limit?: number } = {}
): Promise<SuggestionList> {
  return apiRequest(`/api/evaluation/suggestions?${buildQuery(params)}`);
}

export async function generateEvaluationSuggestions(): Promise<{ generated: number }> {
  return apiRequest('/api/evaluation/suggestions/generate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function reviewEvaluationSuggestion(
  id: string,
  status: 'approved' | 'rejected'
): Promise<EvaluationSuggestion> {
  return apiRequest(`/api/evaluation/suggestions/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function downloadEvaluationExport(
  dataset: 'runs' | 'agents' | 'prompts' | 'criteria' | 'trend' | 'suggestions',
  format: 'json' | 'csv' = 'csv'
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/api/evaluation/export?${buildQuery({ dataset, format })}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error('Unable to export evaluation data.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `evaluation-${dataset}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
