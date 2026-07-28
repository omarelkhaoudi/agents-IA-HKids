import { buildInClause } from './queryUtils.js';

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

  async listGroupedConversationKnowledgeIds(conversationIds = []) {
    if (conversationIds.length === 0) {
      return new Map();
    }

    const { clause, values } = buildInClause(conversationIds);
    const result = await this.pool.query(
      `
        SELECT conversation_id, document_id
        FROM conversation_knowledge
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
      grouped.get(row.conversation_id).push(row.document_id);
    }

    return grouped;
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
