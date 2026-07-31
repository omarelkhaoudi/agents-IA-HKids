const DAY_MS = 24 * 60 * 60 * 1000;

const EXPORT_DATASETS = new Set(['runs', 'agents', 'prompts', 'criteria', 'trend', 'suggestions']);

function pad(value) {
  return String(value).padStart(2, '0');
}

function startOfBucket(date, granularity) {
  const value = new Date(date);
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

  if (granularity === 'monthly') {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}`;
  }

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function nextBucket(date, granularity) {
  const value = new Date(date);

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

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyBucket(key) {
  return {
    bucket: key,
    runs: 0,
    scoreTotal: 0,
    groundednessTotal: 0,
    latencyTotal: 0,
    tokensTotal: 0,
    costTotal: 0,
    feedbackTotal: 0,
    approved: 0,
    rejected: 0,
    failed: 0,
  };
}

function finalizeBucket(bucket) {
  const decided = bucket.approved + bucket.rejected;

  return {
    bucket: bucket.bucket,
    runs: bucket.runs,
    averageScore: bucket.runs ? round(bucket.scoreTotal / bucket.runs) : 0,
    averageGroundedness: bucket.runs ? round(bucket.groundednessTotal / bucket.runs) : 0,
    averageLatencyMs: bucket.runs ? round(bucket.latencyTotal / bucket.runs) : 0,
    averageTokens: bucket.runs ? round(bucket.tokensTotal / bucket.runs) : 0,
    totalCost: round(bucket.costTotal, 6),
    averageFeedback: bucket.runs ? round(bucket.feedbackTotal / bucket.runs) : 0,
    approvalRate: decided ? round((bucket.approved / decided) * 100) : 0,
    failureRate: bucket.runs ? round((bucket.failed / bucket.runs) * 100) : 0,
  };
}

function toCsv(rows) {
  if (!rows.length) {
    return '';
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n');
}

/**
 * Facade over the evaluation layer. Every metric is derived either from
 * evaluation runs produced by the EvaluationEngine or from counters already
 * maintained by the Prompt Platform, Knowledge Platform and Workflow Engine.
 */
export class EvaluationService {
  constructor({
    evaluationRepository,
    evaluationEngine,
    knowledgeEvaluationService,
    workflowEvaluationService,
    promptEvaluationService,
    agentBenchmarkService,
    observabilityService = null,
    securityDashboardService = null,
  }) {
    this.evaluationRepository = evaluationRepository;
    this.evaluationEngine = evaluationEngine;
    this.knowledgeEvaluationService = knowledgeEvaluationService;
    this.workflowEvaluationService = workflowEvaluationService;
    this.promptEvaluationService = promptEvaluationService;
    this.agentBenchmarkService = agentBenchmarkService;
    this.observabilityService = observabilityService;
    this.securityDashboardService = securityDashboardService;
  }

  async recordEvaluation(input = {}) {
    const evaluation = this.evaluationEngine.evaluate(input);

    const runId = await this.evaluationRepository.saveRun({
      subjectType: input.subjectType || 'conversation',
      subjectId: input.subjectId,
      agentCode: input.agentCode,
      conversationId: input.conversationId,
      messageId: input.messageId,
      promptId: input.promptId,
      promptVersion: input.promptVersion,
      knowledgeVersion: input.knowledgeVersion,
      documentIds: input.documentIds,
      workflowId: input.workflowId,
      workflowState: input.workflowState,
      provider: input.provider,
      model: input.model,
      source: input.source || 'automatic',
      reviewer: input.reviewer,
      latencyMs: input.latencyMs,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      estimatedCost: input.estimatedCost,
      overallScore: evaluation.overallScore,
      groundednessScore: evaluation.groundednessScore,
      hallucinationRisk: evaluation.hallucinationRisk,
      knowledgeCoverage: evaluation.knowledgeCoverage,
      feedbackScore: input.feedbackRating ? (toNumber(input.feedbackRating) / 5) * 100 : 0,
      approvalState: input.approvalState || 'unknown',
      verdict: evaluation.verdict,
      responseCharacters: evaluation.responseCharacters,
      metadata: input.metadata || {},
      createdAt: input.createdAt,
      scores: evaluation.scores,
    });

    if (this.observabilityService) {
      await this.observabilityService.recordEvent({
        eventType: 'evaluation_recorded',
        category: 'evaluation',
        severity: evaluation.verdict === 'fail' ? 'warning' : 'info',
        source: 'evaluation-engine',
        actor: input.reviewer || 'system',
        subjectType: input.subjectType || 'conversation',
        subjectId: input.subjectId || input.conversationId || runId,
        agentCode: input.agentCode,
        conversationId: input.conversationId,
        summary: `Evaluation scored ${evaluation.overallScore}/100 (${evaluation.verdict}).`,
        durationMs: input.latencyMs,
        metadata: {
          promptId: input.promptId || null,
          groundedness: evaluation.groundednessScore,
          hallucinationRisk: evaluation.hallucinationRisk,
        },
      });
    }

    return { runId, ...evaluation };
  }

  /**
   * Persists an already-scored suite case so suite results land in the same
   * history table as production traffic and feed the same trends.
   */
  async recordEvaluationForSuite({ suite, testCase, outputText, usage, evaluation, actor, latencyMs }) {
    return this.evaluationRepository.saveRun({
      subjectType: 'suite_case',
      subjectId: testCase.id,
      agentCode: suite.agent_code,
      provider: usage?.provider || '',
      model: usage?.model || '',
      source: 'suite',
      reviewer: actor || '',
      latencyMs: usage?.durationMs ?? latencyMs,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
      estimatedCost: usage?.estimatedCost,
      overallScore: evaluation.overallScore,
      groundednessScore: evaluation.groundednessScore,
      hallucinationRisk: evaluation.hallucinationRisk,
      knowledgeCoverage: evaluation.knowledgeCoverage,
      approvalState: 'unknown',
      verdict: evaluation.verdict,
      responseCharacters: evaluation.responseCharacters,
      metadata: {
        suiteId: suite.id,
        suiteCode: suite.code,
        caseName: testCase.name,
        outputPreview: String(outputText || '').slice(0, 400),
      },
      scores: evaluation.scores,
    });
  }

  async getTrend({ granularity = 'daily', days } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || (granularity === 'monthly' ? 180 : 30), 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);
    const rows = await this.evaluationRepository.listRunWindow({ since });

    const buckets = new Map();

    for (const row of rows) {
      const key = bucketKey(new Date(row.created_at), granularity);
      const bucket = buckets.get(key) || emptyBucket(key);

      bucket.runs += 1;
      bucket.scoreTotal += toNumber(row.overall_score);
      bucket.groundednessTotal += toNumber(row.groundedness_score);
      bucket.latencyTotal += toNumber(row.latency_ms);
      bucket.tokensTotal += toNumber(row.total_tokens);
      bucket.costTotal += toNumber(row.estimated_cost);
      bucket.feedbackTotal += toNumber(row.feedback_score);

      if (row.approval_state === 'approved') {
        bucket.approved += 1;
      }

      if (row.approval_state === 'rejected') {
        bucket.rejected += 1;
      }

      if (row.verdict === 'fail') {
        bucket.failed += 1;
      }

      buckets.set(key, bucket);
    }

    const series = [];
    let cursor = startOfBucket(since, granularity);
    const end = startOfBucket(new Date(), granularity);

    while (cursor <= end) {
      const key = bucketKey(cursor, granularity);
      series.push(finalizeBucket(buckets.get(key) || emptyBucket(key)));
      cursor = nextBucket(cursor, granularity);
    }

    return { granularity, days: windowDays, series };
  }

  async getDashboard({ days = 30 } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);

    const [summary, criteria, agents, models, providers, prompts, trend, knowledge, suggestions] =
      await Promise.all([
        this.evaluationRepository.getQualitySummary({ since }),
        this.evaluationRepository.getScoreByCriterion({ since }),
        this.evaluationRepository.getQualityByDimension('agent', { since }),
        this.evaluationRepository.getQualityByDimension('model', { since }),
        this.evaluationRepository.getQualityByDimension('provider', { since }),
        this.evaluationRepository.getQualityByDimension('prompt', { since }),
        this.getTrend({ granularity: 'daily', days: windowDays }),
        this.knowledgeEvaluationService.getKnowledgeQuality({ days: windowDays }),
        this.evaluationRepository.getSuggestionCounts(),
      ]);

    const promptEffectiveness = prompts.length
      ? round(
          prompts.reduce((total, entry) => total + entry.averageScore, 0) / prompts.length
        )
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      summary,
      criteria,
      agents,
      models,
      providers,
      prompts,
      promptEffectiveness,
      knowledgeCollections: knowledge.collections,
      knowledgeDocuments: knowledge.documents,
      trend: trend.series,
      suggestions,
    };
  }

  async getHistory(filters = {}) {
    const [items, total] = await Promise.all([
      this.evaluationRepository.listRuns(filters),
      this.evaluationRepository.countRuns(filters),
    ]);

    return { items, total, limit: filters.limit || 50, offset: filters.offset || 0 };
  }

  async getRun(id) {
    return this.evaluationRepository.getRun(id);
  }

  async getAnalytics({ days = 90, granularity = 'weekly' } = {}) {
    const windowDays = Math.min(Math.max(Number(days) || 90, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);

    const [trend, agents, prompts, criteria, knowledge, workflow] = await Promise.all([
      this.getTrend({ granularity, days: windowDays }),
      this.evaluationRepository.getQualityByDimension('agent', { since }),
      this.evaluationRepository.getQualityByDimension('prompt', { since }),
      this.evaluationRepository.getScoreByCriterion({ since }),
      this.knowledgeEvaluationService.getKnowledgeQuality({ days: windowDays }),
      this.workflowEvaluationService.getWorkflowQuality({ days: windowDays }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      granularity,
      qualityEvolution: trend.series.map((entry) => ({
        bucket: entry.bucket,
        value: entry.averageScore,
      })),
      costEvolution: trend.series.map((entry) => ({
        bucket: entry.bucket,
        value: entry.totalCost,
      })),
      latencyEvolution: trend.series.map((entry) => ({
        bucket: entry.bucket,
        value: entry.averageLatencyMs,
      })),
      approvalEvolution: trend.series.map((entry) => ({
        bucket: entry.bucket,
        value: entry.approvalRate,
      })),
      feedbackEvolution: trend.series.map((entry) => ({
        bucket: entry.bucket,
        value: entry.averageFeedback,
      })),
      agentEvolution: agents,
      promptEvolution: prompts,
      knowledgeEvolution: knowledge.collections,
      workflowEvolution: workflow.states,
      criteria,
    };
  }

  async export({ dataset = 'runs', format = 'json', days = 30 } = {}) {
    if (!EXPORT_DATASETS.has(dataset)) {
      const error = new Error(`Unsupported evaluation dataset: ${dataset}`);
      error.statusCode = 400;
      throw error;
    }

    const windowDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const since = new Date(Date.now() - windowDays * DAY_MS);
    let rows = [];

    if (dataset === 'runs') {
      rows = await this.evaluationRepository.listRuns({ since, limit: 500 });
    } else if (dataset === 'agents') {
      rows = await this.evaluationRepository.getQualityByDimension('agent', { since });
    } else if (dataset === 'prompts') {
      rows = await this.evaluationRepository.getQualityByDimension('prompt', { since });
    } else if (dataset === 'criteria') {
      rows = await this.evaluationRepository.getScoreByCriterion({ since });
    } else if (dataset === 'trend') {
      rows = (await this.getTrend({ granularity: 'daily', days: windowDays })).series;
    } else {
      rows = await this.evaluationRepository.listSuggestions({ limit: 200 });
    }

    if (format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `evaluation-${dataset}.csv`,
        format: 'csv',
        body: toCsv(rows),
      };
    }

    return {
      contentType: 'application/json; charset=utf-8',
      filename: `evaluation-${dataset}.json`,
      format: 'json',
      body: JSON.stringify({ dataset, windowDays, items: rows }, null, 2),
    };
  }

  async getOverview({ days = 30 } = {}) {
    const [dashboard, benchmark, workflow, suites, security] = await Promise.all([
      this.getDashboard({ days }),
      this.agentBenchmarkService.getBenchmark({ days }),
      this.workflowEvaluationService.getWorkflowQuality({ days }),
      this.evaluationRepository.getLatestSuiteRuns(10),
      this.getSecurityEvaluation(),
    ]);

    return {
      ...dashboard,
      benchmark: benchmark.agents,
      workflow,
      security,
      recentSuiteRuns: suites,
      criteriaCatalog: this.evaluationEngine.getCriteria(),
      thresholds: this.evaluationEngine.getThresholds(),
    };
  }

  async getSecurityEvaluation() {
    if (!this.securityDashboardService) {
      return {
        securityScore: 0,
        permissionScore: 0,
        tenantIsolationScore: 0,
        secretManagementScore: 0,
        authenticationHealth: 0,
        aclQuality: 0,
        unavailable: true,
      };
    }

    return this.securityDashboardService.getEvaluationScore();
  }
}
