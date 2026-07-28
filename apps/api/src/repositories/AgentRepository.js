export class AgentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapAgent(row, links = {}) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
      defaultProvider: row.default_provider,
      defaultModel: row.default_model,
      temperature: Number(row.temperature),
      maxTokens: row.max_tokens,
      timeout: row.timeout,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      promptIds: links.promptIds || [],
      documentIds: links.documentIds || [],
      workflowCodes: links.workflowCodes || [],
    };
  }

  async getLinks(agentId) {
    const [prompts, documents, workflows] = await Promise.all([
      this.pool.query('SELECT prompt_id FROM agent_prompt_links WHERE agent_id = $1', [agentId]),
      this.pool.query('SELECT document_id FROM agent_document_links WHERE agent_id = $1', [agentId]),
      this.pool.query('SELECT workflow_code FROM agent_workflow_links WHERE agent_id = $1', [agentId]),
    ]);

    return {
      promptIds: prompts.rows.map((row) => row.prompt_id),
      documentIds: documents.rows.map((row) => row.document_id),
      workflowCodes: workflows.rows.map((row) => row.workflow_code),
    };
  }

  async list() {
    const result = await this.pool.query('SELECT * FROM agents ORDER BY created_at ASC');
    const agents = [];

    for (const row of result.rows) {
      const links = await this.getLinks(row.id);
      agents.push(this.mapAgent(row, links));
    }

    return agents;
  }

  async getById(id) {
    const result = await this.pool.query('SELECT * FROM agents WHERE id = $1 LIMIT 1', [id]);
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return this.mapAgent(row, await this.getLinks(id));
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO agents (
          id, code, name, description, status, default_provider, default_model,
          temperature, max_tokens, timeout, retry_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        payload.id,
        payload.code,
        payload.name,
        payload.description || '',
        payload.status || 'active',
        payload.defaultProvider || 'anthropic',
        payload.defaultModel || 'claude-3-5-sonnet-latest',
        payload.temperature ?? 0.3,
        payload.maxTokens ?? 1500,
        payload.timeout ?? 30000,
        payload.retryCount ?? 2,
      ]
    );

    await this.replaceLinks(payload.id, payload);
    return this.getById(payload.id);
  }

  async update(id, payload) {
    await this.pool.query(
      `
        UPDATE agents
        SET
          code = $2,
          name = $3,
          description = $4,
          status = $5,
          default_provider = $6,
          default_model = $7,
          temperature = $8,
          max_tokens = $9,
          timeout = $10,
          retry_count = $11,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        payload.code,
        payload.name,
        payload.description || '',
        payload.status || 'active',
        payload.defaultProvider || 'anthropic',
        payload.defaultModel || 'claude-3-5-sonnet-latest',
        payload.temperature ?? 0.3,
        payload.maxTokens ?? 1500,
        payload.timeout ?? 30000,
        payload.retryCount ?? 2,
      ]
    );

    await this.replaceLinks(id, payload);
    return this.getById(id);
  }

  async replaceLinks(agentId, payload) {
    await this.pool.query('DELETE FROM agent_prompt_links WHERE agent_id = $1', [agentId]);
    await this.pool.query('DELETE FROM agent_document_links WHERE agent_id = $1', [agentId]);
    await this.pool.query('DELETE FROM agent_workflow_links WHERE agent_id = $1', [agentId]);

    for (const promptId of payload.promptIds || []) {
      await this.pool.query(
        'INSERT INTO agent_prompt_links (agent_id, prompt_id) VALUES ($1, $2)',
        [agentId, promptId]
      );
    }

    for (const documentId of payload.documentIds || []) {
      await this.pool.query(
        'INSERT INTO agent_document_links (agent_id, document_id) VALUES ($1, $2)',
        [agentId, documentId]
      );
    }

    for (const workflowCode of payload.workflowCodes || []) {
      await this.pool.query(
        'INSERT INTO agent_workflow_links (agent_id, workflow_code) VALUES ($1, $2)',
        [agentId, workflowCode]
      );
    }
  }

  async delete(id) {
    await this.pool.query('DELETE FROM agents WHERE id = $1', [id]);
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS total FROM agents');
    return result.rows[0]?.total || 0;
  }
}
