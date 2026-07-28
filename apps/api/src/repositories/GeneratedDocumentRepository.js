export class GeneratedDocumentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO generated_documents (
          id, conversation_id, document_type, reference, structured_document,
          resolved_variables, rendered_preview, validation_warnings, available_export_formats,
          approved, status, version, created_by, approved_by, approved_at, input, metadata
        )
        VALUES (
          $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb,
          $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb
        )
      `,
      [
        payload.id,
        payload.conversationId,
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
        SET structured_document = $2::jsonb,
            resolved_variables = $3::jsonb,
            rendered_preview = $4,
            validation_warnings = $5::jsonb,
            available_export_formats = $6::jsonb,
            approved = $7,
            status = $8,
            version = $9,
            approved_by = $10,
            approved_at = $11,
            input = $12::jsonb,
            metadata = $13::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        documentId,
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

  async search(query, { limit = 50, offset = 0 } = {}) {
    const result = await this.pool.query(
      `
        SELECT *
        FROM generated_documents
        WHERE reference ILIKE $1
           OR rendered_preview ILIKE $1
           OR structured_document::text ILIKE $1
           OR input::text ILIKE $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `,
      [`%${query}%`, limit, offset]
    );

    return result.rows;
  }
}
