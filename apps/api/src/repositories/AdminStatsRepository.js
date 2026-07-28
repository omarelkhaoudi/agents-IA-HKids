export class AdminStatsRepository {
  constructor(pool, { listDocuments, listPrompts }) {
    this.pool = pool;
    this.listDocuments = listDocuments;
    this.listPrompts = listPrompts;
  }

  async getPlatformCounts() {
    const [
      conversations,
      generatedDocuments,
      approvedDocuments,
      activeWorkflows,
      feedback,
      agents,
    ] = await Promise.all([
      this.pool.query('SELECT COUNT(*)::int AS total FROM conversations'),
      this.pool.query('SELECT COUNT(*)::int AS total FROM generated_documents'),
      this.pool.query('SELECT COUNT(*)::int AS total FROM generated_documents WHERE approved = true'),
      this.pool.query(
        `
          SELECT COUNT(*)::int AS total
          FROM workflow_instances
          WHERE current_state NOT IN ('Archived', 'Rejected')
        `
      ),
      this.pool.query('SELECT COUNT(*)::int AS total FROM feedback'),
      this.pool.query('SELECT COUNT(*)::int AS total FROM agents'),
    ]);

    return {
      totalAgents: agents.rows[0]?.total || 0,
      totalConversations: conversations.rows[0]?.total || 0,
      totalGeneratedDocuments: generatedDocuments.rows[0]?.total || 0,
      totalApprovedDocuments: approvedDocuments.rows[0]?.total || 0,
      activeWorkflows: activeWorkflows.rows[0]?.total || 0,
      knowledgeBaseDocuments: this.listDocuments().length,
      totalPrompts: this.listPrompts().length,
      totalFeedbacks: feedback.rows[0]?.total || 0,
    };
  }

  async getAiStatistics() {
    const summary = await this.pool.query(`
      SELECT
        COUNT(*)::int AS total_requests,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
        COALESCE(AVG(duration_ms), 0)::float AS average_duration_ms
      FROM ai_usage
    `);

    const byProvider = await this.pool.query(`
      SELECT
        provider,
        COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
        COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
        COUNT(*)::int AS requests
      FROM ai_usage
      GROUP BY provider
      ORDER BY estimated_cost DESC
    `);

    const byModel = await this.pool.query(`
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

    const byAgent = await this.pool.query(`
      SELECT
        a.code AS agent_code,
        a.name AS agent_name,
        COALESCE(SUM(u.estimated_cost), 0)::float AS estimated_cost,
        COALESCE(SUM(u.total_tokens), 0)::int AS total_tokens,
        COUNT(u.id)::int AS requests
      FROM agents a
      LEFT JOIN ai_usage u ON u.model = a.default_model
      GROUP BY a.code, a.name
      ORDER BY estimated_cost DESC
    `);

    const row = summary.rows[0] || {};

    return {
      totalAiCost: Number(row.estimated_cost || 0),
      totalTokens: row.total_tokens || 0,
      averageResponseMs: Number(row.average_duration_ms || 0),
      totalRequests: row.total_requests || 0,
      costByProvider: byProvider.rows,
      costByAgent: byAgent.rows,
      modelDistribution: byModel.rows,
    };
  }
}
