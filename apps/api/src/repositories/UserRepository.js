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
        INSERT INTO users (id, email, password_hash, name, role, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        payload.id,
        payload.email.toLowerCase().trim(),
        payload.passwordHash,
        payload.name || '',
        payload.role || 'employee',
        payload.status || 'active',
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
        SET password_hash = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [id, passwordHash]
    );

    return this.findById(id);
  }
}
