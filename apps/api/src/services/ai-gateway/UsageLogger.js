export class UsageLogger {
  constructor({ pool, enabled = true } = {}) {
    this.pool = pool;
    this.enabled = enabled;
  }

  async log(entry) {
    if (!this.enabled || !this.pool) {
      return entry;
    }

    await this.pool.query(
      `
        INSERT INTO ai_usage (
          id, provider, model, conversation_id, user_id, prompt_tokens, completion_tokens,
          total_tokens, estimated_cost, duration_ms, status, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        entry.id,
        entry.provider,
        entry.model,
        entry.conversationId || null,
        entry.userId || null,
        entry.promptTokens || 0,
        entry.completionTokens || 0,
        entry.totalTokens || 0,
        entry.estimatedCost || 0,
        entry.durationMs || 0,
        entry.status,
        entry.errorMessage || null,
      ]
    );

    return entry;
  }

  async listUsage({ provider, model, date } = {}) {
    if (!this.pool) {
      return [];
    }

    const filters = [];
    const values = [];

    if (provider) {
      values.push(provider);
      filters.push(`provider = $${values.length}`);
    }

    if (model) {
      values.push(model);
      filters.push(`model = $${values.length}`);
    }

    if (date) {
      values.push(date);
      filters.push(`DATE(created_at) = $${values.length}::date`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `
        SELECT *
        FROM ai_usage
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 200
      `,
      values
    );

    return result.rows;
  }

  async getStatistics() {
    if (!this.pool) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        estimatedCost: 0,
        averageDurationMs: 0,
        byModel: [],
      };
    }

    const summaryResult = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total_requests,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
        COALESCE(AVG(duration_ms), 0)::float AS average_duration_ms
      FROM ai_usage
    `);

    const byModelResult = await this.pool.query(`
      SELECT
        model,
        provider,
        COUNT(*)::int AS requests,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost
      FROM ai_usage
      GROUP BY model, provider
      ORDER BY requests DESC
    `);

    const summary = summaryResult.rows[0] || {};

    return {
      totalRequests: summary.total_requests || 0,
      totalTokens: summary.total_tokens || 0,
      estimatedCost: Number(summary.estimated_cost || 0),
      averageDurationMs: Number(summary.average_duration_ms || 0),
      byModel: byModelResult.rows,
    };
  }
}
