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
    };
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [payload.id, payload.userId, payload.tokenHash, payload.expiresAt]
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
