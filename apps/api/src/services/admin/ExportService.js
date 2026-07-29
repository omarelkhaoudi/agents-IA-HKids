function toCsv(rows) {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ].join('\n');
}

export class ExportService {
  constructor({ pool, dashboardService }) {
    this.pool = pool;
    this.dashboardService = dashboardService;
  }

  async exportAiUsage() {
    const result = await this.pool.query(`
      SELECT
        id,
        provider,
        model,
        agent_code,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        estimated_cost,
        duration_ms,
        user_id,
        created_at
      FROM ai_usage
      ORDER BY created_at DESC
      LIMIT 5000
    `);
    return result.rows;
  }

  async exportFeedback() {
    const result = await this.pool.query(`
      SELECT
        id,
        conversation_id,
        message_id,
        document_id,
        feedback_type,
        rating,
        comment,
        created_at
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 5000
    `);
    return result.rows;
  }

  async exportGeneratedDocuments() {
    const result = await this.pool.query(`
      SELECT
        id,
        conversation_id,
        agent_code,
        document_type,
        approved,
        created_at,
        updated_at
      FROM generated_documents
      ORDER BY created_at DESC
      LIMIT 5000
    `);
    return result.rows;
  }

  async exportStatistics() {
    const dashboard = await this.dashboardService.getDashboard();
    return [
      {
        metric: 'total_agents',
        value: dashboard.totalAgents,
      },
      {
        metric: 'total_conversations',
        value: dashboard.totalConversations,
      },
      {
        metric: 'total_generated_documents',
        value: dashboard.totalGeneratedDocuments,
      },
      {
        metric: 'total_approved_documents',
        value: dashboard.totalApprovedDocuments,
      },
      {
        metric: 'active_workflows',
        value: dashboard.activeWorkflows,
      },
      {
        metric: 'total_feedbacks',
        value: dashboard.totalFeedbacks,
      },
      {
        metric: 'total_ai_cost',
        value: dashboard.totalAiCost,
      },
      {
        metric: 'total_tokens',
        value: dashboard.totalTokens,
      },
      {
        metric: 'total_requests',
        value: dashboard.totalRequests,
      },
      {
        metric: 'average_response_ms',
        value: dashboard.averageResponseMs,
      },
    ];
  }

  async export(type) {
    switch (type) {
      case 'ai-usage':
        return this.exportAiUsage();
      case 'feedback':
        return this.exportFeedback();
      case 'generated-documents':
        return this.exportGeneratedDocuments();
      case 'statistics':
        return this.exportStatistics();
      default:
        throw Object.assign(new Error(`Unsupported export type: ${type}`), { statusCode: 400 });
    }
  }

  async exportAs(type, format = 'json') {
    const rows = await this.export(type);

    if (format === 'csv') {
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `${type}-${new Date().toISOString().slice(0, 10)}.csv`,
        body: toCsv(rows),
      };
    }

    return {
      contentType: 'application/json; charset=utf-8',
      filename: `${type}-${new Date().toISOString().slice(0, 10)}.json`,
      body: JSON.stringify({ type, exportedAt: new Date().toISOString(), items: rows }, null, 2),
    };
  }
}
