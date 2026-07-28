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

  getPromptById(promptId) {
    return this.listPrompts().find((prompt) => prompt.id === promptId) || null;
  }
}
