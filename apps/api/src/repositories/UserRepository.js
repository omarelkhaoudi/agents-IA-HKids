export class UserRepository {
  constructor(pool) {
    this.pool = pool;
  }

  mapUser(row) {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      role: row.role,
      status: row.status,
      tokenVersion: Number(row.token_version || 0),
      failedLoginCount: Number(row.failed_login_count || 0),
      lockedUntil: row.locked_until || null,
      lastLoginAt: row.last_login_at || null,
      lastLoginIp: row.last_login_ip || '',
      lastLoginUserAgent: row.last_login_user_agent || '',
      passwordChangedAt: row.password_changed_at || null,
      forcePasswordReset: Boolean(row.force_password_reset),
      tenantId: row.tenant_id || 'default-tenant',
      organizationId: row.organization_id || 'default-organization',
      ownerId: row.owner_id || row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  toPublicUser(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
      lockedUntil: user.lockedUntil,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findByEmail(email) {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [
      email.toLowerCase().trim(),
    ]);
    const row = result.rows[0];
    return row ? this.mapUser(row) : null;
  }

  async findById(id) {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    const row = result.rows[0];
    return row ? this.mapUser(row) : null;
  }

  async create(payload) {
    await this.pool.query(
      `
        INSERT INTO users (
          id, email, password_hash, name, role, status, tenant_id, organization_id, owner_id,
          password_changed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `,
      [
        payload.id,
        payload.email.toLowerCase().trim(),
        payload.passwordHash,
        payload.name || '',
        payload.role || 'employee',
        payload.status || 'active',
        payload.tenantId || 'default-tenant',
        payload.organizationId || 'default-organization',
        payload.ownerId || payload.id,
      ]
    );

    return this.findById(payload.id);
  }

  async count() {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM users');
    return result.rows[0]?.count || 0;
  }

  async updatePassword(id, passwordHash) {
    await this.pool.query(
      `
        UPDATE users
        SET password_hash = $2,
            password_changed_at = NOW(),
            token_version = token_version + 1,
            updated_at = NOW()
        WHERE id = $1
      `,
      [id, passwordHash]
    );

    return this.findById(id);
  }

  async recordLoginSuccess(id, { ipAddress = '', userAgent = '' } = {}) {
    await this.pool.query(
      `
        UPDATE users
        SET failed_login_count = 0,
            locked_until = NULL,
            last_login_at = NOW(),
            last_login_ip = $2,
            last_login_user_agent = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [id, ipAddress, userAgent]
    );
    return this.findById(id);
  }

  async recordLoginFailure(id, { lockUntil = null } = {}) {
    await this.pool.query(
      `
        UPDATE users
        SET failed_login_count = failed_login_count + 1,
            locked_until = COALESCE($2, locked_until),
            updated_at = NOW()
        WHERE id = $1
      `,
      [id, lockUntil]
    );
    return this.findById(id);
  }

  async resetFailedLogins(id) {
    await this.pool.query(
      `
        UPDATE users
        SET failed_login_count = 0,
            locked_until = NULL,
            updated_at = NOW()
        WHERE id = $1
      `,
      [id]
    );
    return this.findById(id);
  }

  async incrementTokenVersion(id) {
    await this.pool.query(
      `
        UPDATE users
        SET token_version = token_version + 1,
            updated_at = NOW()
        WHERE id = $1
      `,
      [id]
    );
    return this.findById(id);
  }
}
