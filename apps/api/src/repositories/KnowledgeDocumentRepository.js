export class KnowledgeDocumentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapDocument(row) {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      tags: row.tags || [],
      createdDate: row.created_date,
      updatedDate: row.updated_date,
      size: row.size,
      status: row.status,
      author: row.author,
      fileType: row.file_type,
      sourceFileName: row.source_file_name,
      content: row.content,
      priority: row.priority,
    };
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM knowledge_documents');
    return result.rows[0]?.count || 0;
  }

  async list() {
    const result = await this.pool.query(
      'SELECT * FROM knowledge_documents ORDER BY created_at DESC'
    );
    return result.rows.map((row) => this.mapDocument(row));
  }

  async listSources() {
    const result = await this.pool.query(
      'SELECT id, content, priority FROM knowledge_documents ORDER BY created_at DESC'
    );

    return result.rows.map((row) => ({
      documentId: row.id,
      content: row.content,
      priority: row.priority,
    }));
  }

  async getById(id) {
    const result = await this.pool.query('SELECT * FROM knowledge_documents WHERE id = $1 LIMIT 1', [
      id,
    ]);
    const row = result.rows[0];
    return row ? this.mapDocument(row) : null;
  }

  async create(document) {
    await this.pool.query(
      `
        INSERT INTO knowledge_documents (
          id, title, category, description, tags, created_date, updated_date,
          size, status, author, file_type, source_file_name, content, priority
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        document.id,
        document.title,
        document.category,
        document.description || '',
        JSON.stringify(document.tags || []),
        document.createdDate,
        document.updatedDate,
        document.size || '',
        document.status || 'active',
        document.author || '',
        document.fileType || 'PDF',
        document.sourceFileName || '',
        document.content || '',
        document.priority || 2,
      ]
    );

    return this.getById(document.id);
  }

  async update(id, document) {
    await this.pool.query(
      `
        UPDATE knowledge_documents
        SET
          title = $2,
          category = $3,
          description = $4,
          tags = $5::jsonb,
          updated_date = $6,
          size = $7,
          status = $8,
          author = $9,
          file_type = $10,
          source_file_name = $11,
          content = $12,
          priority = $13,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        id,
        document.title,
        document.category,
        document.description || '',
        JSON.stringify(document.tags || []),
        document.updatedDate,
        document.size || '',
        document.status || 'active',
        document.author || '',
        document.fileType || 'PDF',
        document.sourceFileName || '',
        document.content || '',
        document.priority || 2,
      ]
    );

    return this.getById(id);
  }

  async remove(id) {
    const result = await this.pool.query('DELETE FROM knowledge_documents WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}
