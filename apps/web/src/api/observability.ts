import { apiRequest, getAccessToken } from './client';
import type {
  AlertEvaluation,
  AlertList,
  AnalyticsReport,
  ConversationLogDetail,
  ConversationLogList,
  ObservabilityOverview,
  PlatformAlert,
  RealtimeSnapshot,
  SystemHealth,
  TimelineReport,
  UsageGranularity,
  UsageReport,
} from '../types/observability';

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

export async function getObservabilityOverview(): Promise<ObservabilityOverview> {
  return apiRequest('/api/observability/overview');
}

export async function getRealtimeSnapshot(): Promise<RealtimeSnapshot> {
  return apiRequest('/api/observability/realtime');
}

export async function getUsageReport(params: {
  granularity?: UsageGranularity;
  days?: number;
} = {}): Promise<UsageReport> {
  return apiRequest(`/api/observability/usage?${buildQuery(params)}`);
}

export async function getConversationLogs(params: {
  search?: string;
  agentCode?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ConversationLogList> {
  return apiRequest(`/api/observability/logs?${buildQuery(params)}`);
}

export async function getConversationLog(id: string): Promise<ConversationLogDetail> {
  return apiRequest(`/api/observability/logs/${encodeURIComponent(id)}`);
}

export async function getSystemHealth(): Promise<SystemHealth> {
  return apiRequest('/api/observability/health');
}

export async function getObservabilityAnalytics(params: { days?: number } = {}): Promise<AnalyticsReport> {
  return apiRequest(`/api/observability/analytics?${buildQuery(params)}`);
}

export async function getAuditTimeline(params: {
  category?: string;
  severity?: string;
  days?: number;
  limit?: number;
} = {}): Promise<TimelineReport> {
  return apiRequest(`/api/observability/timeline?${buildQuery(params)}`);
}

export async function getPlatformAlerts(params: {
  status?: string;
  severity?: string;
  limit?: number;
} = {}): Promise<AlertList> {
  return apiRequest(`/api/observability/alerts?${buildQuery(params)}`);
}

export async function evaluateAlerts(): Promise<AlertEvaluation> {
  return apiRequest('/api/observability/alerts/evaluate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function acknowledgeAlert(id: string): Promise<PlatformAlert> {
  return apiRequest(`/api/observability/alerts/${encodeURIComponent(id)}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function resolveAlert(id: string): Promise<PlatformAlert> {
  return apiRequest(`/api/observability/alerts/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function downloadObservabilityExport(
  dataset: 'usage' | 'agents' | 'models' | 'alerts' | 'timeline' | 'conversations',
  format: 'json' | 'csv' = 'csv'
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE_URL}/api/observability/export?${buildQuery({ dataset, format })}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error('Unable to export observability data.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `observability-${dataset}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
