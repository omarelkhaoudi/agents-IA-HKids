export class FeedbackRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async createFeedback(payload) {
    await this.pool.query(
      `
        INSERT INTO feedback (
          id, conversation_id, message_id, document_id, agent_code, original_text, corrected_text,
          feedback_type, rating, comment
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        payload.id,
        payload.conversationId,
        payload.messageId || null,
        payload.documentId || null,
        payload.agentCode || 'administrative-assistant',
        payload.originalText,
        payload.correctedText || null,
        payload.feedbackType,
        payload.rating || null,
        payload.comment || null,
      ]
    );

    return this.getFeedbackById(payload.id);
  }

  async getFeedbackById(feedbackId) {
    const result = await this.pool.query('SELECT * FROM feedback WHERE id = $1', [feedbackId]);
    return result.rows[0] || null;
  }

  async createDocumentCorrection(payload) {
    await this.pool.query(
      `
        INSERT INTO document_corrections (
          id, feedback_id, correction_type, original_fragment, corrected_fragment
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        payload.id,
        payload.feedbackId,
        payload.correctionType,
        payload.originalFragment || null,
        payload.correctedFragment || null,
      ]
    );
  }

  async upsertPattern(payload) {
    const existing = await this.pool.query(
      'SELECT * FROM feedback_patterns WHERE pattern_type = $1 AND pattern_text = $2 LIMIT 1',
      [payload.patternType, payload.patternText]
    );

    if (existing.rowCount > 0) {
      const result = await this.pool.query(
        `
          UPDATE feedback_patterns
          SET occurrences = occurrences + 1,
              metadata = $3::jsonb
          WHERE pattern_type = $1 AND pattern_text = $2
          RETURNING *
        `,
        [payload.patternType, payload.patternText, JSON.stringify(payload.metadata || {})]
      );

      return result.rows[0];
    }

    const result = await this.pool.query(
      `
        INSERT INTO feedback_patterns (id, pattern_type, pattern_text, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING *
      `,
      [
        payload.id,
        payload.patternType,
        payload.patternText,
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async createPromptImprovement(payload) {
    const result = await this.pool.query(
      `
        INSERT INTO prompt_improvements (id, prompt_id, suggestion_text, rationale, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `,
      [
        payload.id,
        payload.promptId || null,
        payload.suggestionText,
        payload.rationale,
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return result.rows[0];
  }

  async approvePattern(patternId) {
    const result = await this.pool.query(
      `
        UPDATE feedback_patterns
        SET status = 'approved', approved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [patternId]
    );

    return result.rows[0] || null;
  }

  async approvePromptImprovement(improvementId) {
    const result = await this.pool.query(
      `
        UPDATE prompt_improvements
        SET status = 'approved', approved_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [improvementId]
    );

    return result.rows[0] || null;
  }

  async listApprovedPatterns(agentCode) {
    const values = [];
    let whereClause = "WHERE status = 'approved'";

    if (agentCode) {
      values.push(agentCode);
      whereClause += ` AND (metadata->>'agentCode' = $${values.length} OR metadata->>'agentCode' IS NULL)`;
    }

    const result = await this.pool.query(
      `
        SELECT * FROM feedback_patterns
        ${whereClause}
        ORDER BY occurrences DESC, created_at DESC
      `,
      values
    );

    return result.rows;
  }

  async getDashboardStats(agentCode) {
    const values = [];
    const feedbackWhere = [];

    if (agentCode) {
      values.push(agentCode);
      feedbackWhere.push(`agent_code = $${values.length}`);
    }

    const feedbackQuery = `SELECT * FROM feedback ${feedbackWhere.length ? `WHERE ${feedbackWhere.join(' AND ')}` : ''} ORDER BY created_at DESC`;
    const [feedbackResult, patternsResult, improvementsResult] = await Promise.all([
      this.pool.query(feedbackQuery, values),
      this.pool.query('SELECT * FROM feedback_patterns ORDER BY occurrences DESC, created_at DESC'),
      this.pool.query('SELECT * FROM prompt_improvements ORDER BY created_at DESC'),
    ]);

    return {
      feedback: feedbackResult.rows,
      patterns: patternsResult.rows,
      improvements: improvementsResult.rows,
    };
  }
}
