import { randomUUID } from 'node:crypto';
import {
  appendTenantFilter,
  tenantColumnsForInsert,
} from '../services/security/TenantContext.js';

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

function mapEmployee(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    department: row.department,
    position: row.position,
    managerName: row.manager_name,
    employmentType: row.employment_type,
    startDate: row.start_date,
    status: row.status,
    tags: asJson(row.tags, []),
    notes: row.notes,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCandidate(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    positionApplied: row.position_applied,
    stage: row.stage,
    source: row.source,
    evaluationScore: row.evaluation_score,
    shortlisted: Boolean(row.shortlisted),
    interviewNotes: row.interview_notes,
    tags: asJson(row.tags, []),
    notes: row.notes,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJobDescription(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    contractType: row.contract_type,
    mission: row.mission,
    responsibilities: asJson(row.responsibilities, []),
    dailyTasks: asJson(row.daily_tasks, []),
    requiredSkills: asJson(row.required_skills, []),
    preferredSkills: asJson(row.preferred_skills, []),
    experience: row.experience,
    education: row.education,
    softSkills: asJson(row.soft_skills, []),
    languages: asJson(row.languages, []),
    benefits: asJson(row.benefits, []),
    body: row.body,
    approvalStatus: row.approval_status,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
  };
}

function mapLeave(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    leaveType: row.leave_type,
    startDate: row.start_date,
    endDate: row.end_date,
    days: row.days,
    reason: row.reason,
    status: row.status,
    aiRecommendation: row.ai_recommendation,
    managerDecision: row.manager_decision,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAbsence(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    reason: row.reason,
    startDate: row.start_date,
    endDate: row.end_date,
    durationDays: row.duration_days,
    supportingDocs: asJson(row.supporting_docs, []),
    status: row.status,
    alertFlag: Boolean(row.alert_flag),
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeId: row.employee_id,
    candidateId: row.candidate_id,
    documentType: row.document_type,
    title: row.title,
    body: row.body,
    approvalStatus: row.approval_status,
    version: row.version,
    sourcePrompt: row.source_prompt,
    conversationId: row.conversation_id,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    tenantId: row.tenant_id || 'default-tenant',
    organizationId: row.organization_id || 'default-organization',
    ownerId: row.owner_id || '',
  };
}

export class HrAgentRepository {
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

  async listEmployees(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.department) {
      values.push(filters.department);
      clauses.push(`department = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      clauses.push(
        `(LOWER(full_name) LIKE $${values.length} OR LOWER(email) LIKE $${values.length} OR LOWER(position) LIKE $${values.length})`
      );
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const order = filters.sort === 'name' ? 'full_name ASC' : 'updated_at DESC';
    const result = await this.pool.query(
      `SELECT * FROM hr_employees ${where} ORDER BY ${order}`,
      values
    );
    return result.rows.map(mapEmployee);
  }

  async createEmployee(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert({
      ...payload,
      ownerId: payload.ownerId || payload.email,
    });
    await this.pool.query(
      `INSERT INTO hr_employees (
        id, full_name, email, phone, department, position, manager_name, employment_type,
        start_date, status, tags, notes, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14,$15,$16)`,
      [
        id,
        payload.fullName,
        payload.email || '',
        payload.phone || '',
        payload.department || '',
        payload.position || '',
        payload.managerName || '',
        payload.employmentType || 'full_time',
        payload.startDate || null,
        payload.status || 'active',
        JSON.stringify(payload.tags || []),
        payload.notes || '',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_employees WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapEmployee(result.rows[0]);
  }

  async updateEmployee(id, payload) {
    const existing = (await this.listEmployees()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Employee not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE hr_employees SET
        full_name=$2, email=$3, phone=$4, department=$5, position=$6, manager_name=$7,
        employment_type=$8, start_date=$9, status=$10, tags=$11::jsonb, notes=$12,
        metadata=$13::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.fullName,
        next.email || '',
        next.phone || '',
        next.department || '',
        next.position || '',
        next.managerName || '',
        next.employmentType || 'full_time',
        next.startDate || null,
        next.status || 'active',
        JSON.stringify(next.tags || []),
        next.notes || '',
        JSON.stringify(next.metadata || {}),
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_employees WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapEmployee(result.rows[0]);
  }

  async listCandidates(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.stage) {
      values.push(filters.stage);
      clauses.push(`stage = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      clauses.push(
        `(LOWER(full_name) LIKE $${values.length} OR LOWER(position_applied) LIKE $${values.length})`
      );
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM hr_candidates ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapCandidate);
  }

  async createCandidate(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert({
      ...payload,
      ownerId: payload.ownerId || payload.email,
    });
    await this.pool.query(
      `INSERT INTO hr_candidates (
        id, full_name, email, phone, position_applied, stage, source, evaluation_score,
        shortlisted, interview_notes, tags, notes, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14,$15,$16)`,
      [
        id,
        payload.fullName,
        payload.email || '',
        payload.phone || '',
        payload.positionApplied || '',
        payload.stage || 'applied',
        payload.source || '',
        payload.evaluationScore ?? null,
        Boolean(payload.shortlisted),
        payload.interviewNotes || '',
        JSON.stringify(payload.tags || []),
        payload.notes || '',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_candidates WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapCandidate(result.rows[0]);
  }

  async updateCandidate(id, payload) {
    const existing = (await this.listCandidates()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Candidate not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE hr_candidates SET
        full_name=$2, email=$3, phone=$4, position_applied=$5, stage=$6, source=$7,
        evaluation_score=$8, shortlisted=$9, interview_notes=$10, tags=$11::jsonb,
        notes=$12, metadata=$13::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.fullName,
        next.email || '',
        next.phone || '',
        next.positionApplied || '',
        next.stage || 'applied',
        next.source || '',
        next.evaluationScore ?? null,
        Boolean(next.shortlisted),
        next.interviewNotes || '',
        JSON.stringify(next.tags || []),
        next.notes || '',
        JSON.stringify(next.metadata || {}),
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_candidates WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapCandidate(result.rows[0]);
  }

  async listJobDescriptions() {
    const { where, values } = this.buildTenantWhere();
    const result = await this.pool.query(
      `SELECT * FROM hr_job_descriptions ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapJobDescription);
  }

  async createJobDescription(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `INSERT INTO hr_job_descriptions (
        id, title, department, location, contract_type, mission, responsibilities, daily_tasks,
        required_skills, preferred_skills, experience, education, soft_skills, languages,
        benefits, body, approval_status, metadata, tenant_id, organization_id, owner_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb,$14::jsonb,
        $15::jsonb,$16,$17,$18::jsonb,$19,$20,$21
      )`,
      [
        id,
        payload.title,
        payload.department || '',
        payload.location || '',
        payload.contractType || 'full_time',
        payload.mission || '',
        JSON.stringify(payload.responsibilities || []),
        JSON.stringify(payload.dailyTasks || []),
        JSON.stringify(payload.requiredSkills || []),
        JSON.stringify(payload.preferredSkills || []),
        payload.experience || '',
        payload.education || '',
        JSON.stringify(payload.softSkills || []),
        JSON.stringify(payload.languages || []),
        JSON.stringify(payload.benefits || []),
        payload.body || '',
        payload.approvalStatus || 'draft',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_job_descriptions WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapJobDescription(result.rows[0]);
  }

  async updateJobDescription(id, payload) {
    const existing = (await this.listJobDescriptions()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Job description not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE hr_job_descriptions SET
        title=$2, department=$3, location=$4, contract_type=$5, mission=$6,
        responsibilities=$7::jsonb, daily_tasks=$8::jsonb, required_skills=$9::jsonb,
        preferred_skills=$10::jsonb, experience=$11, education=$12, soft_skills=$13::jsonb,
        languages=$14::jsonb, benefits=$15::jsonb, body=$16, approval_status=$17,
        approved_at=$18, approved_by=$19, metadata=$20::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.title,
        next.department || '',
        next.location || '',
        next.contractType || 'full_time',
        next.mission || '',
        JSON.stringify(next.responsibilities || []),
        JSON.stringify(next.dailyTasks || []),
        JSON.stringify(next.requiredSkills || []),
        JSON.stringify(next.preferredSkills || []),
        next.experience || '',
        next.education || '',
        JSON.stringify(next.softSkills || []),
        JSON.stringify(next.languages || []),
        JSON.stringify(next.benefits || []),
        next.body || '',
        next.approvalStatus || 'draft',
        next.approvedAt || null,
        next.approvedBy || null,
        JSON.stringify(next.metadata || {}),
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_job_descriptions WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapJobDescription(result.rows[0]);
  }

  async listLeaveRequests(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM hr_leave_requests ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapLeave);
  }

  async createLeaveRequest(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert({
      ...payload,
      ownerId: payload.ownerId || payload.employeeId,
    });
    await this.pool.query(
      `INSERT INTO hr_leave_requests (
        id, employee_id, employee_name, leave_type, start_date, end_date, days, reason,
        status, ai_recommendation, manager_decision, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15)`,
      [
        id,
        payload.employeeId || null,
        payload.employeeName || '',
        payload.leaveType || 'annual',
        payload.startDate || null,
        payload.endDate || null,
        payload.days ?? 1,
        payload.reason || '',
        payload.status || 'pending',
        payload.aiRecommendation || '',
        payload.managerDecision || '',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_leave_requests WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapLeave(result.rows[0]);
  }

  async updateLeaveRequest(id, payload) {
    const existing = (await this.listLeaveRequests()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Leave request not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE hr_leave_requests SET
        employee_id=$2, employee_name=$3, leave_type=$4, start_date=$5, end_date=$6, days=$7,
        reason=$8, status=$9, ai_recommendation=$10, manager_decision=$11, metadata=$12::jsonb,
        updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.employeeId || null,
        next.employeeName || '',
        next.leaveType || 'annual',
        next.startDate || null,
        next.endDate || null,
        next.days ?? 1,
        next.reason || '',
        next.status || 'pending',
        next.aiRecommendation || '',
        next.managerDecision || '',
        JSON.stringify(next.metadata || {}),
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_leave_requests WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapLeave(result.rows[0]);
  }

  async listAbsences() {
    const { where, values } = this.buildTenantWhere();
    const result = await this.pool.query(
      `SELECT * FROM hr_absences ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapAbsence);
  }

  async createAbsence(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert({
      ...payload,
      ownerId: payload.ownerId || payload.employeeId,
    });
    await this.pool.query(
      `INSERT INTO hr_absences (
        id, employee_id, employee_name, reason, start_date, end_date, duration_days,
        supporting_docs, status, alert_flag, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13,$14)`,
      [
        id,
        payload.employeeId || null,
        payload.employeeName || '',
        payload.reason || '',
        payload.startDate || null,
        payload.endDate || null,
        payload.durationDays ?? 1,
        JSON.stringify(payload.supportingDocs || []),
        payload.status || 'recorded',
        Boolean(payload.alertFlag),
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_absences WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapAbsence(result.rows[0]);
  }

  async listDocuments(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.approvalStatus) {
      values.push(filters.approvalStatus);
      clauses.push(`approval_status = $${values.length}`);
    }
    if (filters.documentType) {
      values.push(filters.documentType);
      clauses.push(`document_type = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM hr_documents ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapDocument);
  }

  async getDocument(id) {
    const clauses = ['id = $1'];
    const values = [id];
    appendTenantFilter(clauses, values);
    const result = await this.pool.query(
      `SELECT * FROM hr_documents WHERE ${clauses.join(' AND ')}`,
      values
    );
    return mapDocument(result.rows[0]);
  }

  async createDocument(payload) {
    const id = payload.id || randomUUID();
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `INSERT INTO hr_documents (
        id, employee_id, candidate_id, document_type, title, body, approval_status, version,
        source_prompt, conversation_id, metadata, tenant_id, organization_id, owner_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)`,
      [
        id,
        payload.employeeId || null,
        payload.candidateId || null,
        payload.documentType || 'other',
        payload.title,
        payload.body || '',
        payload.approvalStatus || 'draft',
        payload.version ?? 1,
        payload.sourcePrompt || '',
        payload.conversationId || null,
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getDocument(id);
  }

  async updateDocument(id, payload) {
    const existing = await this.getDocument(id);
    if (!existing) throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE hr_documents SET
        employee_id=$2, candidate_id=$3, document_type=$4, title=$5, body=$6, approval_status=$7,
        version=$8, source_prompt=$9, conversation_id=$10, approved_at=$11, approved_by=$12,
        metadata=$13::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.employeeId || null,
        next.candidateId || null,
        next.documentType,
        next.title,
        next.body || '',
        next.approvalStatus || 'draft',
        next.version ?? 1,
        next.sourcePrompt || '',
        next.conversationId || null,
        next.approvedAt || null,
        next.approvedBy || null,
        JSON.stringify(next.metadata || {}),
      ]
    );
    return this.getDocument(id);
  }

  async getDashboardStats() {
    const [employees, candidates, leave, documents, absences, jobs] = await Promise.all([
      this.listEmployees(),
      this.listCandidates(),
      this.listLeaveRequests(),
      this.listDocuments(),
      this.listAbsences(),
      this.listJobDescriptions(),
    ]);

    const activeEmployees = employees.filter((item) => item.status === 'active').length;
    const openRecruitments = candidates.filter(
      (item) => !['hired', 'rejected', 'withdrawn'].includes(item.stage)
    ).length;
    const pendingLeave = leave.filter((item) => item.status === 'pending').length;
    const pendingDocs = documents.filter((item) => item.approvalStatus === 'pending_review').length;
    const pendingJobs = jobs.filter((item) => item.approvalStatus === 'pending_review').length;
    const absenceDays = absences.reduce((sum, item) => sum + Number(item.durationDays || 0), 0);
    const absenceRate =
      activeEmployees > 0 ? Number(((absenceDays / (activeEmployees * 20)) * 100).toFixed(1)) : 0;

    const typeCounts = {};
    for (const document of documents) {
      typeCounts[document.documentType] = (typeCounts[document.documentType] || 0) + 1;
    }
    const mostRequestedDocument =
      Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return {
      employees: employees.length,
      activeEmployees,
      recruitments: openRecruitments,
      candidates: candidates.length,
      pendingApprovals: pendingLeave + pendingDocs + pendingJobs,
      leaveRequests: leave.length,
      pendingLeave,
      absenceRate,
      generatedDocuments: documents.length,
      mostRequestedDocument,
      jobDescriptions: jobs.length,
      absences: absences.length,
    };
  }

  async searchAll(query) {
    const q = `%${String(query || '').toLowerCase()}%`;
    const employeeClauses = ['(LOWER(full_name) LIKE $1 OR LOWER(email) LIKE $1)'];
    const candidateClauses = ['LOWER(full_name) LIKE $1'];
    const documentClauses = ['LOWER(title) LIKE $1'];
    const jobClauses = ['LOWER(title) LIKE $1'];
    const leaveClauses = ['(LOWER(employee_name) LIKE $1 OR LOWER(reason) LIKE $1)'];
    const employeeValues = [q];
    const candidateValues = [q];
    const documentValues = [q];
    const jobValues = [q];
    const leaveValues = [q];
    appendTenantFilter(employeeClauses, employeeValues);
    appendTenantFilter(candidateClauses, candidateValues);
    appendTenantFilter(documentClauses, documentValues);
    appendTenantFilter(jobClauses, jobValues);
    appendTenantFilter(leaveClauses, leaveValues);
    const [employees, candidates, documents, jobs, leave] = await Promise.all([
      this.pool.query(
        `SELECT id, full_name AS title, 'employee' AS type FROM hr_employees WHERE ${employeeClauses.join(' AND ')} LIMIT 15`,
        employeeValues
      ),
      this.pool.query(
        `SELECT id, full_name AS title, 'candidate' AS type FROM hr_candidates WHERE ${candidateClauses.join(' AND ')} LIMIT 15`,
        candidateValues
      ),
      this.pool.query(
        `SELECT id, title, 'document' AS type FROM hr_documents WHERE ${documentClauses.join(' AND ')} LIMIT 15`,
        documentValues
      ),
      this.pool.query(
        `SELECT id, title, 'job_description' AS type FROM hr_job_descriptions WHERE ${jobClauses.join(' AND ')} LIMIT 15`,
        jobValues
      ),
      this.pool.query(
        `SELECT id, employee_name AS title, 'leave' AS type FROM hr_leave_requests WHERE ${leaveClauses.join(' AND ')} LIMIT 15`,
        leaveValues
      ),
    ]);
    return [
      ...employees.rows,
      ...candidates.rows,
      ...documents.rows,
      ...jobs.rows,
      ...leave.rows,
    ];
  }
}
