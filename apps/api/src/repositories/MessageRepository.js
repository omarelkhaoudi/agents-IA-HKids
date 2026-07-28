import { buildInClause } from './queryUtils.js';

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

  async listGroupedByConversationIds(conversationIds = []) {
    if (conversationIds.length === 0) {
      return new Map();
    }

    const { clause, values } = buildInClause(conversationIds);
    const result = await this.pool.query(
      `
        SELECT * FROM messages
        WHERE conversation_id ${clause}
        ORDER BY created_at ASC
      `,
      values
    );

    const grouped = new Map();

    for (const conversationId of conversationIds) {
      grouped.set(conversationId, []);
    }

    for (const row of result.rows) {
      grouped.get(row.conversation_id).push(row);
    }

    return grouped;
  }
}
