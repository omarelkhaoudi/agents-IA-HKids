import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { AdminStatsRepository } from '../src/repositories/AdminStatsRepository.js';
import { ObservabilityRepository } from '../src/repositories/ObservabilityRepository.js';
import { DashboardService } from '../src/services/admin/DashboardService.js';
import { ActiveRequestTracker } from '../src/services/observability/ActiveRequestTracker.js';
import { AlertService } from '../src/services/observability/AlertService.js';
import { InstrumentationBridge } from '../src/services/observability/InstrumentationBridge.js';
import { ObservabilityService } from '../src/services/observability/ObservabilityService.js';
import { SystemHealthMonitor } from '../src/services/observability/SystemHealthMonitor.js';
import { AIGateway } from '../src/services/ai-gateway/AIGateway.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function healthServiceStub() {
  return {
    getUptimeSeconds: () => 120,
    getHealth: async () => ({
      status: 'ok',
      version: '1.0.0',
      uptimeSeconds: 120,
      checks: {
        database: { status: 'ok', latencyMs: 1 },
        aiGateway: { status: 'ok', providers: ['anthropic'] },
        retrieval: { status: 'ok', chunks: 2 },
        workflow: { status: 'ok', engine: 'WorkflowEngine' },
      },
    }),
  };
}

async function createStack({ thresholds } = {}) {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const observabilityRepository = new ObservabilityRepository(pool);
  const activeRequestTracker = new ActiveRequestTracker({ capacity: 2 });
  const healthService = healthServiceStub();
  const systemHealthMonitor = new SystemHealthMonitor({
    healthService,
    observabilityRepository,
    activeRequestTracker,
    storageRoot: '/observability-test-storage-that-does-not-exist',
    storageQuotaMegabytes: 100,
  });
  const alertService = new AlertService({
    observabilityRepository,
    systemHealthMonitor,
    thresholds,
  });
  const dashboardService = new DashboardService(
    new AdminStatsRepository(pool, { listDocuments: () => [], listPrompts: () => [] })
  );
  const observabilityService = new ObservabilityService({
    observabilityRepository,
    systemHealthMonitor,
    alertService,
    activeRequestTracker,
    dashboardService,
  });

  return {
    pool,
    observabilityRepository,
    observabilityService,
    alertService,
    activeRequestTracker,
    systemHealthMonitor,
  };
}

async function insertUsage(pool, overrides = {}) {
  const payload = {
    id: `usage-${Math.random().toString(36).slice(2, 10)}`,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    conversationId: null,
    userId: null,
    agentCode: 'administrative-assistant',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    estimatedCost: 0.01,
    durationMs: 500,
    status: 'success',
    errorMessage: null,
    createdAt: new Date(),
    ...overrides,
  };

  await pool.query(
    `
      INSERT INTO ai_usage (
        id, provider, model, conversation_id, user_id, agent_code, prompt_tokens,
        completion_tokens, total_tokens, estimated_cost, duration_ms, status, error_message, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `,
    [
      payload.id,
      payload.provider,
      payload.model,
      payload.conversationId,
      payload.userId,
      payload.agentCode,
      payload.promptTokens,
      payload.completionTokens,
      payload.totalTokens,
      payload.estimatedCost,
      payload.durationMs,
      payload.status,
      payload.errorMessage,
      payload.createdAt,
    ]
  );

  return payload;
}

async function insertConversation(pool, id, overrides = {}) {
  await pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language, agent_code, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
    [
      id,
      overrides.title || 'Administrative follow-up',
      'anthropic',
      'claude-3-5-sonnet-latest',
      'fr',
      overrides.agentCode || 'administrative-assistant',
      overrides.createdAt || new Date(),
      overrides.updatedAt || new Date(),
    ]
  );
}

test('observability realtime reports throughput, success rate and queue pressure', async () => {
  const { pool, observabilityService, activeRequestTracker } = await createStack();

  await insertUsage(pool, { durationMs: 400 });
  await insertUsage(pool, { durationMs: 600 });
  await insertUsage(pool, { status: 'error', errorMessage: 'timeout', durationMs: 9000 });

  activeRequestTracker.begin({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' });
  activeRequestTracker.begin({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' });
  const third = activeRequestTracker.begin({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest' });

  const realtime = await observabilityService.getRealtime();

  assert.equal(realtime.lastHour.requests, 3);
  assert.equal(realtime.lastHour.failedRequests, 1);
  assert.equal(realtime.lastHour.successRatePercent, 66.67);
  assert.equal(realtime.lastHour.errorRatePercent, 33.33);
  assert.equal(realtime.activeRequestCount, 3);
  assert.equal(realtime.queue.capacity, 2);
  assert.equal(realtime.queue.queued, 1);
  assert.equal(realtime.queue.state, 'saturated');
  assert.equal(realtime.recentFailures.length, 1);

  activeRequestTracker.end(third, { status: 'success', durationMs: 300 });
  assert.equal(activeRequestTracker.getQueueStatus().queued, 0);
});

test('observability usage buckets requests per day and breaks down by dimension', async () => {
  const { pool, observabilityService } = await createStack();

  await insertUsage(pool, { createdAt: new Date(Date.now() - 2 * DAY_MS), totalTokens: 200 });
  await insertUsage(pool, { createdAt: new Date(Date.now() - 2 * DAY_MS), totalTokens: 100 });
  await insertUsage(pool, {
    createdAt: new Date(),
    agentCode: 'sales-agent',
    model: 'claude-3-haiku-latest',
    totalTokens: 50,
  });

  const usage = await observabilityService.getUsage({ granularity: 'daily', days: 7 });

  assert.equal(usage.granularity, 'daily');
  assert.equal(usage.summary.requests, 3);
  assert.equal(usage.summary.totalTokens, 350);
  assert.equal(usage.series.length, 8);

  const populated = usage.series.filter((bucket) => bucket.requests > 0);
  assert.equal(populated.length, 2);
  assert.equal(populated[0].requests, 2);
  assert.equal(populated[0].totalTokens, 300);

  const salesAgent = usage.byAgent.find((entry) => entry.agentCode === 'sales-agent');
  assert.equal(salesAgent.requests, 1);

  const haiku = usage.byModel.find((entry) => entry.key === 'claude-3-haiku-latest');
  assert.equal(haiku.requests, 1);
  assert.equal(usage.byProvider[0].key, 'anthropic');
});

test('observability usage supports hourly, weekly and monthly granularity', async () => {
  const { pool, observabilityService } = await createStack();

  await insertUsage(pool, { createdAt: new Date(Date.now() - 3 * HOUR_MS) });
  await insertUsage(pool, { createdAt: new Date() });

  const hourly = await observabilityService.getUsage({ granularity: 'hourly', days: 1 });
  assert.equal(hourly.granularity, 'hourly');
  assert.equal(hourly.summary.requests, 2);
  assert.ok(hourly.series.length >= 24);

  const weekly = await observabilityService.getUsage({ granularity: 'weekly', days: 28 });
  assert.equal(weekly.granularity, 'weekly');
  assert.ok(weekly.series.length >= 4);

  const monthly = await observabilityService.getUsage({ granularity: 'monthly', days: 90 });
  assert.equal(monthly.granularity, 'monthly');
  assert.ok(monthly.series.some((bucket) => bucket.requests === 2));
});

test('conversation logs expose execution history, retrieval, workflow and approval state', async () => {
  const { pool, observabilityService } = await createStack();

  await insertConversation(pool, 'conv-1');
  await pool.query(
    `INSERT INTO messages (id, conversation_id, role, content) VALUES ($1,$2,$3,$4)`,
    ['msg-1', 'conv-1', 'user', 'Prepare the monthly summary.']
  );
  await pool.query(
    `
      INSERT INTO knowledge_documents (id, title, category, created_date, updated_date, status)
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
    ['doc-1', 'Internal procedure', 'procedures', '2026-01-01', '2026-01-02', 'active']
  );
  await pool.query(
    `INSERT INTO conversation_knowledge (conversation_id, document_id) VALUES ($1,$2)`,
    ['conv-1', 'doc-1']
  );
  await pool.query(
    `
      INSERT INTO prompt_definitions (
        id, prompt_group_id, version, status, name, role, objective, system_prompt,
        output_style, updated_date, usage_count
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    ['prompt-1', 'group-1', 1, 'active', 'Summary prompt', 'assistant', 'summarize', 'system', 'concise', '2026-01-02', 12]
  );
  await pool.query(
    `INSERT INTO conversation_prompts (conversation_id, prompt_id) VALUES ($1,$2)`,
    ['conv-1', 'prompt-1']
  );
  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, rendered_preview,
        available_export_formats, approved, status
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9)
    `,
    ['gdoc-1', 'conv-1', 'letter', 'REF-1', '{}', 'preview', '["pdf","docx"]', false, 'draft']
  );
  await pool.query(
    `
      INSERT INTO workflow_instances (id, conversation_id, document_id, current_state)
      VALUES ($1,$2,$3,$4)
    `,
    ['wf-1', 'conv-1', 'gdoc-1', 'Pending Review']
  );
  await pool.query(
    `
      INSERT INTO workflow_history (id, workflow_instance_id, actor, previous_state, new_state, comment)
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
    ['wfh-1', 'wf-1', 'manager@hkids.app', 'Draft', 'Pending Review', 'Submitted for review']
  );
  await insertUsage(pool, { conversationId: 'conv-1', durationMs: 750 });

  const list = await observabilityService.getConversationLogs({ limit: 10 });
  assert.equal(list.total, 1);
  assert.equal(list.items[0].messageCount, 1);
  assert.equal(list.items[0].aiRequests, 1);
  assert.equal(list.items[0].knowledgeUsed, 1);
  assert.equal(list.items[0].promptsUsed, 1);
  assert.equal(list.items[0].workflows, 1);

  const detail = await observabilityService.getConversationLog('conv-1');
  assert.equal(detail.conversation.id, 'conv-1');
  assert.equal(detail.knowledgeRetrieved[0].documentId, 'doc-1');
  assert.equal(detail.promptsUsed[0].promptId, 'prompt-1');
  assert.equal(detail.workflowsExecuted[0].state, 'Pending Review');
  assert.equal(detail.workflowHistory[0].newState, 'Pending Review');
  assert.equal(detail.approvalState.pendingDocuments, 1);
  assert.deepEqual(
    detail.exportEvents.map((entry) => entry.format),
    ['pdf', 'docx']
  );
  assert.ok(detail.executionHistory.length >= 4);

  assert.equal(await observabilityService.getConversationLog('missing'), null);
});

test('system health reports modules, memory, cpu, uptime and storage quota', async () => {
  const { observabilityService } = await createStack();

  const health = await observabilityService.getSystemHealth();

  assert.equal(health.status, 'ok');
  assert.ok(health.modules.database);
  assert.ok(health.modules.aiGateway);
  assert.ok(health.modules.knowledgePlatform);
  assert.ok(health.modules.promptPlatform);
  assert.ok(health.modules.dms);
  assert.ok(health.modules.workflow);
  assert.equal(health.modules.storage.quotaMegabytes, 100);
  assert.equal(health.modules.storage.status, 'ok');
  assert.ok(health.memory.heapUsedBytes > 0);
  assert.ok(health.cpu.cores >= 1);
  assert.ok(health.uptime.processUptimeSeconds >= 0);
  assert.equal(health.queue.capacity, 2);
});

test('alerts fire on latency, failures and approvals, then auto-resolve when healthy', async () => {
  const { pool, alertService, observabilityRepository } = await createStack({
    thresholds: {
      latencyMs: 1000,
      errorRatePercent: 10,
      storagePercent: 85,
      pendingApprovals: 2,
      failedWorkflows: 1,
      retrievalFailures: 2,
    },
  });

  await insertUsage(pool, { durationMs: 9000 });
  await insertUsage(pool, { durationMs: 9500 });
  await insertUsage(pool, { durationMs: 9200, status: 'error', errorMessage: 'upstream 500' });

  await insertConversation(pool, 'conv-alert');
  for (const reference of ['REF-A', 'REF-B']) {
    await pool.query(
      `
        INSERT INTO generated_documents (
          id, conversation_id, document_type, reference, structured_document, rendered_preview, approved
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
      `,
      [`gdoc-${reference}`, 'conv-alert', 'letter', reference, '{}', 'preview', false]
    );
  }

  await pool.query(
    `
      INSERT INTO workflow_instances (id, conversation_id, document_id, current_state)
      VALUES ($1,$2,$3,$4)
    `,
    ['wf-alert', 'conv-alert', 'gdoc-REF-A', 'Rejected']
  );

  for (let index = 0; index < 2; index += 1) {
    await observabilityRepository.recordEvent({
      eventType: 'retrieval_failed',
      category: 'retrieval',
      severity: 'warning',
      summary: 'Retrieval failed.',
    });
  }

  const evaluation = await alertService.evaluate({ actor: 'tester' });
  const ruleCodes = evaluation.alerts.map((alert) => alert.rule_code).sort();

  assert.deepEqual(ruleCodes, [
    'ai_failures',
    'failed_workflows',
    'high_latency',
    'missing_approvals',
    'retrieval_failures',
  ]);

  const listed = await alertService.listAlerts({ status: 'open' });
  assert.equal(listed.counts.open, 5);
  assert.equal(listed.counts.critical, 2);

  const target = listed.items[0];
  const acknowledged = await alertService.acknowledge(target.id, 'manager@hkids.app');
  assert.equal(acknowledged.status, 'acknowledged');
  assert.equal(acknowledged.acknowledged_by, 'manager@hkids.app');

  const resolved = await alertService.resolve(target.id, 'manager@hkids.app');
  assert.equal(resolved.status, 'resolved');

  await pool.query('DELETE FROM ai_usage');
  await pool.query('DELETE FROM workflow_instances');
  await pool.query('DELETE FROM generated_documents');
  await pool.query('DELETE FROM observability_events');

  const secondEvaluation = await alertService.evaluate({ actor: 'tester' });
  assert.equal(secondEvaluation.triggered, 0);
  assert.equal(secondEvaluation.autoResolved, 4);

  const afterResolve = await alertService.listAlerts({});
  assert.equal(afterResolve.counts.open, 0);
});

test('repeated alert evaluation reuses one row and increments occurrences', async () => {
  const { pool, alertService } = await createStack({
    thresholds: { pendingApprovals: 1, failedWorkflows: 99, retrievalFailures: 99 },
  });

  await insertConversation(pool, 'conv-dedupe');
  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, rendered_preview, approved
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
    `,
    ['gdoc-dedupe', 'conv-dedupe', 'letter', 'REF-D', '{}', 'preview', false]
  );

  await alertService.evaluate({});
  await alertService.evaluate({});

  const listed = await alertService.listAlerts({});
  const approvalAlerts = listed.items.filter((alert) => alert.rule_code === 'missing_approvals');

  assert.equal(approvalAlerts.length, 1);
  assert.equal(approvalAlerts[0].occurrences, 2);
});

test('analytics ranks agents, prompts, documents, users and approval statistics', async () => {
  const { pool, observabilityService } = await createStack();

  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)`,
    ['user-1', 'manager@hkids.app', 'hash', 'Manager', 'manager']
  );
  await pool.query(
    `
      INSERT INTO knowledge_documents (id, title, category, created_date, updated_date, status, ai_usage_count, view_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
    ['doc-top', 'Onboarding checklist', 'procedures', '2026-01-01', '2026-01-02', 'active', 9, 40]
  );
  await pool.query(
    `
      INSERT INTO prompt_definitions (
        id, prompt_group_id, version, status, name, role, objective, system_prompt,
        output_style, updated_date, usage_count, success_count
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `,
    ['prompt-top', 'group-1', 1, 'active', 'Top prompt', 'assistant', 'draft', 'system', 'concise', '2026-01-02', 25, 22]
  );

  await insertUsage(pool, { userId: 'user-1', agentCode: 'hr-agent', durationMs: 800 });
  await insertUsage(pool, { userId: 'user-1', agentCode: 'hr-agent', durationMs: 1200 });
  await insertConversation(pool, 'conv-analytics');
  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, rendered_preview, approved
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
    `,
    ['gdoc-analytics', 'conv-analytics', 'letter', 'REF-X', '{}', 'preview', true]
  );

  const analytics = await observabilityService.getAnalytics({ days: 30 });

  assert.equal(analytics.mostActiveAgents[0].agentCode, 'hr-agent');
  assert.equal(analytics.mostActiveAgents[0].requests, 2);
  assert.equal(analytics.mostUsedPrompts[0].id, 'prompt-top');
  assert.equal(analytics.mostUsedDocuments[0].id, 'doc-top');
  assert.equal(analytics.userActivity[0].email, 'manager@hkids.app');
  assert.equal(analytics.userActivity[0].requests, 2);
  assert.equal(analytics.responseTime.averageMs, 1000);
  assert.equal(analytics.approvals.approvedDocuments, 1);
  assert.equal(analytics.approvals.approvalRate, 100);
  assert.equal(analytics.platform.totalConversations, 1);
});

test('audit timeline merges platform, knowledge, prompt, dms and workflow events', async () => {
  const { pool, observabilityService } = await createStack();

  await observabilityService.recordEvent({
    eventType: 'observability_exported',
    category: 'export',
    severity: 'info',
    actor: 'admin@hkids.app',
    summary: 'Exported usage as csv.',
  });
  await pool.query(
    `INSERT INTO knowledge_document_events (id, document_id, event_type, actor, summary) VALUES ($1,$2,$3,$4,$5)`,
    ['kev-1', 'doc-1', 'document_published', 'admin@hkids.app', 'Published']
  );
  await pool.query(
    `INSERT INTO prompt_definition_events (id, prompt_id, event_type, actor, summary) VALUES ($1,$2,$3,$4,$5)`,
    ['pev-1', 'prompt-1', 'prompt_approved', 'admin@hkids.app', 'Approved']
  );
  await pool.query(
    `INSERT INTO dms_audit_events (id, document_id, event_type, actor, summary) VALUES ($1,$2,$3,$4,$5)`,
    ['dev-1', 'doc-1', 'document_uploaded', 'admin@hkids.app', 'Uploaded']
  );
  await insertConversation(pool, 'conv-timeline');
  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, rendered_preview
      )
      VALUES ($1,$2,$3,$4,$5::jsonb,$6)
    `,
    ['gdoc-timeline', 'conv-timeline', 'letter', 'REF-T', '{}', 'preview']
  );
  await pool.query(
    `INSERT INTO workflow_instances (id, conversation_id, document_id, current_state) VALUES ($1,$2,$3,$4)`,
    ['wf-timeline', 'conv-timeline', 'gdoc-timeline', 'Approved']
  );
  await pool.query(
    `
      INSERT INTO workflow_history (id, workflow_instance_id, actor, previous_state, new_state)
      VALUES ($1,$2,$3,$4,$5)
    `,
    ['wfh-timeline', 'wf-timeline', 'manager@hkids.app', 'Pending Review', 'Approved']
  );

  const timeline = await observabilityService.getTimeline({ days: 7, limit: 100 });
  const categories = timeline.items.map((entry) => entry.category).sort();

  assert.deepEqual(categories, ['dms', 'export', 'knowledge', 'prompt', 'workflow']);
  assert.ok(timeline.categories.includes('export'));

  const workflowOnly = await observabilityService.getTimeline({ category: 'workflow', days: 7 });
  assert.equal(workflowOnly.items.length, 1);
  assert.equal(workflowOnly.items[0].summary, 'Pending Review to Approved');
});

test('observability export produces json and csv payloads and rejects unknown datasets', async () => {
  const { pool, observabilityService } = await createStack();

  await insertUsage(pool);

  const json = await observabilityService.export({ dataset: 'usage', format: 'json', days: 7 });
  assert.equal(json.contentType, 'application/json');
  assert.equal(JSON.parse(json.body).dataset, 'usage');

  const csv = await observabilityService.export({ dataset: 'agents', format: 'csv', days: 7 });
  assert.equal(csv.contentType, 'text/csv');
  assert.ok(csv.body.split('\n')[0].includes('agentCode'));

  await assert.rejects(
    () => observabilityService.export({ dataset: 'unknown' }),
    /Unsupported observability dataset/
  );
});

test('metric snapshots persist a rolling operational history', async () => {
  const { pool, observabilityService } = await createStack();

  await insertUsage(pool, { durationMs: 700 });
  await observabilityService.captureSnapshot();

  const snapshots = await observabilityService.listSnapshots({ limit: 10 });

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].requests, 1);
  assert.equal(snapshots[0].averageLatencyMs, 700);
  assert.ok(snapshots[0].heapUsedBytes > 0);
});

test('overview bundles realtime, health, usage, alerts and analytics in one payload', async () => {
  const { pool, observabilityService } = await createStack();

  await insertUsage(pool);

  const overview = await observabilityService.getOverview();

  assert.ok(overview.generatedAt);
  assert.equal(overview.realtime.lastHour.requests, 1);
  assert.equal(overview.health.status, 'ok');
  assert.equal(overview.usage.granularity, 'daily');
  assert.deepEqual(overview.alerts.items, []);
  assert.ok(overview.analytics.approvals);
});

test('AI Gateway tracks in-flight requests through the observability tracker', async () => {
  const tracker = new ActiveRequestTracker({ capacity: 4 });
  let observedDuringCall = -1;

  const gateway = new AIGateway({
    providerManager: {
      getProvider: () => ({
        generateResponse: async () => {
          observedDuringCall = tracker.getActiveRequests().length;
          return { text: 'ok', raw: {} };
        },
      }),
    },
    modelManager: {
      getDefaultProvider: () => 'anthropic',
      getDefaultModel: () => 'claude-3-5-sonnet-latest',
      getModelConfig: () => ({ maxTokens: 100, temperature: 0.3, timeoutMs: 1000, maxRetries: 0 }),
    },
    tokenCounter: { estimateMessages: () => 10, estimate: () => 5 },
    costEstimator: { estimate: () => 0.001 },
    retryManager: { execute: (task) => task() },
    timeoutManager: { execute: (task) => task() },
    usageLogger: { log: async (entry) => entry },
    streamingManager: { isEnabled: () => false },
    activeRequestTracker: tracker,
  });

  const result = await gateway.generate({ messages: [{ role: 'user', content: 'hi' }] });

  assert.equal(result.text, 'ok');
  assert.equal(observedDuringCall, 1);
  assert.equal(tracker.getActiveRequests().length, 0);
  assert.equal(tracker.getRecentOutcomes()[0].status, 'success');
  assert.ok(tracker.getLatencyProfile().samples === 1);
});

test('AI Gateway releases tracked requests when the provider fails', async () => {
  const tracker = new ActiveRequestTracker({ capacity: 4 });

  const gateway = new AIGateway({
    providerManager: {
      getProvider: () => ({
        generateResponse: async () => {
          throw new Error('provider unavailable');
        },
      }),
    },
    modelManager: {
      getDefaultProvider: () => 'anthropic',
      getDefaultModel: () => 'claude-3-5-sonnet-latest',
      getModelConfig: () => ({ maxTokens: 100, temperature: 0.3, timeoutMs: 1000, maxRetries: 0 }),
    },
    tokenCounter: { estimateMessages: () => 10, estimate: () => 5 },
    costEstimator: { estimate: () => 0 },
    retryManager: { execute: (task) => task() },
    timeoutManager: { execute: (task) => task() },
    usageLogger: { log: async (entry) => entry },
    streamingManager: { isEnabled: () => false },
    activeRequestTracker: tracker,
  });

  await assert.rejects(() => gateway.generate({ messages: [] }), /provider unavailable/);

  assert.equal(tracker.getActiveRequests().length, 0);
  assert.equal(tracker.getRecentOutcomes()[0].status, 'error');
});

test('instrumentation bridge records retrieval failures without changing the contract', async () => {
  const { observabilityService, observabilityRepository } = await createStack();
  const bridge = new InstrumentationBridge({ observabilityService });

  const retrievalService = {
    retrieveRelevantContext(question) {
      if (question === 'boom') {
        throw new Error('index unavailable');
      }

      return { question, retrievedChunks: [{ id: 'chunk-1' }], retrievalStrategy: 'hybrid' };
    },
  };

  bridge.instrumentRetrieval(retrievalService);
  bridge.instrumentRetrieval(retrievalService);

  const success = retrievalService.retrieveRelevantContext('policy');
  assert.equal(success.retrievedChunks.length, 1);

  assert.throws(() => retrievalService.retrieveRelevantContext('boom'), /index unavailable/);

  await new Promise((resolve) => setImmediate(resolve));

  const failures = await observabilityRepository.countEvents({ eventType: 'retrieval_failed' });
  assert.equal(failures, 1);
});
