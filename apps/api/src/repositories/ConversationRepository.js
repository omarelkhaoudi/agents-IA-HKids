export class ConversationRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    const result = await this.pool.query(
      `
        INSERT INTO conversations (
          id, title, provider, model, language, current_context, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)
        RETURNING *
      `,
      [
        payload.id,
        payload.title,
        payload.provider,
        payload.model,
        payload.language,
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
            current_context = $5::jsonb,
            metadata = $6::jsonb,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        conversationId,
        payload.provider,
        payload.model,
        payload.language,
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

  async list({ limit = 20, offset = 0, search = '' } = {}) {
    const hasSearch = Boolean(search.trim());
    const query = hasSearch
      ? `
          SELECT * FROM conversations
          WHERE title ILIKE $1
          ORDER BY updated_at DESC
          LIMIT $2 OFFSET $3
        `
      : `
          SELECT * FROM conversations
          ORDER BY updated_at DESC
          LIMIT $1 OFFSET $2
        `;

    const values = hasSearch ? [`%${search}%`, limit, offset] : [limit, offset];
    const result = await this.pool.query(query, values);
    return result.rows;
  }
}
