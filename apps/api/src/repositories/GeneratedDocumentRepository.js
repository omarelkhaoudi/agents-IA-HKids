export class GeneratedDocumentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO generated_documents (
          id, conversation_id, agent_code, document_type, reference, structured_document,
          resolved_variables, rendered_preview, validation_warnings, available_export_formats,
          approved, status, version, created_by, approved_by, approved_at, input, metadata
        )
        VALUES (
          $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::jsonb, $10::jsonb,
          $11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb
        )
      `,
      [
        payload.id,
        payload.conversationId,
        payload.agentCode || 'administrative-assistant',
        payload.documentType,
        payload.reference,
        JSON.stringify(payload.structuredDocument),
        JSON.stringify(payload.resolvedVariables),
        payload.renderedPreview,
        JSON.stringify(payload.validationWarnings || []),
        JSON.stringify(payload.availableExportFormats || []),
        payload.approved,
        payload.status,
        payload.version,
        payload.createdBy || null,
        payload.approvedBy || null,
        payload.approvedAt || null,
        JSON.stringify(payload.input || {}),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    await this.pool.query(
      `
        INSERT INTO conversation_documents (conversation_id, generated_document_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [payload.conversationId, payload.id]
    );

    return this.getById(payload.id);
  }

  async update(documentId, payload) {
    await this.pool.query(
      `
        UPDATE generated_documents
        SET agent_code = $2,
            structured_document = $3::jsonb,
            resolved_variables = $4::jsonb,
            rendered_preview = $5,
            validation_warnings = $6::jsonb,
            available_export_formats = $7::jsonb,
            approved = $8,
            status = $9,
            version = $10,
            approved_by = $11,
            approved_at = $12,
            input = $13::jsonb,
            metadata = $14::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        documentId,
        payload.agentCode || 'administrative-assistant',
        JSON.stringify(payload.structuredDocument),
        JSON.stringify(payload.resolvedVariables),
        payload.renderedPreview,
        JSON.stringify(payload.validationWarnings || []),
        JSON.stringify(payload.availableExportFormats || []),
        payload.approved,
        payload.status,
        payload.version,
        payload.approvedBy || null,
        payload.approvedAt || null,
        JSON.stringify(payload.input || {}),
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return this.getById(documentId);
  }

  async getById(documentId) {
    const result = await this.pool.query('SELECT * FROM generated_documents WHERE id = $1', [documentId]);
    return result.rows[0] || null;
  }

  async listByConversationId(conversationId, { limit = 100, offset = 0 } = {}) {
    const result = await this.pool.query(
      `
        SELECT * FROM generated_documents
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [conversationId, limit, offset]
    );

    return result.rows;
  }

  async search(query, { limit = 50, offset = 0, agentCode } = {}) {
    const values = [`%${query}%`];
    const clauses = [
      'reference ILIKE $1',
      'rendered_preview ILIKE $1',
      'structured_document::text ILIKE $1',
      'input::text ILIKE $1',
    ];
    let whereClause = `(${clauses.join(' OR ')})`;

    if (agentCode) {
      values.push(agentCode);
      whereClause += ` AND agent_code = $${values.length}`;
    }

    values.push(limit, offset);
    const result = await this.pool.query(
      `
        SELECT *
        FROM generated_documents
        WHERE ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values
    );

    return result.rows;
  }
}
