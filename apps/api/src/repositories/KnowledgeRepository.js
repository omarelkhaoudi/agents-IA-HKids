export class KnowledgeRepository {
  constructor(pool, { listDocuments }) {
    this.pool = pool;
    this.listDocuments = listDocuments;
  }

  async replaceConversationKnowledge(conversationId, documentIds) {
    await this.pool.query('DELETE FROM conversation_knowledge WHERE conversation_id = $1', [conversationId]);

    for (const documentId of documentIds) {
      await this.pool.query(
        `
          INSERT INTO conversation_knowledge (conversation_id, document_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [conversationId, documentId]
      );
    }
  }

  async listConversationKnowledgeIds(conversationId) {
    const result = await this.pool.query(
      'SELECT document_id FROM conversation_knowledge WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    return result.rows.map((row) => row.document_id);
  }

  getDocumentsByIds(documentIds) {
    return this.listDocuments().filter((document) => documentIds.includes(document.id));
  }

  searchDocuments(query) {
    const normalizedQuery = query.toLowerCase();

    return this.listDocuments().filter((document) =>
      [document.title, document.description, document.author, document.category, document.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }
}
