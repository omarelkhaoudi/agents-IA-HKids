import { randomUUID } from 'node:crypto';
import { appendTenantFilter } from '../services/security/TenantContext.js';

function asJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class SecurityRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async recordSecurityEvent(payload = {}) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `
        INSERT INTO security_events (
          id, event_type, severity, actor_user_id, actor_email, tenant_id, organization_id,
          subject_type, subject_id, action, allowed, reason, ip_address, user_agent, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
      `,
      [
        id,
        payload.eventType || 'security_event',
        payload.severity || (payload.allowed === false ? 'warning' : 'info'),
        payload.actorUserId || null,
        payload.actorEmail || '',
        payload.tenantId || 'default-tenant',
        payload.organizationId || 'default-organization',
        payload.subjectType || '',
        payload.subjectId || null,
        payload.action || '',
        payload.allowed !== false,
        payload.reason || '',
        payload.ipAddress || '',
        payload.userAgent || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async listSecurityEvents({ eventType, severity, allowed, limit = 100, offset = 0 } = {}) {
    const filters = [];
    const values = [];

    if (eventType) {
      values.push(eventType);
      filters.push(`event_type = $${values.length}`);
    }
    if (severity) {
      values.push(severity);
      filters.push(`severity = $${values.length}`);
    }
    if (allowed !== undefined) {
      values.push(Boolean(allowed));
      filters.push(`allowed = $${values.length}`);
    }
    appendTenantFilter(filters, values);

    values.push(Math.min(Math.max(Number(limit) || 100, 1), 500));
    const limitRef = `$${values.length}`;
    values.push(Math.max(Number(offset) || 0, 0));
    const offsetRef = `$${values.length}`;
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `
        SELECT *
        FROM security_events
        ${where}
        ORDER BY created_at DESC
        LIMIT ${limitRef} OFFSET ${offsetRef}
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      severity: row.severity,
      actorUserId: row.actor_user_id,
      actorEmail: row.actor_email,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      action: row.action,
      allowed: row.allowed,
      reason: row.reason,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: asJson(row.metadata, {}),
      createdAt: row.created_at,
    }));
  }

  async countSecurityEvents({ eventType, severity, allowed, since } = {}) {
    const filters = [];
    const values = [];

    if (eventType) {
      values.push(eventType);
      filters.push(`event_type = $${values.length}`);
    }
    if (severity) {
      values.push(severity);
      filters.push(`severity = $${values.length}`);
    }
    if (allowed !== undefined) {
      values.push(Boolean(allowed));
      filters.push(`allowed = $${values.length}`);
    }
    if (since) {
      values.push(since);
      filters.push(`created_at >= $${values.length}`);
    }
    appendTenantFilter(filters, values);

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS total FROM security_events ${where}`,
      values
    );
    return result.rows[0]?.total || 0;
  }

  async saveAuthSession(payload = {}) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `
        INSERT INTO auth_sessions (
          id, user_id, refresh_token_id, device_id, ip_address, user_agent, status,
          tenant_id, organization_id, expires_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
      `,
      [
        id,
        payload.userId,
        payload.refreshTokenId || null,
        payload.deviceId || '',
        payload.ipAddress || '',
        payload.userAgent || '',
        payload.status || 'active',
        payload.tenantId || 'default-tenant',
        payload.organizationId || 'default-organization',
        payload.expiresAt,
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return id;
  }

  async touchAuthSession(refreshTokenId) {
    await this.pool.query(
      `
        UPDATE auth_sessions
        SET last_seen_at = NOW()
        WHERE refresh_token_id = $1 AND status = 'active'
      `,
      [refreshTokenId]
    );
  }

  async revokeAuthSession(refreshTokenId) {
    await this.pool.query(
      `
        UPDATE auth_sessions
        SET status = 'revoked', revoked_at = NOW()
        WHERE refresh_token_id = $1 AND status = 'active'
      `,
      [refreshTokenId]
    );
  }

  async revokeAuthSessionsForUser(userId) {
    await this.pool.query(
      `
        UPDATE auth_sessions
        SET status = 'revoked', revoked_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `,
      [userId]
    );
  }

  async listActiveSessions({ limit = 50 } = {}) {
    const filters = [
      "s.status = 'active'",
      's.revoked_at IS NULL',
      's.expires_at > NOW()',
    ];
    const values = [];
    appendTenantFilter(filters, values, { alias: 's' });
    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
    const limitRef = `$${values.length}`;
    const result = await this.pool.query(
      `
        SELECT s.*, u.email, u.name, u.role
        FROM auth_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE ${filters.join(' AND ')}
        ORDER BY s.last_seen_at DESC
        LIMIT ${limitRef}
      `,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      deviceId: row.device_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
    }));
  }

  async listLockedAccounts({ limit = 50 } = {}) {
    const filters = ['locked_until IS NOT NULL', 'locked_until > NOW()'];
    const values = [];
    appendTenantFilter(filters, values);
    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));
    const limitRef = `$${values.length}`;
    const result = await this.pool.query(
      `
        SELECT id, email, name, role, failed_login_count, locked_until, tenant_id, organization_id
        FROM users
        WHERE ${filters.join(' AND ')}
        ORDER BY locked_until DESC
        LIMIT ${limitRef}
      `,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      failedLoginCount: row.failed_login_count || 0,
      lockedUntil: row.locked_until,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
    }));
  }

  async upsertSecretInventory(payload = {}) {
    await this.pool.query(
      `
        INSERT INTO secret_inventory (
          secret_name, provider, status, source, last_validated_at, expires_at, rotated_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
        ON CONFLICT (secret_name) DO UPDATE SET
          provider = EXCLUDED.provider,
          status = EXCLUDED.status,
          source = EXCLUDED.source,
          last_validated_at = EXCLUDED.last_validated_at,
          expires_at = EXCLUDED.expires_at,
          rotated_at = EXCLUDED.rotated_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        payload.name,
        payload.provider || 'environment',
        payload.status || 'unknown',
        payload.source || '',
        payload.lastValidatedAt || new Date(),
        payload.expiresAt || null,
        payload.rotatedAt || null,
        JSON.stringify(payload.metadata || {}),
      ]
    );
  }

  async listSecretInventory() {
    const result = await this.pool.query(
      'SELECT * FROM secret_inventory ORDER BY secret_name ASC'
    );
    return result.rows.map((row) => ({
      name: row.secret_name,
      provider: row.provider,
      status: row.status,
      source: row.source,
      lastValidatedAt: row.last_validated_at,
      expiresAt: row.expires_at,
      rotatedAt: row.rotated_at,
      metadata: asJson(row.metadata, {}),
      updatedAt: row.updated_at,
    }));
  }

  async upsertEncryptionKey(payload = {}) {
    await this.pool.query(
      `
        INSERT INTO encryption_key_records (
          key_id, version, status, algorithm, rotated_at, expires_at, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
        ON CONFLICT (key_id) DO UPDATE SET
          version = EXCLUDED.version,
          status = EXCLUDED.status,
          algorithm = EXCLUDED.algorithm,
          rotated_at = EXCLUDED.rotated_at,
          expires_at = EXCLUDED.expires_at,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
      [
        payload.keyId,
        Math.round(toNumber(payload.version) || 1),
        payload.status || 'active',
        payload.algorithm || 'aes-256-gcm',
        payload.rotatedAt || null,
        payload.expiresAt || null,
        JSON.stringify(payload.metadata || {}),
      ]
    );
  }

  async listEncryptionKeys() {
    const result = await this.pool.query(
      'SELECT * FROM encryption_key_records ORDER BY updated_at DESC'
    );
    return result.rows.map((row) => ({
      keyId: row.key_id,
      version: row.version,
      status: row.status,
      algorithm: row.algorithm,
      rotatedAt: row.rotated_at,
      expiresAt: row.expires_at,
      metadata: asJson(row.metadata, {}),
      updatedAt: row.updated_at,
    }));
  }

  async listDocumentAclEntries({ documentId, folderId } = {}) {
    const values = [];
    const filters = [];
    if (documentId) {
      values.push(documentId);
      filters.push(`document_id = $${values.length}`);
    }
    if (folderId) {
      values.push(folderId);
      filters.push(`folder_id = $${values.length}`);
    }
    appendTenantFilter(filters, values);
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM document_acl_entries ${where} ORDER BY created_at DESC`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      folderId: row.folder_id,
      principalType: row.principal_type,
      principalId: row.principal_id,
      accessLevel: row.access_level,
      permissions: asJson(row.permissions, []),
      inherited: row.inherited,
      tenantId: row.tenant_id,
      organizationId: row.organization_id,
      ownerId: row.owner_id,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async addDocumentAclEntry(payload = {}) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `
        INSERT INTO document_acl_entries (
          id, document_id, folder_id, principal_type, principal_id, access_level, permissions,
          inherited, tenant_id, organization_id, owner_id, expires_at, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)
      `,
      [
        id,
        payload.documentId || null,
        payload.folderId || null,
        payload.principalType || 'user',
        payload.principalId,
        payload.accessLevel || 'read',
        JSON.stringify(payload.permissions || [payload.accessLevel || 'read']),
        Boolean(payload.inherited),
        payload.tenantId || 'default-tenant',
        payload.organizationId || 'default-organization',
        payload.ownerId || '',
        payload.expiresAt || null,
        payload.createdBy || '',
      ]
    );
    return (await this.listDocumentAclEntries({
      documentId: payload.documentId,
      folderId: payload.folderId,
    })).find((item) => item.id === id);
  }

  async removeDocumentAclEntry(id) {
    const filters = ['id = $1'];
    const values = [id];
    appendTenantFilter(filters, values);
    const result = await this.pool.query(
      `DELETE FROM document_acl_entries WHERE ${filters.join(' AND ')}`,
      values
    );
    return result.rowCount > 0;
  }

  async getAclStatistics() {
    const entriesFilters = [];
    const entriesValues = [];
    appendTenantFilter(entriesFilters, entriesValues);
    const entriesWhere = entriesFilters.length ? `WHERE ${entriesFilters.join(' AND ')}` : '';

    const docFilters = ["acl_visibility = 'restricted'"];
    const docValues = [];
    appendTenantFilter(docFilters, docValues);

    const inheritedFilters = ['inherited = true'];
    const inheritedValues = [];
    appendTenantFilter(inheritedFilters, inheritedValues);

    const [entries, restricted, inherited] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM document_acl_entries ${entriesWhere}`,
        entriesValues
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM knowledge_documents WHERE ${docFilters.join(' AND ')}`,
        docValues
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM document_acl_entries WHERE ${inheritedFilters.join(' AND ')}`,
        inheritedValues
      ),
    ]);
    return {
      entries: entries.rows[0]?.total || 0,
      restrictedDocuments: restricted.rows[0]?.total || 0,
      inheritedEntries: inherited.rows[0]?.total || 0,
    };
  }
}
