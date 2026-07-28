export class MessageRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    const result = await this.pool.query(
      `
        INSERT INTO messages (id, conversation_id, role, content, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING *
      `,
      [
        payload.id,
        payload.conversationId,
        payload.role,
        payload.content,
        JSON.stringify(payload.metadata || {}),
        payload.createdAt,
      ]
    );

    return result.rows[0];
  }

  async listByConversationId(conversationId, { limit = 200, offset = 0 } = {}) {
    const result = await this.pool.query(
      `
        SELECT * FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
      `,
      [conversationId, limit, offset]
    );

    return result.rows;
  }
}
