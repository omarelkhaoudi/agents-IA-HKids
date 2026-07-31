import { randomUUID } from 'node:crypto';

const USAGE_DIMENSIONS = {
  agent: 'agent_code',
  model: 'model',
  provider: 'provider',
  user: 'user_id',
};

const ACTIVE_WORKFLOW_STATES = ['Draft', 'Pending Review', 'In Progress'];
const FAILED_WORKFLOW_STATES = ['Rejected', 'Failed'];

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

export class ObservabilityRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async recordEvent(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO observability_events (
          id, event_type, category, severity, source, actor, subject_type, subject_id,
          agent_code, conversation_id, request_id, summary, duration_ms, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
      `,
      [
        id,
        payload.eventType,
        payload.category || 'system',
        payload.severity || 'info',
        payload.source || 'api',
        payload.actor || '',
        payload.subjectType || '',
        payload.subjectId || null,
        payload.agentCode || null,
        payload.conversationId || null,
        payload.requestId || null,
        payload.summary || '',
        Math.round(toNumber(payload.durationMs)),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return id;
  }

  async listEvents({
    category,
    severity,
    eventType,
    actor,
    subjectId,
    agentCode,
    since,
    limit = 100,
    offset = 0,
  } = {}) {
    const filters = [];
    const values = [];

    if (category) {
      values.push(category);
      filters.push(`category = $${values.length}`);
    }

    if (severity) {
      values.push(severity);
      filters.push(`severity = $${values.length}`);
    }

    if (eventType) {
      values.push(eventType);
      filters.push(`event_type = $${values.length}`);
    }

    if (actor) {
      values.push(actor);
      filters.push(`actor = $${values.length}`);
    }

    if (subjectId) {
      values.push(subjectId);
      filters.push(`subject_id = $${values.length}`);
    }

    if (agentCode) {
      values.push(agentCode);
      filters.push(`agent_code = $${values.length}`);
    }

    if (since) {
      values.push(toDate(since, 24 * 60 * 60 * 1000));
      filters.push(`created_at >= $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    values.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
    const limitPlaceholder = `$${values.length}`;
    values.push(Math.max(Number(offset) || 0, 0));
    const offsetPlaceholder = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT *
        FROM observability_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      values
    );

    return result.rows;
  }

  async countEvents({ category, severity, eventType, since } = {}) {
    const filters = [];
    const values = [];

    if (category) {
      values.push(category);
      filters.push(`category = $${values.length}`);
    }

    if (severity) {
      values.push(severity);
      filters.push(`severity = $${values.length}`);
    }

    if (eventType) {
      values.push(eventType);
      filters.push(`event_type = $${values.length}`);
    }

    if (since) {
      values.push(toDate(since, 24 * 60 * 60 * 1000));
      filters.push(`created_at >= $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM observability_events ${whereClause}`,
      values
    );

    return result.rows[0]?.total || 0;
  }

  async getUsageSummary({ since } = {}) {
    const values = [];
    let whereClause = '';

    if (since) {
      values.push(toDate(since, 60 * 60 * 1000));
      whereClause = `WHERE created_at >= $${values.length}`;
    }

    const result = await this.pool.query(
      `
        SELECT
          COUNT(*)::int AS total_requests,
          COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0)::int AS success_requests,
          COALESCE(SUM(CASE WHEN status <> 'success' THEN 1 ELSE 0 END), 0)::int AS failed_requests,
          COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens,
          COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
          COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
          COALESCE(AVG(duration_ms), 0)::float AS average_duration_ms,
          COALESCE(MAX(duration_ms), 0)::int AS max_duration_ms
        FROM ai_usage
        ${whereClause}
      `,
      values
    );

    const row = result.rows[0] || {};

    return {
      totalRequests: row.total_requests || 0,
      successRequests: row.success_requests || 0,
      failedRequests: row.failed_requests || 0,
      promptTokens: row.prompt_tokens || 0,
      completionTokens: row.completion_tokens || 0,
      totalTokens: row.total_tokens || 0,
      estimatedCost: toNumber(row.estimated_cost),
      averageDurationMs: toNumber(row.average_duration_ms),
      maxDurationMs: row.max_duration_ms || 0,
    };
  }

  async listUsageWindow({ since, limit = 5000 } = {}) {
    const values = [toDate(since, 30 * 24 * 60 * 60 * 1000)];
    values.push(Math.min(Math.max(Number(limit) || 5000, 1), 20000));

    const result = await this.pool.query(
      `
        SELECT
          id, provider, model, agent_code, user_id, conversation_id, status,
          prompt_tokens, completion_tokens, total_tokens, estimated_cost, duration_ms,
          error_message, created_at
        FROM ai_usage
        WHERE created_at >= $1
        ORDER BY created_at ASC
        LIMIT $2
      `,
      values
    );

    return result.rows;
  }

  async getUsageByDimension(dimension, { since, limit = 20 } = {}) {
    const column = USAGE_DIMENSIONS[dimension];

    if (!column) {
      throw new Error(`Unsupported usage dimension: ${dimension}`);
    }

    const values = [];
    let whereClause = '';

    if (since) {
      values.push(toDate(since, 30 * 24 * 60 * 60 * 1000));
      whereClause = `WHERE created_at >= $${values.length}`;
    }

    values.push(Math.min(Math.max(Number(limit) || 20, 1), 100));

    const result = await this.pool.query(
      `
        SELECT
          ${column} AS dimension_value,
          COUNT(*)::int AS requests,
          COALESCE(SUM(CASE WHEN status <> 'success' THEN 1 ELSE 0 END), 0)::int AS failed_requests,
          COALESCE(SUM(prompt_tokens), 0)::int AS prompt_tokens,
          COALESCE(SUM(completion_tokens), 0)::int AS completion_tokens,
          COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
          COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
          COALESCE(AVG(duration_ms), 0)::float AS average_duration_ms
        FROM ai_usage
        ${whereClause}
        GROUP BY ${column}
        ORDER BY requests DESC
        LIMIT $${values.length}
      `,
      values
    );

    return result.rows.map((row) => ({
      key: row.dimension_value || 'unknown',
      requests: row.requests || 0,
      failedRequests: row.failed_requests || 0,
      promptTokens: row.prompt_tokens || 0,
      completionTokens: row.completion_tokens || 0,
      totalTokens: row.total_tokens || 0,
      estimatedCost: toNumber(row.estimated_cost),
      averageDurationMs: toNumber(row.average_duration_ms),
    }));
  }

  async getAgentUsage({ since } = {}) {
    const values = [];
    let joinClause = 'LEFT JOIN ai_usage u ON u.agent_code = a.code';

    if (since) {
      values.push(toDate(since, 30 * 24 * 60 * 60 * 1000));
      joinClause = `LEFT JOIN ai_usage u ON u.agent_code = a.code AND u.created_at >= $${values.length}`;
    }

    const result = await this.pool.query(
      `
        SELECT
          a.code AS agent_code,
          a.name AS agent_name,
          COUNT(u.id)::int AS requests,
          COALESCE(SUM(CASE WHEN u.status <> 'success' THEN 1 ELSE 0 END), 0)::int AS failed_requests,
          COALESCE(SUM(u.total_tokens), 0)::int AS total_tokens,
          COALESCE(SUM(u.estimated_cost), 0)::float AS estimated_cost,
          COALESCE(AVG(u.duration_ms), 0)::float AS average_duration_ms
        FROM agents a
        ${joinClause}
        GROUP BY a.code, a.name
        ORDER BY requests DESC
      `,
      values
    );

    return result.rows.map((row) => ({
      agentCode: row.agent_code,
      agentName: row.agent_name,
      requests: row.requests || 0,
      failedRequests: row.failed_requests || 0,
      totalTokens: row.total_tokens || 0,
      estimatedCost: toNumber(row.estimated_cost),
      averageDurationMs: toNumber(row.average_duration_ms),
    }));
  }

  async listRecentFailures({ since, limit = 20 } = {}) {
    const values = [toDate(since, 24 * 60 * 60 * 1000)];
    values.push(Math.min(Math.max(Number(limit) || 20, 1), 100));

    const result = await this.pool.query(
      `
        SELECT id, provider, model, agent_code, conversation_id, duration_ms, error_message, created_at
        FROM ai_usage
        WHERE status <> 'success' AND created_at >= $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      values
    );

    return result.rows;
  }

  async listConversationLogs({ search, agentCode, limit = 25, offset = 0 } = {}) {
    const filters = [];
    const values = [];

    if (search) {
      values.push(`%${String(search).toLowerCase()}%`);
      filters.push(`LOWER(c.title) LIKE $${values.length}`);
    }

    if (agentCode) {
      values.push(agentCode);
      filters.push(`c.agent_code = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    values.push(Math.min(Math.max(Number(limit) || 25, 1), 200));
    const limitPlaceholder = `$${values.length}`;
    values.push(Math.max(Number(offset) || 0, 0));
    const offsetPlaceholder = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT
          c.id, c.title, c.provider, c.model, c.language, c.agent_code, c.created_at, c.updated_at
        FROM conversations c
        ${whereClause}
        ORDER BY c.updated_at DESC
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
      `,
      values
    );

    const conversations = result.rows;

    if (conversations.length === 0) {
      return [];
    }

    const [messages, usage, documents, knowledge, prompts] = await Promise.all([
      this.pool.query(
        `SELECT conversation_id, COUNT(*)::int AS total FROM messages GROUP BY conversation_id`
      ),
      this.pool.query(
        `
          SELECT
            conversation_id,
            COUNT(*)::int AS requests,
            COALESCE(SUM(CASE WHEN status <> 'success' THEN 1 ELSE 0 END), 0)::int AS failed_requests,
            COALESCE(SUM(total_tokens), 0)::int AS total_tokens,
            COALESCE(SUM(estimated_cost), 0)::float AS estimated_cost,
            COALESCE(AVG(duration_ms), 0)::float AS average_duration_ms
          FROM ai_usage
          WHERE conversation_id IS NOT NULL
          GROUP BY conversation_id
        `
      ),
      this.pool.query(
        `
          SELECT
            conversation_id,
            COUNT(*)::int AS total,
            COALESCE(SUM(CASE WHEN approved = true THEN 1 ELSE 0 END), 0)::int AS approved
          FROM generated_documents
          GROUP BY conversation_id
        `
      ),
      this.pool.query(
        `SELECT conversation_id, COUNT(*)::int AS total FROM conversation_knowledge GROUP BY conversation_id`
      ),
      this.pool.query(
        `SELECT conversation_id, COUNT(*)::int AS total FROM conversation_prompts GROUP BY conversation_id`
      ),
    ]);

    const workflows = await this.pool.query(
      `
        SELECT w.conversation_id, w.current_state, COUNT(*)::int AS total
        FROM workflow_instances w
        GROUP BY w.conversation_id, w.current_state
      `
    );

    const messageMap = new Map(messages.rows.map((row) => [row.conversation_id, row.total]));
    const usageMap = new Map(usage.rows.map((row) => [row.conversation_id, row]));
    const documentMap = new Map(documents.rows.map((row) => [row.conversation_id, row]));
    const knowledgeMap = new Map(knowledge.rows.map((row) => [row.conversation_id, row.total]));
    const promptMap = new Map(prompts.rows.map((row) => [row.conversation_id, row.total]));
    const workflowMap = new Map();

    for (const row of workflows.rows) {
      const entry = workflowMap.get(row.conversation_id) || { total: 0, states: [] };
      entry.total += row.total;
      entry.states.push({ state: row.current_state, count: row.total });
      workflowMap.set(row.conversation_id, entry);
    }

    return conversations.map((conversation) => {
      const usageRow = usageMap.get(conversation.id) || {};
      const documentRow = documentMap.get(conversation.id) || {};
      const workflowRow = workflowMap.get(conversation.id) || { total: 0, states: [] };

      return {
        id: conversation.id,
        title: conversation.title,
        provider: conversation.provider,
        model: conversation.model,
        language: conversation.language,
        agentCode: conversation.agent_code,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        messageCount: messageMap.get(conversation.id) || 0,
        aiRequests: usageRow.requests || 0,
        failedRequests: usageRow.failed_requests || 0,
        totalTokens: usageRow.total_tokens || 0,
        estimatedCost: toNumber(usageRow.estimated_cost),
        averageDurationMs: toNumber(usageRow.average_duration_ms),
        generatedDocuments: documentRow.total || 0,
        approvedDocuments: documentRow.approved || 0,
        knowledgeUsed: knowledgeMap.get(conversation.id) || 0,
        promptsUsed: promptMap.get(conversation.id) || 0,
        workflows: workflowRow.total,
        workflowStates: workflowRow.states,
      };
    });
  }

  async countConversationLogs({ search, agentCode } = {}) {
    const filters = [];
    const values = [];

    if (search) {
      values.push(`%${String(search).toLowerCase()}%`);
      filters.push(`LOWER(title) LIKE $${values.length}`);
    }

    if (agentCode) {
      values.push(agentCode);
      filters.push(`agent_code = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM conversations ${whereClause}`,
      values
    );

    return result.rows[0]?.total || 0;
  }

  async getConversationLog(conversationId) {
    const conversation = await this.pool.query(
      `SELECT * FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (conversation.rows.length === 0) {
      return null;
    }

    const [messages, usage, documents, knowledge, prompts, workflows] = await Promise.all([
      this.pool.query(
        `
          SELECT id, role, content, metadata, created_at
          FROM messages
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          LIMIT 500
        `,
        [conversationId]
      ),
      this.pool.query(
        `
          SELECT id, provider, model, agent_code, user_id, prompt_tokens, completion_tokens,
                 total_tokens, estimated_cost, duration_ms, status, error_message, created_at
          FROM ai_usage
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          LIMIT 500
        `,
        [conversationId]
      ),
      this.pool.query(
        `
          SELECT id, document_type, reference, status, approved, approved_by, approved_at,
                 version, available_export_formats, created_at, updated_at
          FROM generated_documents
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          LIMIT 200
        `,
        [conversationId]
      ),
      this.pool.query(
        `SELECT document_id, created_at FROM conversation_knowledge WHERE conversation_id = $1`,
        [conversationId]
      ),
      this.pool.query(
        `SELECT prompt_id, created_at FROM conversation_prompts WHERE conversation_id = $1`,
        [conversationId]
      ),
      this.pool.query(
        `
          SELECT id, document_id, current_state, approver_mode, required_approvals, created_at, updated_at
          FROM workflow_instances
          WHERE conversation_id = $1
          ORDER BY created_at ASC
          LIMIT 200
        `,
        [conversationId]
      ),
    ]);

    const workflowIds = workflows.rows.map((row) => row.id);
    let workflowHistory = [];

    if (workflowIds.length > 0) {
      const placeholders = workflowIds.map((_, index) => `$${index + 1}`).join(', ');
      const history = await this.pool.query(
        `
          SELECT id, workflow_instance_id, actor, previous_state, new_state, comment, created_at
          FROM workflow_history
          WHERE workflow_instance_id IN (${placeholders})
          ORDER BY created_at ASC
          LIMIT 500
        `,
        workflowIds
      );
      workflowHistory = history.rows;
    }

    const events = await this.pool.query(
      `
        SELECT id, event_type, category, severity, actor, summary, duration_ms, metadata, created_at
        FROM observability_events
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT 200
      `,
      [conversationId]
    );

    return {
      conversation: conversation.rows[0],
      messages: messages.rows,
      aiUsage: usage.rows,
      generatedDocuments: documents.rows,
      knowledgeUsed: knowledge.rows,
      promptsUsed: prompts.rows,
      workflows: workflows.rows,
      workflowHistory,
      events: events.rows,
    };
  }

  async getApprovalStatistics() {
    const [documents, workflows, knowledge] = await Promise.all([
      this.pool.query(
        `
          SELECT
            COUNT(*)::int AS total,
            COALESCE(SUM(CASE WHEN approved = true THEN 1 ELSE 0 END), 0)::int AS approved,
            COALESCE(SUM(CASE WHEN approved = false THEN 1 ELSE 0 END), 0)::int AS pending
          FROM generated_documents
        `
      ),
      this.pool.query(
        `SELECT current_state, COUNT(*)::int AS total FROM workflow_instances GROUP BY current_state`
      ),
      this.pool.query(
        `
          SELECT
            COUNT(*)::int AS total,
            COALESCE(SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END), 0)::int AS in_review,
            COALESCE(SUM(CASE WHEN status IN ('approved', 'active') THEN 1 ELSE 0 END), 0)::int AS approved
          FROM knowledge_documents
        `
      ),
    ]);

    const documentRow = documents.rows[0] || {};
    const knowledgeRow = knowledge.rows[0] || {};
    const workflowStates = workflows.rows.map((row) => ({
      state: row.current_state,
      count: row.total || 0,
    }));

    const activeWorkflows = workflowStates
      .filter((entry) => ACTIVE_WORKFLOW_STATES.includes(entry.state))
      .reduce((total, entry) => total + entry.count, 0);
    const failedWorkflows = workflowStates
      .filter((entry) => FAILED_WORKFLOW_STATES.includes(entry.state))
      .reduce((total, entry) => total + entry.count, 0);

    const totalDocuments = documentRow.total || 0;
    const approvedDocuments = documentRow.approved || 0;

    return {
      totalDocuments,
      approvedDocuments,
      pendingDocuments: documentRow.pending || 0,
      approvalRate: totalDocuments ? Number(((approvedDocuments / totalDocuments) * 100).toFixed(2)) : 0,
      workflowStates,
      activeWorkflows,
      failedWorkflows,
      knowledgeDocuments: knowledgeRow.total || 0,
      knowledgeInReview: knowledgeRow.in_review || 0,
      knowledgeApproved: knowledgeRow.approved || 0,
    };
  }

  async getPromptUsage({ limit = 10 } = {}) {
    const result = await this.pool.query(
      `
        SELECT id, name, status, agent_code, usage_count, success_count, average_latency_ms
        FROM prompt_definitions
        ORDER BY usage_count DESC, name ASC
        LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 10, 1), 50)]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      agentCode: row.agent_code || '',
      usageCount: row.usage_count || 0,
      successCount: row.success_count || 0,
      averageLatencyMs: toNumber(row.average_latency_ms),
    }));
  }

  async getDocumentUsage({ limit = 10 } = {}) {
    const result = await this.pool.query(
      `
        SELECT id, title, category, status, view_count, ai_usage_count, download_count, approval_count
        FROM knowledge_documents
        ORDER BY ai_usage_count DESC, view_count DESC, title ASC
        LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 10, 1), 50)]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      status: row.status,
      viewCount: row.view_count || 0,
      aiUsageCount: row.ai_usage_count || 0,
      downloadCount: row.download_count || 0,
      approvalCount: row.approval_count || 0,
    }));
  }

  async getUserActivity({ since, limit = 10 } = {}) {
    const values = [];
    let joinClause = 'LEFT JOIN ai_usage u ON u.user_id = users.id';

    if (since) {
      values.push(toDate(since, 30 * 24 * 60 * 60 * 1000));
      joinClause = `LEFT JOIN ai_usage u ON u.user_id = users.id AND u.created_at >= $${values.length}`;
    }

    values.push(Math.min(Math.max(Number(limit) || 10, 1), 50));

    const result = await this.pool.query(
      `
        SELECT
          users.id, users.email, users.name, users.role, users.status,
          COUNT(u.id)::int AS requests,
          COALESCE(SUM(u.total_tokens), 0)::int AS total_tokens,
          COALESCE(SUM(u.estimated_cost), 0)::float AS estimated_cost
        FROM users
        ${joinClause}
        GROUP BY users.id, users.email, users.name, users.role, users.status
        ORDER BY requests DESC, users.email ASC
        LIMIT $${values.length}
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      requests: row.requests || 0,
      totalTokens: row.total_tokens || 0,
      estimatedCost: toNumber(row.estimated_cost),
    }));
  }

  async getModuleCounts() {
    const [knowledge, collections, prompts, libraries, folders, files, workflows, feedback] =
      await Promise.all([
        this.pool.query('SELECT COUNT(*)::int AS total FROM knowledge_documents'),
        this.pool.query('SELECT COUNT(*)::int AS total FROM knowledge_collections'),
        this.pool.query('SELECT COUNT(*)::int AS total FROM prompt_definitions'),
        this.pool.query('SELECT COUNT(*)::int AS total FROM prompt_libraries'),
        this.pool.query('SELECT COUNT(*)::int AS total FROM document_folders'),
        this.pool.query(
          'SELECT COUNT(*)::int AS total, COALESCE(SUM(byte_size), 0)::float AS bytes FROM knowledge_document_files'
        ),
        this.pool.query('SELECT COUNT(*)::int AS total FROM workflow_instances'),
        this.pool.query('SELECT COUNT(*)::int AS total FROM feedback'),
      ]);

    return {
      knowledgeDocuments: knowledge.rows[0]?.total || 0,
      knowledgeCollections: collections.rows[0]?.total || 0,
      prompts: prompts.rows[0]?.total || 0,
      promptLibraries: libraries.rows[0]?.total || 0,
      folders: folders.rows[0]?.total || 0,
      storedFiles: files.rows[0]?.total || 0,
      storedBytes: toNumber(files.rows[0]?.bytes),
      workflows: workflows.rows[0]?.total || 0,
      feedback: feedback.rows[0]?.total || 0,
    };
  }

  async getPendingApprovalCount() {
    const result = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM generated_documents WHERE approved = false'
    );
    return result.rows[0]?.total || 0;
  }

  async listDomainEvents({ since, limit = 100 } = {}) {
    const sinceDate = toDate(since, 7 * 24 * 60 * 60 * 1000);
    const rowLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

    const [knowledge, prompts, dms, workflows] = await Promise.all([
      this.pool.query(
        `
          SELECT id, document_id AS subject_id, event_type, actor, summary, created_at
          FROM knowledge_document_events
          WHERE created_at >= $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [sinceDate, rowLimit]
      ),
      this.pool.query(
        `
          SELECT id, prompt_id AS subject_id, event_type, actor, summary, created_at
          FROM prompt_definition_events
          WHERE created_at >= $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [sinceDate, rowLimit]
      ),
      this.pool.query(
        `
          SELECT id, document_id AS subject_id, folder_id, event_type, actor, summary, created_at
          FROM dms_audit_events
          WHERE created_at >= $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [sinceDate, rowLimit]
      ),
      this.pool.query(
        `
          SELECT id, workflow_instance_id AS subject_id, actor, previous_state, new_state, comment, created_at
          FROM workflow_history
          WHERE created_at >= $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [sinceDate, rowLimit]
      ),
    ]);

    return {
      knowledge: knowledge.rows,
      prompts: prompts.rows,
      dms: dms.rows,
      workflows: workflows.rows,
    };
  }

  async findAlertByKey(alertKey) {
    const result = await this.pool.query(
      'SELECT * FROM observability_alerts WHERE alert_key = $1 LIMIT 1',
      [alertKey]
    );
    return result.rows[0] || null;
  }

  async saveAlert(payload) {
    const existing = await this.findAlertByKey(payload.alertKey);

    if (existing && existing.status !== 'resolved') {
      const result = await this.pool.query(
        `
          UPDATE observability_alerts
          SET severity = $2,
              title = $3,
              description = $4,
              observed_value = $5,
              threshold_value = $6,
              occurrences = occurrences + 1,
              metadata = $7::jsonb,
              last_seen_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [
          existing.id,
          payload.severity || 'warning',
          payload.title,
          payload.description || '',
          toNumber(payload.observedValue),
          toNumber(payload.thresholdValue),
          JSON.stringify(payload.metadata || {}),
        ]
      );
      return result.rows[0];
    }

    if (existing) {
      const result = await this.pool.query(
        `
          UPDATE observability_alerts
          SET severity = $2,
              status = 'open',
              title = $3,
              description = $4,
              observed_value = $5,
              threshold_value = $6,
              occurrences = occurrences + 1,
              metadata = $7::jsonb,
              first_seen_at = NOW(),
              last_seen_at = NOW(),
              acknowledged_by = NULL,
              acknowledged_at = NULL,
              resolved_by = NULL,
              resolved_at = NULL
          WHERE id = $1
          RETURNING *
        `,
        [
          existing.id,
          payload.severity || 'warning',
          payload.title,
          payload.description || '',
          toNumber(payload.observedValue),
          toNumber(payload.thresholdValue),
          JSON.stringify(payload.metadata || {}),
        ]
      );
      return result.rows[0];
    }

    const result = await this.pool.query(
      `
        INSERT INTO observability_alerts (
          id, alert_key, rule_code, category, severity, status, title, description,
          observed_value, threshold_value, occurrences, metadata
        )
        VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, 1, $10::jsonb)
        RETURNING *
      `,
      [
        payload.id || randomUUID(),
        payload.alertKey,
        payload.ruleCode,
        payload.category || 'system',
        payload.severity || 'warning',
        payload.title,
        payload.description || '',
        toNumber(payload.observedValue),
        toNumber(payload.thresholdValue),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async autoResolveAlerts(activeKeys = [], actor = 'system') {
    const result = await this.pool.query(
      `SELECT id, alert_key FROM observability_alerts WHERE status <> 'resolved'`
    );

    const stale = result.rows.filter((row) => !activeKeys.includes(row.alert_key));

    for (const row of stale) {
      await this.pool.query(
        `
          UPDATE observability_alerts
          SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
          WHERE id = $1
        `,
        [row.id, actor]
      );
    }

    return stale.length;
  }

  async listAlerts({ status, severity, limit = 50 } = {}) {
    const filters = [];
    const values = [];

    if (status) {
      values.push(status);
      filters.push(`status = $${values.length}`);
    }

    if (severity) {
      values.push(severity);
      filters.push(`severity = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));

    const result = await this.pool.query(
      `
        SELECT *
        FROM observability_alerts
        ${whereClause}
        ORDER BY last_seen_at DESC
        LIMIT $${values.length}
      `,
      values
    );

    return result.rows;
  }

  async updateAlertStatus(id, { status, actor = '' }) {
    if (status === 'acknowledged') {
      const result = await this.pool.query(
        `
          UPDATE observability_alerts
          SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [id, actor]
      );
      return result.rows[0] || null;
    }

    const result = await this.pool.query(
      `
        UPDATE observability_alerts
        SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [id, actor]
    );

    return result.rows[0] || null;
  }

  async getAlertCounts() {
    const result = await this.pool.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0)::int AS open,
          COALESCE(SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END), 0)::int AS acknowledged,
          COALESCE(SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0)::int AS resolved,
          COALESCE(SUM(CASE WHEN status <> 'resolved' AND severity = 'critical' THEN 1 ELSE 0 END), 0)::int AS critical
        FROM observability_alerts
      `
    );

    const row = result.rows[0] || {};

    return {
      open: row.open || 0,
      acknowledged: row.acknowledged || 0,
      resolved: row.resolved || 0,
      critical: row.critical || 0,
    };
  }

  async saveSnapshot(payload = {}) {
    const id = payload.id || randomUUID();

    await this.pool.query(
      `
        INSERT INTO observability_metric_snapshots (
          id, window_minutes, requests, failed_requests, active_requests, queued_requests,
          average_latency_ms, total_tokens, estimated_cost, heap_used_bytes,
          cpu_usage_percent, uptime_seconds, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
      `,
      [
        id,
        Math.round(toNumber(payload.windowMinutes) || 60),
        Math.round(toNumber(payload.requests)),
        Math.round(toNumber(payload.failedRequests)),
        Math.round(toNumber(payload.activeRequests)),
        Math.round(toNumber(payload.queuedRequests)),
        Math.round(toNumber(payload.averageLatencyMs)),
        Math.round(toNumber(payload.totalTokens)),
        toNumber(payload.estimatedCost),
        Math.round(toNumber(payload.heapUsedBytes)),
        Number(toNumber(payload.cpuUsagePercent).toFixed(2)),
        Math.round(toNumber(payload.uptimeSeconds)),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return id;
  }

  async listSnapshots({ limit = 48 } = {}) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM observability_metric_snapshots
        ORDER BY captured_at DESC
        LIMIT $1
      `,
      [Math.min(Math.max(Number(limit) || 48, 1), 500)]
    );

    return result.rows.reverse();
  }
}
