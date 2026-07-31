import { env } from '../../config/env.js';

const GRANULARITY_MS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const DEFAULT_DAYS = {
  hourly: 2,
  daily: 30,
  weekly: 84,
  monthly: 365,
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function startOfBucket(date, granularity) {
  const value = new Date(date);

  if (granularity === 'hourly') {
    value.setMinutes(0, 0, 0);
    return value;
  }

  value.setHours(0, 0, 0, 0);

  if (granularity === 'weekly') {
    const weekday = (value.getDay() + 6) % 7;
    value.setDate(value.getDate() - weekday);
    return value;
  }

  if (granularity === 'monthly') {
    value.setDate(1);
    return value;
  }

  return value;
}

function bucketKey(date, granularity) {
  const value = startOfBucket(date, granularity);

  if (granularity === 'hourly') {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
      value.getHours()
    )}:00`;
  }

  if (granularity === 'monthly') {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
  }

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function nextBucket(date, granularity) {
  const value = new Date(date);

  if (granularity === 'hourly') {
    value.setHours(value.getHours() + 1);
    return value;
  }

  if (granularity === 'weekly') {
    value.setDate(value.getDate() + 7);
    return value;
  }

  if (granularity === 'monthly') {
    value.setMonth(value.getMonth() + 1);
    return value;
  }

  value.setDate(value.getDate() + 1);
  return value;
}

function emptyBucket(key) {
  return {
    bucket: key,
    requests: 0,
    failedRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
    totalDurationMs: 0,
  };
}

function finalizeBucket(bucket) {
  return {
    bucket: bucket.bucket,
    requests: bucket.requests,
    failedRequests: bucket.failedRequests,
    successRequests: bucket.requests - bucket.failedRequests,
    promptTokens: bucket.promptTokens,
    completionTokens: bucket.completionTokens,
    totalTokens: bucket.totalTokens,
    estimatedCost: round(bucket.estimatedCost, 6),
    averageDurationMs: bucket.requests ? Math.round(bucket.totalDurationMs / bucket.requests) : 0,
    errorRatePercent: bucket.requests
      ? round((bucket.failedRequests / bucket.requests) * 100)
      : 0,
  };
}

function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escape = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row?.[column])).join(',')),
  ].join('\n');
}

/**
 * Read facade over the existing platform tables. It never duplicates domain
 * data: every metric is derived from ai_usage, conversations, workflow,
 * knowledge, prompt and DMS records already written by their owning modules.
 */
export class ObservabilityService {
  constructor({
    observabilityRepository,
    systemHealthMonitor,
    alertService,
    activeRequestTracker,
    dashboardService,
    retrievalService = null,
  }) {
    this.observabilityRepository = observabilityRepository;
    this.systemHealthMonitor = systemHealthMonitor;
    this.alertService = alertService;
    this.activeRequestTracker = activeRequestTracker;
    this.dashboardService = dashboardService;
    this.retrievalService = retrievalService;
  }

  async recordEvent(payload) {
    const id = await this.observabilityRepository.recordEvent(payload);
    return { id, ...payload };
  }

  async getRealtime() {
    const now = Date.now();
    const lastHour = new Date(now - 60 * 60 * 1000);
    const lastDay = new Date(now - 24 * 60 * 60 * 1000);

    const [hourSummary, daySummary, recentFailures, alertCounts] = await Promise.all([
      this.observabilityRepository.getUsageSummary({ since: lastHour }),
      this.observabilityRepository.getUsageSummary({ since: lastDay }),
      this.observabilityRepository.listRecentFailures({ since: lastDay, limit: 10 }),
      this.observabilityRepository.getAlertCounts(),
    ]);

    const successRate = hourSummary.totalRequests
      ? round((hourSummary.successRequests / hourSummary.totalRequests) * 100)
      : 100;

    return {
      generatedAt: new Date(now).toISOString(),
      activeRequests: this.activeRequestTracker.getActiveRequests(),
      activeRequestCount: this.activeRequestTracker.getActiveRequests().length,
      queue: this.activeRequestTracker.getQueueStatus(),
      latency: this.activeRequestTracker.getLatencyProfile(),
      lastHour: {
        requests: hourSummary.totalRequests,
        requestsPerHour: hourSummary.totalRequests,
        successRequests: hourSummary.successRequests,
        failedRequests: hourSummary.failedRequests,
        successRatePercent: successRate,
        errorRatePercent: round(100 - successRate),
        averageLatencyMs: Math.round(hourSummary.averageDurationMs),
        maxLatencyMs: hourSummary.maxDurationMs,
        totalTokens: hourSummary.totalTokens,
        estimatedCost: round(hourSummary.estimatedCost, 6),
      },
      lastDay: {
        requests: daySummary.totalRequests,
        failedRequests: daySummary.failedRequests,
        averageLatencyMs: Math.round(daySummary.averageDurationMs),
        totalTokens: daySummary.totalTokens,
        estimatedCost: round(daySummary.estimatedCost, 6),
        requestsPerHour: round(daySummary.totalRequests / 24),
      },
      recentOutcomes: this.activeRequestTracker.getRecentOutcomes({ limit: 10 }),
      recentFailures: recentFailures.map((row) => ({
        id: row.id,
        provider: row.provider,
        model: row.model,
        agentCode: row.agent_code,
        conversationId: row.conversation_id,
        durationMs: row.duration_ms,
        errorMessage: row.error_message,
        createdAt: row.created_at,
      })),
      alerts: alertCounts,
    };
  }

  async getUsage({ granularity = 'daily', days } = {}) {
    const resolvedGranularity = GRANULARITY_MS[granularity] ? granularity : 'daily';
    const windowDays = Math.min(
      Math.max(Number(days) || DEFAULT_DAYS[resolvedGranularity], 1),
      365
    );
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const [rows, summary, byAgent, byModel, byProvider] = await Promise.all([
      this.observabilityRepository.listUsageWindow({ since }),
      this.observabilityRepository.getUsageSummary({ since }),
      this.observabilityRepository.getAgentUsage({ since }),
      this.observabilityRepository.getUsageByDimension('model', { since }),
      this.observabilityRepository.getUsageByDimension('provider', { since }),
    ]);

    const buckets = new Map();
    let cursor = startOfBucket(since, resolvedGranularity);
    const end = startOfBucket(new Date(), resolvedGranularity);

    while (cursor <= end) {
      const key = bucketKey(cursor, resolvedGranularity);
      buckets.set(key, emptyBucket(key));
      cursor = nextBucket(cursor, resolvedGranularity);
    }

    for (const row of rows) {
      const key = bucketKey(new Date(row.created_at), resolvedGranularity);
      const bucket = buckets.get(key) || emptyBucket(key);

      bucket.requests += 1;
      bucket.failedRequests += row.status === 'success' ? 0 : 1;
      bucket.promptTokens += Number(row.prompt_tokens) || 0;
      bucket.completionTokens += Number(row.completion_tokens) || 0;
      bucket.totalTokens += Number(row.total_tokens) || 0;
      bucket.estimatedCost += Number(row.estimated_cost) || 0;
      bucket.totalDurationMs += Number(row.duration_ms) || 0;

      buckets.set(key, bucket);
    }

    const series = Array.from(buckets.values())
      .sort((left, right) => left.bucket.localeCompare(right.bucket))
      .map(finalizeBucket);

    return {
      granularity: resolvedGranularity,
      windowDays,
      since: since.toISOString(),
      summary: {
        requests: summary.totalRequests,
        successRequests: summary.successRequests,
        failedRequests: summary.failedRequests,
        promptTokens: summary.promptTokens,
        completionTokens: summary.completionTokens,
        totalTokens: summary.totalTokens,
        estimatedCost: round(summary.estimatedCost, 6),
        averageLatencyMs: Math.round(summary.averageDurationMs),
        errorRatePercent: summary.totalRequests
          ? round((summary.failedRequests / summary.totalRequests) * 100)
          : 0,
      },
      series,
      byAgent,
      byModel,
      byProvider,
    };
  }

  async getConversationLogs({ search, agentCode, limit, offset } = {}) {
    const [items, total] = await Promise.all([
      this.observabilityRepository.listConversationLogs({ search, agentCode, limit, offset }),
      this.observabilityRepository.countConversationLogs({ search, agentCode }),
    ]);

    return { items, total, limit: Number(limit) || 25, offset: Number(offset) || 0 };
  }

  async getConversationLog(conversationId) {
    const log = await this.observabilityRepository.getConversationLog(conversationId);

    if (!log) {
      return null;
    }

    const executionHistory = [
      ...log.messages.map((message) => ({
        at: message.created_at,
        type: 'message',
        label: `${message.role} message`,
        detail: String(message.content || '').slice(0, 280),
        metadata: message.metadata || {},
      })),
      ...log.aiUsage.map((usage) => ({
        at: usage.created_at,
        type: 'ai_request',
        label: `${usage.provider}/${usage.model}`,
        detail:
          usage.status === 'success'
            ? `${usage.total_tokens} tokens in ${usage.duration_ms} ms`
            : usage.error_message || 'AI request failed',
        metadata: {
          status: usage.status,
          durationMs: usage.duration_ms,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          estimatedCost: Number(usage.estimated_cost) || 0,
        },
      })),
      ...log.generatedDocuments.map((document) => ({
        at: document.created_at,
        type: 'document',
        label: `${document.document_type} ${document.reference}`,
        detail: document.approved ? 'Approved' : `Status ${document.status}`,
        metadata: {
          approved: document.approved,
          approvedBy: document.approved_by,
          version: document.version,
          exportFormats: document.available_export_formats || [],
        },
      })),
      ...log.workflowHistory.map((history) => ({
        at: history.created_at,
        type: 'workflow',
        label: `${history.previous_state || 'start'} to ${history.new_state}`,
        detail: history.comment || '',
        metadata: { actor: history.actor },
      })),
      ...log.events.map((event) => ({
        at: event.created_at,
        type: 'event',
        label: event.event_type,
        detail: event.summary,
        metadata: { severity: event.severity, actor: event.actor, ...(event.metadata || {}) },
      })),
    ].sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());

    const exportEvents = log.generatedDocuments.flatMap((document) => {
      const formats = Array.isArray(document.available_export_formats)
        ? document.available_export_formats
        : [];

      return formats.map((format) => ({
        documentId: document.id,
        reference: document.reference,
        format,
        approved: document.approved,
        at: document.updated_at,
      }));
    });

    const approvalState = {
      generatedDocuments: log.generatedDocuments.length,
      approvedDocuments: log.generatedDocuments.filter((document) => document.approved).length,
      pendingDocuments: log.generatedDocuments.filter((document) => !document.approved).length,
      workflowStates: log.workflows.map((workflow) => ({
        id: workflow.id,
        documentId: workflow.document_id,
        state: workflow.current_state,
        requiredApprovals: workflow.required_approvals,
      })),
    };

    return {
      conversation: {
        id: log.conversation.id,
        title: log.conversation.title,
        provider: log.conversation.provider,
        model: log.conversation.model,
        language: log.conversation.language,
        agentCode: log.conversation.agent_code,
        createdAt: log.conversation.created_at,
        updatedAt: log.conversation.updated_at,
      },
      messages: log.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        metadata: message.metadata || {},
      })),
      aiRequests: log.aiUsage.map((usage) => ({
        id: usage.id,
        provider: usage.provider,
        model: usage.model,
        agentCode: usage.agent_code,
        status: usage.status,
        durationMs: usage.duration_ms,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: Number(usage.estimated_cost) || 0,
        errorMessage: usage.error_message,
        createdAt: usage.created_at,
      })),
      knowledgeRetrieved: log.knowledgeUsed.map((row) => ({
        documentId: row.document_id,
        at: row.created_at,
      })),
      promptsUsed: log.promptsUsed.map((row) => ({
        promptId: row.prompt_id,
        at: row.created_at,
      })),
      workflowsExecuted: log.workflows.map((workflow) => ({
        id: workflow.id,
        documentId: workflow.document_id,
        state: workflow.current_state,
        approverMode: workflow.approver_mode,
        requiredApprovals: workflow.required_approvals,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
      })),
      workflowHistory: log.workflowHistory.map((history) => ({
        id: history.id,
        workflowId: history.workflow_instance_id,
        actor: history.actor,
        previousState: history.previous_state,
        newState: history.new_state,
        comment: history.comment,
        createdAt: history.created_at,
      })),
      approvalState,
      exportEvents,
      executionHistory,
    };
  }

  async getSystemHealth() {
    return this.systemHealthMonitor.getSystemHealth();
  }

  async getAnalytics({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const [agents, prompts, documents, users, approvals, summary, platform, vector] = await Promise.all([
      this.observabilityRepository.getAgentUsage({ since }),
      this.observabilityRepository.getPromptUsage({ limit: 10 }),
      this.observabilityRepository.getDocumentUsage({ limit: 10 }),
      this.observabilityRepository.getUserActivity({ since, limit: 10 }),
      this.observabilityRepository.getApprovalStatistics(),
      this.observabilityRepository.getUsageSummary({ since }),
      this.dashboardService.getDashboard(),
      this.retrievalService?.getVectorStats
        ? this.retrievalService.getVectorStats()
        : Promise.resolve(null),
    ]);

    return {
      windowDays,
      since: since.toISOString(),
      mostActiveAgents: agents.filter((agent) => agent.requests > 0).slice(0, 10),
      allAgents: agents,
      mostUsedPrompts: prompts,
      mostUsedDocuments: documents,
      userActivity: users,
      approvals,
      responseTime: {
        averageMs: Math.round(summary.averageDurationMs),
        maxMs: summary.maxDurationMs,
        requests: summary.totalRequests,
      },
      platform: {
        totalAgents: platform.totalAgents,
        totalConversations: platform.totalConversations,
        totalGeneratedDocuments: platform.totalGeneratedDocuments,
        knowledgeBaseDocuments: platform.knowledgeBaseDocuments,
        totalPrompts: platform.totalPrompts,
        totalFeedbacks: platform.totalFeedbacks,
      },
      vector,
    };
  }

  async getTimeline({ category, severity, days = 7, limit = 100 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 7, 1), 180);
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const rowLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const [platformEvents, domainEvents] = await Promise.all([
      this.observabilityRepository.listEvents({ category, severity, since, limit: rowLimit }),
      this.observabilityRepository.listDomainEvents({ since, limit: rowLimit }),
    ]);

    const entries = [
      ...platformEvents.map((event) => ({
        id: event.id,
        source: 'platform',
        category: event.category,
        eventType: event.event_type,
        severity: event.severity,
        actor: event.actor,
        subjectType: event.subject_type,
        subjectId: event.subject_id,
        summary: event.summary,
        createdAt: event.created_at,
        metadata: event.metadata || {},
      })),
      ...domainEvents.knowledge.map((event) => ({
        id: event.id,
        source: 'knowledge',
        category: 'knowledge',
        eventType: event.event_type,
        severity: 'info',
        actor: event.actor,
        subjectType: 'document',
        subjectId: event.subject_id,
        summary: event.summary,
        createdAt: event.created_at,
        metadata: {},
      })),
      ...domainEvents.prompts.map((event) => ({
        id: event.id,
        source: 'prompt',
        category: 'prompt',
        eventType: event.event_type,
        severity: 'info',
        actor: event.actor,
        subjectType: 'prompt',
        subjectId: event.subject_id,
        summary: event.summary,
        createdAt: event.created_at,
        metadata: {},
      })),
      ...domainEvents.dms.map((event) => ({
        id: event.id,
        source: 'dms',
        category: 'dms',
        eventType: event.event_type,
        severity: 'info',
        actor: event.actor,
        subjectType: event.subject_id ? 'document' : 'folder',
        subjectId: event.subject_id || event.folder_id,
        summary: event.summary,
        createdAt: event.created_at,
        metadata: {},
      })),
      ...domainEvents.workflows.map((event) => ({
        id: event.id,
        source: 'workflow',
        category: 'workflow',
        eventType: 'workflow_transition',
        severity: 'info',
        actor: event.actor,
        subjectType: 'workflow',
        subjectId: event.subject_id,
        summary: `${event.previous_state || 'start'} to ${event.new_state}`,
        createdAt: event.created_at,
        metadata: { comment: event.comment || '' },
      })),
    ];

    const filtered = entries
      .filter((entry) => (category ? entry.category === category : true))
      .filter((entry) => (severity ? entry.severity === severity : true))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, rowLimit);

    const categories = Array.from(new Set(entries.map((entry) => entry.category))).sort();

    return { items: filtered, total: filtered.length, categories, windowDays };
  }

  async captureSnapshot() {
    const [realtime, health] = await Promise.all([this.getRealtime(), this.getSystemHealth()]);

    const id = await this.observabilityRepository.saveSnapshot({
      windowMinutes: 60,
      requests: realtime.lastHour.requests,
      failedRequests: realtime.lastHour.failedRequests,
      activeRequests: realtime.activeRequestCount,
      queuedRequests: realtime.queue.queued,
      averageLatencyMs: realtime.lastHour.averageLatencyMs,
      totalTokens: realtime.lastHour.totalTokens,
      estimatedCost: realtime.lastHour.estimatedCost,
      heapUsedBytes: health.memory.heapUsedBytes,
      cpuUsagePercent: health.cpu.processUsagePercent,
      uptimeSeconds: health.uptime.processUptimeSeconds,
      metadata: { status: health.status, queueState: realtime.queue.state },
    });

    return { id, capturedAt: new Date().toISOString() };
  }

  async listSnapshots({ limit } = {}) {
    const rows = await this.observabilityRepository.listSnapshots({ limit });

    return rows.map((row) => ({
      id: row.id,
      capturedAt: row.captured_at,
      requests: row.requests,
      failedRequests: row.failed_requests,
      activeRequests: row.active_requests,
      queuedRequests: row.queued_requests,
      averageLatencyMs: row.average_latency_ms,
      totalTokens: row.total_tokens,
      estimatedCost: Number(row.estimated_cost) || 0,
      heapUsedBytes: Number(row.heap_used_bytes) || 0,
      cpuUsagePercent: Number(row.cpu_usage_percent) || 0,
      uptimeSeconds: row.uptime_seconds,
    }));
  }

  async getOverview() {
    const [realtime, health, usage, alerts, analytics] = await Promise.all([
      this.getRealtime(),
      this.getSystemHealth(),
      this.getUsage({ granularity: 'daily', days: 14 }),
      this.alertService.listAlerts({ limit: 10 }),
      this.getAnalytics({ days: 30 }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      environment: env.nodeEnv,
      realtime,
      health,
      usage,
      alerts,
      analytics,
    };
  }

  async export({ dataset = 'usage', format = 'json', days } = {}) {
    const datasets = {
      usage: async () => (await this.getUsage({ granularity: 'daily', days })).series,
      agents: async () => (await this.getUsage({ granularity: 'daily', days })).byAgent,
      models: async () => (await this.getUsage({ granularity: 'daily', days })).byModel,
      alerts: async () => (await this.alertService.listAlerts({ limit: 200 })).items,
      timeline: async () => (await this.getTimeline({ days: days || 30, limit: 500 })).items,
      conversations: async () => (await this.getConversationLogs({ limit: 200 })).items,
      vector: async () =>
        this.retrievalService?.getVectorStats ? [await this.retrievalService.getVectorStats()] : [],
    };

    const loader = datasets[dataset];

    if (!loader) {
      const error = new Error(`Unsupported observability dataset: ${dataset}`);
      error.statusCode = 400;
      throw error;
    }

    const rows = await loader();

    if (format === 'csv') {
      return {
        format: 'csv',
        contentType: 'text/csv',
        filename: `observability-${dataset}.csv`,
        body: toCsv(rows),
      };
    }

    return {
      format: 'json',
      contentType: 'application/json',
      filename: `observability-${dataset}.json`,
      body: JSON.stringify({ dataset, exportedAt: new Date().toISOString(), items: rows }, null, 2),
    };
  }
}
