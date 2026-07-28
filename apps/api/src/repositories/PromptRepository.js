import { buildInClause } from './queryUtils.js';

export class PromptRepository {
  constructor(pool, { listPrompts }) {
    this.pool = pool;
    this.listPrompts = listPrompts;
  }

  async replaceConversationPrompt(conversationId, promptId) {
    await this.pool.query('DELETE FROM conversation_prompts WHERE conversation_id = $1', [conversationId]);
    await this.pool.query(
      `
        INSERT INTO conversation_prompts (conversation_id, prompt_id)
        VALUES ($1, $2)
      `,
      [conversationId, promptId]
    );
  }

  async getSelectedPromptId(conversationId) {
    const result = await this.pool.query(
      'SELECT prompt_id FROM conversation_prompts WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
      [conversationId]
    );

    return result.rows[0]?.prompt_id || null;
  }

  async listGroupedSelectedPromptIds(conversationIds = []) {
    if (conversationIds.length === 0) {
      return new Map();
    }

    const { clause, values } = buildInClause(conversationIds);
    const result = await this.pool.query(
      `
        SELECT conversation_id, prompt_id, created_at
        FROM conversation_prompts
        WHERE conversation_id ${clause}
        ORDER BY created_at DESC
      `,
      values
    );

    const grouped = new Map();

    for (const conversationId of conversationIds) {
      grouped.set(conversationId, null);
    }

    for (const row of result.rows) {
      if (!grouped.get(row.conversation_id)) {
        grouped.set(row.conversation_id, row.prompt_id);
      }
    }

    return grouped;
  }

  getPromptById(promptId) {
    return this.listPrompts().find((prompt) => prompt.id === promptId) || null;
  }
}
