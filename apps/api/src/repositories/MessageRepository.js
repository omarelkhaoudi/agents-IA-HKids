import { buildInClause } from './queryUtils.js';
import {
  appendTenantFilter,
  tenantColumnsForInsert,
} from '../services/security/TenantContext.js';

export class MessageRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(payload) {
    const tenant = tenantColumnsForInsert(payload);
    const result = await this.pool.query(
      `
        INSERT INTO messages (
          id, conversation_id, role, content, metadata, created_at,
          tenant_id, organization_id, owner_id
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        payload.id,
        payload.conversationId,
        payload.role,
        payload.content,
        JSON.stringify(payload.metadata || {}),
        payload.createdAt,
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId || '',
      ]
    );

    return result.rows[0];
  }

  async listByConversationId(conversationId, { limit = 200, offset = 0 } = {}) {
    const clauses = [`conversation_id = $1`];
    const values = [conversationId];
    appendTenantFilter(clauses, values);
    values.push(limit);
    const limitRef = `$${values.length}`;
    values.push(offset);
    const offsetRef = `$${values.length}`;
    const result = await this.pool.query(
      `
        SELECT * FROM messages
        WHERE ${clauses.join(' AND ')}
        ORDER BY created_at ASC
        LIMIT ${limitRef} OFFSET ${offsetRef}
      `,
      values
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
