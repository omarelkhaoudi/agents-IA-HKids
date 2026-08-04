import { randomUUID } from 'node:crypto';
import { appendTenantFilter, tenantColumnsForInsert } from '../services/security/TenantContext.js';

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

function mapCourse(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    tags: asJson(row.tags, []),
    durationHours: Number(row.duration_hours || 0),
    prerequisites: asJson(row.prerequisites, []),
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduled_at,
    durationMinutes: row.duration_minutes,
    instructor: row.instructor,
    location: row.location,
    capacity: row.capacity,
    status: row.status,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TrainingCenterRepository {
  constructor(pool) {
    this.pool = pool;
  }

  buildTenantWhere() {
    const clauses = [];
    const values = [];
    appendTenantFilter(clauses, values);
    return {
      where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  async listCourses(filters = {}) {
    const clauses = [];
    const values = [];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      clauses.push(`(LOWER(title) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`);
    }

    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM training_courses ${where} ORDER BY updated_at DESC`,
      values
    );

    return result.rows.map(mapCourse);
  }

  async getCourse(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM training_courses WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );

    return mapCourse(result.rows[0]);
  }

  async createCourse(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);

    await this.pool.query(
      `INSERT INTO training_courses (
        id, title, description, category, status, tags, duration_hours,
        prerequisites, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9::jsonb,$10,$11,$12)`,
      [
        id,
        payload.title,
        payload.description || '',
        payload.category || '',
        payload.status || 'draft',
        JSON.stringify(payload.tags || []),
        payload.durationHours || 0,
        JSON.stringify(payload.prerequisites || []),
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );

    return this.getCourse(id);
  }

  async updateCourse(id, payload) {
    const existing = await this.getCourse(id);
    if (!existing) {
      const error = new Error('Course not found.');
      error.statusCode = 404;
      throw error;
    }

    const next = { ...existing, ...payload };

    await this.pool.query(
      `UPDATE training_courses SET
        title=$2,
        description=$3,
        category=$4,
        status=$5,
        tags=$6::jsonb,
        duration_hours=$7,
        prerequisites=$8::jsonb,
        metadata=$9::jsonb,
        updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.title,
        next.description || '',
        next.category || '',
        next.status || 'draft',
        JSON.stringify(next.tags || []),
        next.durationHours || 0,
        JSON.stringify(next.prerequisites || []),
        JSON.stringify(next.metadata || {}),
      ]
    );

    return this.getCourse(id);
  }

  async listSessions(filters = {}) {
    const clauses = [];
    const values = [];

    if (filters.courseId) {
      values.push(filters.courseId);
      clauses.push(`course_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      clauses.push(`(LOWER(title) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`);
    }

    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM training_sessions ${where} ORDER BY scheduled_at ASC`,
      values
    );

    return result.rows.map(mapSession);
  }

  async getSession(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM training_sessions WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );

    return mapSession(result.rows[0]);
  }

  async createSession(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);

    await this.pool.query(
      `INSERT INTO training_sessions (
        id, course_id, title, description, scheduled_at, duration_minutes,
        instructor, location, capacity, status, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)`,
      [
        id,
        payload.courseId,
        payload.title,
        payload.description || '',
        payload.scheduledAt || null,
        payload.durationMinutes || 60,
        payload.instructor || '',
        payload.location || '',
        payload.capacity || 0,
        payload.status || 'scheduled',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );

    return this.getSession(id);
  }

  async updateSession(id, payload) {
    const existing = await this.getSession(id);
    if (!existing) {
      const error = new Error('Session not found.');
      error.statusCode = 404;
      throw error;
    }

    const next = { ...existing, ...payload };

    await this.pool.query(
      `UPDATE training_sessions SET
        course_id=$2,
        title=$3,
        description=$4,
        scheduled_at=$5,
        duration_minutes=$6,
        instructor=$7,
        location=$8,
        capacity=$9,
        status=$10,
        metadata=$11::jsonb,
        updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.courseId,
        next.title,
        next.description || '',
        next.scheduledAt || null,
        next.durationMinutes || 60,
        next.instructor || '',
        next.location || '',
        next.capacity || 0,
        next.status || 'scheduled',
        JSON.stringify(next.metadata || {}),
      ]
    );

    return this.getSession(id);
  }
}
