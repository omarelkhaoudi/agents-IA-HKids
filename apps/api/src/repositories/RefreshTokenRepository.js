export class RefreshTokenRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapToken(row) {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
      deviceId: row.device_id || '',
      ipAddress: row.ip_address || '',
      userAgent: row.user_agent || '',
      tokenVersion: Number(row.token_version || 0),
      rotatedFromTokenId: row.rotated_from_token_id || null,
      tenantId: row.tenant_id || 'default-tenant',
      organizationId: row.organization_id || 'default-organization',
    };
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO refresh_tokens (
          id, user_id, token_hash, expires_at, device_id, ip_address, user_agent,
          token_version, rotated_from_token_id, tenant_id, organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        payload.id,
        payload.userId,
        payload.tokenHash,
        payload.expiresAt,
        payload.deviceId || '',
        payload.ipAddress || '',
        payload.userAgent || '',
        payload.tokenVersion || 0,
        payload.rotatedFromTokenId || null,
        payload.tenantId || 'default-tenant',
        payload.organizationId || 'default-organization',
      ]
    );

    return this.findById(payload.id);
  }

  async findById(id) {
    const result = await this.pool.query('SELECT * FROM refresh_tokens WHERE id = $1 LIMIT 1', [id]);
    const row = result.rows[0];
    return row ? this.mapToken(row) : null;
  }

  async findByTokenHash(tokenHash) {
    const result = await this.pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1',
      [tokenHash]
    );
    const row = result.rows[0];
    return row ? this.mapToken(row) : null;
  }

  async revoke(id) {
    await this.pool.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1 AND revoked_at IS NULL
      `,
      [id]
    );
  }

  async revokeAllForUser(userId) {
    await this.pool.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [userId]
    );
  }

  async deleteExpired() {
    await this.pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
  }
}
