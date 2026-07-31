import { randomUUID } from 'node:crypto';

const QUALITY_DIMENSIONS = {
  agent: 'agent_code',
  model: 'model',
  provider: 'provider',
  prompt: 'prompt_id',
};

function toDate(value, fallbackMs) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(Date.now() - fallbackMs);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(toNumber(value) * factor) / factor;
}

/**
 * Persists evaluation runs, suites and improvement suggestions, and aggregates
 * them for the evaluation dashboards. Quality of prompts, documents, workflows
 * and agents is read from the tables already owned by those platforms; this
 * repository never re-implements their write paths.
 */
export class EvaluationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveRun(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO evaluation_runs (
          id, subject_type, subject_id, agent_code, conversation_id, message_id,
          prompt_id, prompt_version, knowledge_version, document_ids, workflow_id,
          workflow_state, provider, model, source, reviewer, latency_ms,
          prompt_tokens, completion_tokens, total_tokens, estimated_cost,
          overall_score, groundedness_score, hallucination_risk, knowledge_coverage,
          feedback_score, approval_state, verdict, response_characters, metadata, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30::jsonb, $31
        )
      `,
      [
        id,
        payload.subjectType || 'conversation',
        payload.subjectId || null,
        payload.agentCode || 'administrative-assistant',
        payload.conversationId || null,
        payload.messageId || null,
        payload.promptId || null,
        Math.round(toNumber(payload.promptVersion)),
        Math.round(toNumber(payload.knowledgeVersion)),
        JSON.stringify(payload.documentIds || []),
        payload.workflowId || null,
        payload.workflowState || '',
        payload.provider || '',
        payload.model || '',
        payload.source || 'automatic',
        payload.reviewer || '',
        Math.round(toNumber(payload.latencyMs)),
        Math.round(toNumber(payload.promptTokens)),
        Math.round(toNumber(payload.completionTokens)),
        Math.round(toNumber(payload.totalTokens)),
        round(payload.estimatedCost, 6),
        round(payload.overallScore),
        round(payload.groundednessScore),
        round(payload.hallucinationRisk),
        round(payload.knowledgeCoverage),
        round(payload.feedbackScore),
        payload.approvalState || 'unknown',
        payload.verdict || 'pass',
        Math.round(toNumber(payload.responseCharacters)),
        JSON.stringify(payload.metadata || {}),
        payload.createdAt ? toDate(payload.createdAt, 0) : new Date(),
      ]
    );

    for (const score of payload.scores || []) {
      await this.pool.query(
        `
          INSERT INTO evaluation_scores (id, run_id, criterion, score, weight, passed, rationale)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          randomUUID(),
          id,
          score.criterion,
          round(score.score),
          round(score.weight),
          score.passed !== false,
          score.rationale || '',
        ]
      );
    }

    return id;
  }

  buildRunFilters({ agentCode, promptId, conversationId, subjectType, verdict, source, since }) {
    const filters = [];
    const values = [];

    if (agentCode) {
      values.push(agentCode);
      filters.push(`agent_code = $${values.length}`);
    }

    if (promptId) {
      values.push(promptId);
      filters.push(`prompt_id = $${values.length}`);
    }

    if (conversationId) {
      values.push(conversationId);
      filters.push(`conversation_id = $${values.length}`);
    }

    if (subjectType) {
      values.push(subjectType);
      filters.push(`subject_type = $${values.length}`);
    }

    if (verdict) {
      values.push(verdict);
      filters.push(`verdict = $${values.length}`);
    }

    if (source) {
      values.push(source);
      filters.push(`source = $${values.length}`);
    }

    if (since) {
      values.push(toDate(since, 30 * 24 * 60 * 60 * 1000));
      filters.push(`created_at >= $${values.length}`);
    }

    return { filters, values };
  }

  async listRuns(options = {}) {
    const { filters, values } = this.buildRunFilters(options);
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    values.push(Math.min(Math.max(Number(options.limit) || 50, 1), 500));
    const limitPlaceholder = `$${values.length}`;
    values.push(Math.max(Number(options.offset) || 0, 0));
    const offsetPlaceholder = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT *
        FROM evaluation_runs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      values
    );

    return result.rows;
  }

  async countRuns(options = {}) {
    const { filters, values } = this.buildRunFilters(options);
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM evaluation_runs ${whereClause}`,
      values
    );

    return result.rows[0]?.total || 0;
  }

  async getRun(id) {
    const result = await this.pool.query('SELECT * FROM evaluation_runs WHERE id = $1', [id]);
    const run = result.rows[0];

    if (!run) {
      return null;
    }

    const scores = await this.pool.query(
      'SELECT * FROM evaluation_scores WHERE run_id = $1 ORDER BY criterion ASC',
      [id]
    );

    return { run, scores: scores.rows };
  }

  /**
   * Loads the raw evaluation window so trends, buckets and per-document
   * aggregation can be computed in JavaScript. Date bucketing is deliberately
   * kept out of SQL because the in-memory test database does not implement
   * date_trunc reliably.
   */
  async listRunWindow({ since, limit = 5000 } = {}) {
    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];
    values.push(Math.min(Math.max(Number(limit) || 5000, 1), 20000));

    const result = await this.pool.query(
      `
        SELECT *
        FROM evaluation_runs
        WHERE created_at >= $1
        ORDER BY created_at ASC
        LIMIT $2
      `,
      values
    );

    return result.rows;
  }

  async getQualitySummary({ since } = {}) {
    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];

    const result = await this.pool.query(
      `
        SELECT
          COUNT(*)::int AS total_runs,
          COALESCE(AVG(overall_score), 0) AS average_score,
          COALESCE(AVG(groundedness_score), 0) AS average_groundedness,
          COALESCE(AVG(hallucination_risk), 0) AS average_hallucination_risk,
          COALESCE(AVG(knowledge_coverage), 0) AS average_knowledge_coverage,
          COALESCE(AVG(feedback_score), 0) AS average_feedback,
          COALESCE(AVG(latency_ms), 0) AS average_latency_ms,
          COALESCE(AVG(total_tokens), 0) AS average_tokens,
          COALESCE(AVG(estimated_cost), 0) AS average_cost,
          COALESCE(SUM(estimated_cost), 0) AS total_cost,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
          COALESCE(SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END), 0)::int AS passed,
          COALESCE(SUM(CASE WHEN verdict = 'warn' THEN 1 ELSE 0 END), 0)::int AS warned,
          COALESCE(SUM(CASE WHEN verdict = 'fail' THEN 1 ELSE 0 END), 0)::int AS failed,
          COALESCE(SUM(CASE WHEN approval_state = 'approved' THEN 1 ELSE 0 END), 0)::int AS approved,
          COALESCE(SUM(CASE WHEN approval_state = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected
        FROM evaluation_runs
        WHERE created_at >= $1
      `,
      values
    );

    const row = result.rows[0] || {};
    const totalRuns = row.total_runs || 0;
    const decided = (row.approved || 0) + (row.rejected || 0);

    return {
      totalRuns,
      averageScore: round(row.average_score),
      averageGroundedness: round(row.average_groundedness),
      averageHallucinationRisk: round(row.average_hallucination_risk),
      averageKnowledgeCoverage: round(row.average_knowledge_coverage),
      averageFeedback: round(row.average_feedback),
      averageLatencyMs: round(row.average_latency_ms),
      averageTokens: round(row.average_tokens),
      averageCost: round(row.average_cost, 6),
      totalCost: round(row.total_cost, 6),
      totalTokens: row.total_tokens || 0,
      passed: row.passed || 0,
      warned: row.warned || 0,
      failed: row.failed || 0,
      approved: row.approved || 0,
      rejected: row.rejected || 0,
      passRate: totalRuns ? round(((row.passed || 0) / totalRuns) * 100) : 0,
      approvalRate: decided ? round(((row.approved || 0) / decided) * 100) : 0,
    };
  }

  async getScoreByCriterion({ since } = {}) {
    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];

    const result = await this.pool.query(
      `
        SELECT
          s.criterion AS criterion,
          COUNT(*)::int AS samples,
          COALESCE(AVG(s.score), 0) AS average_score,
          COALESCE(SUM(CASE WHEN s.passed THEN 0 ELSE 1 END), 0)::int AS failures
        FROM evaluation_scores s
        INNER JOIN evaluation_runs r ON r.id = s.run_id
        WHERE r.created_at >= $1
        GROUP BY s.criterion
        ORDER BY s.criterion ASC
      `,
      values
    );

    return result.rows.map((row) => ({
      criterion: row.criterion,
      samples: row.samples || 0,
      averageScore: round(row.average_score),
      failures: row.failures || 0,
    }));
  }

  async getQualityByDimension(dimension, { since, limit = 20 } = {}) {
    const column = QUALITY_DIMENSIONS[dimension];

    if (!column) {
      throw new Error(`Unsupported evaluation dimension: ${dimension}`);
    }

    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];
    values.push(Math.min(Math.max(Number(limit) || 20, 1), 100));

    const result = await this.pool.query(
      `
        SELECT
          COALESCE(${column}, 'unknown') AS key,
          COUNT(*)::int AS runs,
          COALESCE(AVG(overall_score), 0) AS average_score,
          COALESCE(AVG(groundedness_score), 0) AS average_groundedness,
          COALESCE(AVG(hallucination_risk), 0) AS average_hallucination_risk,
          COALESCE(AVG(knowledge_coverage), 0) AS average_knowledge_coverage,
          COALESCE(AVG(feedback_score), 0) AS average_feedback,
          COALESCE(AVG(latency_ms), 0) AS average_latency_ms,
          COALESCE(AVG(total_tokens), 0) AS average_tokens,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
          COALESCE(AVG(estimated_cost), 0) AS average_cost,
          COALESCE(SUM(estimated_cost), 0) AS total_cost,
          COALESCE(SUM(CASE WHEN verdict = 'fail' THEN 1 ELSE 0 END), 0)::int AS failed,
          COALESCE(SUM(CASE WHEN approval_state = 'approved' THEN 1 ELSE 0 END), 0)::int AS approved,
          COALESCE(SUM(CASE WHEN approval_state = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected
        FROM evaluation_runs
        WHERE created_at >= $1
        GROUP BY COALESCE(${column}, 'unknown')
        ORDER BY COUNT(*) DESC
        LIMIT $2
      `,
      values
    );

    return result.rows.map((row) => {
      const decided = (row.approved || 0) + (row.rejected || 0);

      return {
        key: row.key,
        runs: row.runs || 0,
        averageScore: round(row.average_score),
        averageGroundedness: round(row.average_groundedness),
        averageHallucinationRisk: round(row.average_hallucination_risk),
        averageKnowledgeCoverage: round(row.average_knowledge_coverage),
        averageFeedback: round(row.average_feedback),
        averageLatencyMs: round(row.average_latency_ms),
        averageTokens: round(row.average_tokens),
        totalTokens: row.total_tokens || 0,
        averageCost: round(row.average_cost, 6),
        totalCost: round(row.total_cost, 6),
        failed: row.failed || 0,
        approvalRate: decided ? round(((row.approved || 0) / decided) * 100) : 0,
      };
    });
  }

  async getPromptVersionQuality(promptId, version) {
    const result = await this.pool.query(
      `
        SELECT
          COUNT(*)::int AS runs,
          COALESCE(AVG(overall_score), 0) AS average_score,
          COALESCE(AVG(groundedness_score), 0) AS average_groundedness,
          COALESCE(AVG(knowledge_coverage), 0) AS average_knowledge_coverage,
          COALESCE(AVG(feedback_score), 0) AS average_feedback,
          COALESCE(AVG(latency_ms), 0) AS average_latency_ms,
          COALESCE(AVG(total_tokens), 0) AS average_tokens,
          COALESCE(AVG(estimated_cost), 0) AS average_cost,
          COALESCE(SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END), 0)::int AS passed,
          COALESCE(SUM(CASE WHEN approval_state = 'approved' THEN 1 ELSE 0 END), 0)::int AS approved,
          COALESCE(SUM(CASE WHEN approval_state = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected
        FROM evaluation_runs
        WHERE prompt_id = $1 AND prompt_version = $2
      `,
      [promptId, Math.round(toNumber(version))]
    );

    const row = result.rows[0] || {};
    const runs = row.runs || 0;
    const decided = (row.approved || 0) + (row.rejected || 0);

    return {
      version: Math.round(toNumber(version)),
      runs,
      averageScore: round(row.average_score),
      averageGroundedness: round(row.average_groundedness),
      averageKnowledgeCoverage: round(row.average_knowledge_coverage),
      averageFeedback: round(row.average_feedback),
      averageLatencyMs: round(row.average_latency_ms),
      averageTokens: round(row.average_tokens),
      averageCost: round(row.average_cost, 6),
      successRate: runs ? round(((row.passed || 0) / runs) * 100) : 0,
      approvalRate: decided ? round(((row.approved || 0) / decided) * 100) : 0,
    };
  }

  async listPromptVersionsEvaluated(promptId) {
    const result = await this.pool.query(
      `
        SELECT prompt_version AS version, COUNT(*)::int AS runs
        FROM evaluation_runs
        WHERE prompt_id = $1
        GROUP BY prompt_version
        ORDER BY prompt_version ASC
      `,
      [promptId]
    );

    return result.rows.map((row) => ({
      version: Math.round(toNumber(row.version)),
      runs: row.runs || 0,
    }));
  }

  async listSuites({ agentCode, status } = {}) {
    const filters = [];
    const values = [];

    if (agentCode) {
      values.push(agentCode);
      filters.push(`agent_code = $${values.length}`);
    }

    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await this.pool.query(
      `SELECT * FROM evaluation_suites ${whereClause} ORDER BY name ASC`,
      values
    );

    return result.rows;
  }

  async getSuite(id) {
    const result = await this.pool.query('SELECT * FROM evaluation_suites WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getSuiteByCode(code) {
    const result = await this.pool.query('SELECT * FROM evaluation_suites WHERE code = $1', [code]);
    return result.rows[0] || null;
  }

  async createSuite(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO evaluation_suites (
          id, code, name, description, agent_code, status, acceptance_threshold, owner
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id,
        payload.code,
        payload.name,
        payload.description || '',
        payload.agentCode || 'administrative-assistant',
        payload.status || 'active',
        round(payload.acceptanceThreshold ?? 70),
        payload.owner || '',
      ]
    );

    return this.getSuite(id);
  }

  async listCases(suiteId) {
    const result = await this.pool.query(
      'SELECT * FROM evaluation_cases WHERE suite_id = $1 ORDER BY position ASC, name ASC',
      [suiteId]
    );

    return result.rows;
  }

  async createCase(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO evaluation_cases (
          id, suite_id, name, input_text, expected_output, rules, weight, position
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      `,
      [
        id,
        payload.suiteId,
        payload.name,
        payload.inputText || '',
        payload.expectedOutput || '',
        JSON.stringify(payload.rules || {}),
        round(payload.weight ?? 1),
        Math.round(toNumber(payload.position)),
      ]
    );

    return id;
  }

  async saveSuiteRun(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO evaluation_suite_runs (
          id, suite_id, status, total_cases, passed_cases, failed_cases,
          average_score, acceptance_threshold, duration_ms, actor, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
      `,
      [
        id,
        payload.suiteId,
        payload.status || 'passed',
        Math.round(toNumber(payload.totalCases)),
        Math.round(toNumber(payload.passedCases)),
        Math.round(toNumber(payload.failedCases)),
        round(payload.averageScore),
        round(payload.acceptanceThreshold ?? 70),
        Math.round(toNumber(payload.durationMs)),
        payload.actor || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return id;
  }

  async saveCaseResult(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO evaluation_case_results (
          id, suite_run_id, case_id, run_id, passed, score, output_text, failure_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        id,
        payload.suiteRunId,
        payload.caseId,
        payload.runId || null,
        payload.passed !== false,
        round(payload.score),
        payload.outputText || '',
        payload.failureReason || '',
      ]
    );

    return id;
  }

  async listSuiteRuns(suiteId, { limit = 20 } = {}) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM evaluation_suite_runs
        WHERE suite_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [suiteId, Math.min(Math.max(Number(limit) || 20, 1), 100)]
    );

    return result.rows;
  }

  async listCaseResults(suiteRunId) {
    const result = await this.pool.query(
      'SELECT * FROM evaluation_case_results WHERE suite_run_id = $1 ORDER BY created_at ASC',
      [suiteRunId]
    );

    return result.rows;
  }

  async getLatestSuiteRuns(limit = 20) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM evaluation_suite_runs
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 20, 1), 100)]
    );

    return result.rows;
  }

  async saveSuggestion(payload = {}) {
    const existing = await this.pool.query(
      `
        SELECT id FROM evaluation_suggestions
        WHERE category = $1 AND COALESCE(target_id, '') = $2 AND title = $3 AND status = 'pending'
      `,
      [payload.category || 'prompt', payload.targetId || '', payload.title]
    );

    if (existing.rows[0]) {
      const updated = await this.pool.query(
        `
          UPDATE evaluation_suggestions
          SET suggestion = $2, rationale = $3, impact = $4, evidence = $5::jsonb
          WHERE id = $1
          RETURNING *
        `,
        [
          existing.rows[0].id,
          payload.suggestion || '',
          payload.rationale || '',
          payload.impact || 'medium',
          JSON.stringify(payload.evidence || {}),
        ]
      );

      return updated.rows[0];
    }

    const id = payload.id || randomUUID();

    const inserted = await this.pool.query(
      `
        INSERT INTO evaluation_suggestions (
          id, category, target_type, target_id, title, suggestion, rationale, impact, evidence
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING *
      `,
      [
        id,
        payload.category || 'prompt',
        payload.targetType || '',
        payload.targetId || null,
        payload.title,
        payload.suggestion || '',
        payload.rationale || '',
        payload.impact || 'medium',
        JSON.stringify(payload.evidence || {}),
      ]
    );

    return inserted.rows[0];
  }

  async listSuggestions({ status, category, limit = 50 } = {}) {
    const filters = [];
    const values = [];

    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }

    if (category) {
      values.push(category);
      filters.push(`category = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));

    const result = await this.pool.query(
      `
        SELECT *
        FROM evaluation_suggestions
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length}
      `,
      values
    );

    return result.rows;
  }

  async updateSuggestionStatus(id, { status, actor = '' }) {
    const result = await this.pool.query(
      `
        UPDATE evaluation_suggestions
        SET status = $2, reviewed_by = $3, reviewed_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, status, actor]
    );

    return result.rows[0] || null;
  }

  async getSuggestionCounts() {
    const result = await this.pool.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0)::int AS pending,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0)::int AS approved,
          COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)::int AS rejected
        FROM evaluation_suggestions
      `
    );

    const row = result.rows[0] || {};

    return {
      pending: row.pending || 0,
      approved: row.approved || 0,
      rejected: row.rejected || 0,
    };
  }

  /**
   * Reads the correction signals already captured by the Feedback Engine so the
   * evaluation layer can turn them into improvement suggestions without owning
   * a second feedback store.
   */
  async getFeedbackSignals({ since, limit = 500 } = {}) {
    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];
    values.push(Math.min(Math.max(Number(limit) || 500, 1), 2000));

    const [feedback, patterns, corrections] = await Promise.all([
      this.pool.query(
        `
          SELECT agent_code, feedback_type, rating, comment, created_at
          FROM feedback
          WHERE created_at >= $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        values
      ),
      this.pool.query(
        `
          SELECT pattern_type, pattern_text, occurrences, status, metadata
          FROM feedback_patterns
          ORDER BY occurrences DESC
          LIMIT 50
        `
      ),
      this.pool.query(
        `
          SELECT correction_type, COUNT(*)::int AS occurrences
          FROM document_corrections
          GROUP BY correction_type
          ORDER BY COUNT(*) DESC
          LIMIT 25
        `
      ),
    ]);

    return {
      feedback: feedback.rows,
      patterns: patterns.rows,
      corrections: corrections.rows,
    };
  }

  /**
   * Aggregates the existing workflow tables so workflow quality is measured
   * from the Workflow Engine's own state machine rather than a parallel model.
   */
  async getWorkflowEvaluation({ since } = {}) {
    const sinceDate = toDate(since, 30 * 24 * 60 * 60 * 1000);

    const [states, durations, revisions, exports] = await Promise.all([
      this.pool.query(
        `
          SELECT current_state AS state, COUNT(*)::int AS total
          FROM workflow_instances
          GROUP BY current_state
          ORDER BY COUNT(*) DESC
        `
      ),
      this.pool.query(
        `
          SELECT created_at, updated_at
          FROM workflow_instances
          WHERE created_at >= $1
        `,
        [sinceDate]
      ),
      this.pool.query(
        `
          SELECT new_state AS state, COUNT(*)::int AS total
          FROM workflow_history
          WHERE created_at >= $1
          GROUP BY new_state
        `,
        [sinceDate]
      ),
      this.pool.query(
        `
          SELECT
            COUNT(*)::int AS total_documents,
            COALESCE(SUM(CASE WHEN approved THEN 1 ELSE 0 END), 0)::int AS approved_documents
          FROM generated_documents
          WHERE created_at >= $1
        `,
        [sinceDate]
      ),
    ]);

    const historyByState = new Map(
      revisions.rows.map((row) => [row.state, Math.round(toNumber(row.total))])
    );

    const durationSamples = durations.rows
      .map((row) => toDate(row.updated_at, 0).getTime() - toDate(row.created_at, 0).getTime())
      .filter((value) => Number.isFinite(value) && value >= 0);
    const averageDurationSeconds = durationSamples.length
      ? durationSamples.reduce((total, value) => total + value, 0) / durationSamples.length / 1000
      : 0;

    return {
      states: states.rows.map((row) => ({ state: row.state, total: row.total || 0 })),
      totalWorkflows: durations.rows.length,
      averageDurationSeconds: round(averageDurationSeconds),
      transitions: {
        approved: historyByState.get('Approved') || 0,
        rejected: historyByState.get('Rejected') || 0,
        needsChanges: historyByState.get('Needs Changes') || 0,
        exported: historyByState.get('Exported') || 0,
        archived: historyByState.get('Archived') || 0,
      },
      totalDocuments: exports.rows[0]?.total_documents || 0,
      approvedDocuments: exports.rows[0]?.approved_documents || 0,
    };
  }

  /**
   * Reads the Knowledge Platform's own counters. Freshness uses updated_at
   * because created_date/updated_date are display strings, not timestamps.
   */
  async getKnowledgeEvaluation({ staleDays = 90, limit = 10 } = {}) {
    const staleBefore = new Date(Date.now() - Math.max(Number(staleDays) || 90, 1) * 86400000);
    const rowLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const [totals, mostUseful, unused, stale, collections] = await Promise.all([
      this.pool.query(
        `
          SELECT
            COUNT(*)::int AS total_documents,
            COALESCE(SUM(CASE WHEN ai_usage_count > 0 THEN 1 ELSE 0 END), 0)::int AS retrieved_documents,
            COALESCE(SUM(ai_usage_count), 0)::int AS total_retrievals,
            COALESCE(AVG(quality_score), 0) AS average_quality,
            COALESCE(AVG(completeness_score), 0) AS average_completeness,
            COALESCE(SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END), 0)::int AS in_review
          FROM knowledge_documents
          WHERE deleted_at IS NULL AND status <> 'deleted'
        `
      ),
      this.pool.query(
        `
          SELECT id, title, category, collection_id, ai_usage_count, view_count, quality_score, updated_at
          FROM knowledge_documents
          WHERE deleted_at IS NULL AND status <> 'deleted' AND ai_usage_count > 0
          ORDER BY ai_usage_count DESC
          LIMIT $1
        `,
        [rowLimit]
      ),
      this.pool.query(
        `
          SELECT id, title, category, collection_id, updated_at
          FROM knowledge_documents
          WHERE deleted_at IS NULL AND status <> 'deleted' AND ai_usage_count = 0
          ORDER BY updated_at ASC
          LIMIT $1
        `,
        [rowLimit]
      ),
      this.pool.query(
        `
          SELECT id, title, category, updated_at
          FROM knowledge_documents
          WHERE deleted_at IS NULL AND status <> 'deleted' AND updated_at < $1
          ORDER BY updated_at ASC
          LIMIT $2
        `,
        [staleBefore, rowLimit]
      ),
      this.pool.query(
        `
          SELECT
            c.id AS id,
            c.name AS name,
            c.status AS status,
            COUNT(d.id)::int AS documents,
            COALESCE(SUM(d.ai_usage_count), 0)::int AS retrievals,
            COALESCE(AVG(d.quality_score), 0) AS average_quality
          FROM knowledge_collections c
          LEFT JOIN knowledge_documents d
            ON d.collection_id = c.id AND d.deleted_at IS NULL AND d.status <> 'deleted'
          GROUP BY c.id, c.name, c.status
          ORDER BY COUNT(d.id) DESC
        `
      ),
    ]);

    const totalsRow = totals.rows[0] || {};
    const totalDocuments = totalsRow.total_documents || 0;

    return {
      totalDocuments,
      retrievedDocuments: totalsRow.retrieved_documents || 0,
      totalRetrievals: totalsRow.total_retrievals || 0,
      averageQuality: round(totalsRow.average_quality),
      averageCompleteness: round(totalsRow.average_completeness),
      documentsInReview: totalsRow.in_review || 0,
      coveragePercent: totalDocuments
        ? round(((totalsRow.retrieved_documents || 0) / totalDocuments) * 100)
        : 0,
      mostUseful: mostUseful.rows,
      unused: unused.rows,
      stale: stale.rows,
      collections: collections.rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        documents: row.documents || 0,
        retrievals: row.retrievals || 0,
        averageQuality: round(row.average_quality),
      })),
    };
  }

  /**
   * Reads the Prompt Platform's own counters so prompt metrics stay consistent
   * with the numbers already shown in the prompt console.
   */
  async getPromptCatalog({ limit = 50 } = {}) {
    const result = await this.pool.query(
      `
        SELECT
          id, name, status, version, agent_code, category,
          usage_count, success_count, approval_count, rejection_count,
          feedback_score, quality_score, completeness_score, average_latency_ms,
          knowledge_collection_ids, updated_at
        FROM prompt_definitions
        ORDER BY usage_count DESC
        LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 50, 1), 200)]
    );

    return result.rows;
  }

  async getPromptById(promptId) {
    const result = await this.pool.query(
      `
        SELECT
          id, name, status, version, agent_code, category,
          usage_count, success_count, approval_count, rejection_count,
          feedback_score, quality_score, completeness_score, average_latency_ms,
          knowledge_collection_ids, updated_at
        FROM prompt_definitions
        WHERE id = $1
      `,
      [promptId]
    );

    return result.rows[0] || null;
  }

  async listConversationDocumentIds(conversationId) {
    const result = await this.pool.query(
      'SELECT document_id FROM conversation_knowledge WHERE conversation_id = $1',
      [conversationId]
    );

    return result.rows.map((row) => row.document_id).filter(Boolean);
  }

  async getConversationPromptId(conversationId) {
    const result = await this.pool.query(
      'SELECT prompt_id FROM conversation_prompts WHERE conversation_id = $1 LIMIT 1',
      [conversationId]
    );

    return result.rows[0]?.prompt_id || null;
  }

  async listDocumentSummaries(documentIds = []) {
    const ids = [...new Set(documentIds.filter(Boolean))].slice(0, 200);

    if (!ids.length) {
      return [];
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');

    const result = await this.pool.query(
      `
        SELECT id, title, category, collection_id, status, ai_usage_count, quality_score, updated_at
        FROM knowledge_documents
        WHERE id IN (${placeholders})
      `,
      ids
    );

    return result.rows;
  }

  async listCollectionSummaries() {
    const result = await this.pool.query(
      'SELECT id, name, status FROM knowledge_collections ORDER BY name ASC'
    );

    return result.rows;
  }

  async listAgents() {
    const result = await this.pool.query(
      'SELECT code, name, status, default_provider, default_model FROM agents ORDER BY name ASC'
    );

    return result.rows;
  }
}
