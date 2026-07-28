export class ConversationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    const result = await this.pool.query(
      `
        INSERT INTO conversations (
          id, title, provider, model, language, agent_code, current_context, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
        RETURNING *
      `,
      [
        payload.id,
        payload.title,
        payload.provider,
        payload.model,
        payload.language,
        payload.agentCode || 'administrative-assistant',
        JSON.stringify(payload.currentContext || {}),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async updateConfig(conversationId, payload) {
    const result = await this.pool.query(
      `
        UPDATE conversations
        SET provider = $2,
            model = $3,
            language = $4,
            agent_code = $5,
            current_context = $6::jsonb,
            metadata = $7::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        conversationId,
        payload.provider,
        payload.model,
        payload.language,
        payload.agentCode || 'administrative-assistant',
        JSON.stringify(payload.currentContext || {}),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return result.rows[0] || null;
  }

  async getById(conversationId) {
    const result = await this.pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    return result.rows[0] || null;
  }

  async list({ limit = 20, offset = 0, search = '', agentCode } = {}) {
    const clauses = [];
    const values = [];

    if (search.trim()) {
      values.push(`%${search}%`);
      clauses.push(`title ILIKE $${values.length}`);
    }

    if (agentCode) {
      values.push(agentCode);
      clauses.push(`agent_code = $${values.length}`);
    }

    values.push(limit);
    const limitRef = `$${values.length}`;
    values.push(offset);
    const offsetRef = `$${values.length}`;

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `
        SELECT * FROM conversations
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT ${limitRef} OFFSET ${offsetRef}
      `,
      values
    );

    return result.rows;
  }
}
