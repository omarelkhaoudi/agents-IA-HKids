import { randomUUID } from 'node:crypto';
import {
  appendTenantFilter,
  tenantColumnsForInsert,
} from '../security/TenantContext.js';

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

function clampLimit(value, fallback = 100) {
  return Math.min(Math.max(Number(value) || fallback, 1), 500);
}

function randomId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function normalizeTags(value) {
  return Array.isArray(value) ? value : [];
}

function definitionSnapshot(definition = {}) {
  return {
    name: definition.name,
    code: definition.code,
    category: definition.category,
    description: definition.description,
    tags: definition.tags || [],
    owner: definition.owner || '',
    status: definition.status || 'draft',
    priority: definition.priority || 'normal',
    policyId: definition.policyId || null,
    executionMode: definition.executionMode || 'sequential',
    approvalStrategy: definition.approvalStrategy || 'all_required',
    approvalChain: definition.approvalChain || [],
    conditions: definition.conditions || [],
    sla: definition.sla || {},
    escalationRules: definition.escalationRules || [],
    metadata: definition.metadata || {},
  };
}

function mapDefinition(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    description: row.description,
    tags: asJson(row.tags, []),
    owner: row.owner,
    status: row.status,
    priority: row.priority,
    policyId: row.policy_id,
    currentVersion: row.current_version,
    publishedVersion: row.published_version,
    executionMode: row.execution_mode,
    approvalStrategy: row.approval_strategy,
    approvalChain: asJson(row.approval_chain, []),
    conditions: asJson(row.conditions, []),
    sla: asJson(row.sla, {}),
    escalationRules: asJson(row.escalation_rules, []),
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    description: row.description,
    tags: asJson(row.tags, []),
    owner: row.owner,
    definition: asJson(row.definition, {}),
    status: row.status,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPolicy(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    category: row.category,
    description: row.description,
    policyType: row.policy_type,
    rules: asJson(row.rules, {}),
    fallbackApprovers: asJson(row.fallback_approvers, []),
    status: row.status,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    workflowDefinitionId: row.workflow_definition_id,
    version: row.version,
    status: row.status,
    changeSummary: row.change_summary,
    author: row.author,
    snapshot: asJson(row.snapshot, {}),
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

function mapTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    workflowInstanceId: row.workflow_instance_id,
    levelIndex: row.level_index,
    levelName: row.level_name,
    reviewer: row.reviewer,
    reviewerRole: row.reviewer_role,
    reviewerDepartment: row.reviewer_department,
    status: row.status,
    required: row.required,
    voteWeight: row.vote_weight,
    delegatedFrom: row.delegated_from,
    dueAt: row.due_at,
    decidedAt: row.decided_at,
    decision: row.decision,
    comment: row.comment,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDelegation(row) {
  if (!row) return null;
  return {
    id: row.id,
    delegator: row.delegator,
    delegate: row.delegate,
    delegationType: row.delegation_type,
    scope: row.scope,
    reason: row.reason,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    status: row.status,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEscalation(row) {
  if (!row) return null;
  return {
    id: row.id,
    workflowInstanceId: row.workflow_instance_id,
    approvalTaskId: row.approval_task_id,
    escalationType: row.escalation_type,
    fromReviewer: row.from_reviewer,
    toReviewer: row.to_reviewer,
    reason: row.reason,
    status: row.status,
    escalatedAt: row.escalated_at,
    resolvedAt: row.resolved_at,
    metadata: asJson(row.metadata, {}),
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
  };
}

export class WorkflowRepository {
  constructor(pool) {
    this.pool = pool;
  }

  buildWhere(initial = [], initialValues = [], options = {}) {
    const clauses = [...initial];
    const values = [...initialValues];
    appendTenantFilter(clauses, values, options);
    return {
      clauses,
      values,
      where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    };
  }

  async ensureRules(rules) {
    for (const rule of rules) {
      await this.pool.query(
        `
          INSERT INTO workflow_rules (id, rule_name, from_state, to_state, metadata)
          VALUES ($1, $2, $3, $4, '{}'::jsonb)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          `rule-${rule.fromState}-${rule.toState}`.replace(/\s+/g, '-').toLowerCase(),
          `${rule.fromState} -> ${rule.toState}`,
          rule.fromState,
          rule.toState,
        ]
      );
    }
  }

  async seedGovernanceDefaults({ templates = [], policies = [] } = {}) {
    for (const policy of policies) {
      await this.upsertPolicy(policy);
    }
    for (const template of templates) {
      await this.upsertTemplate(template);
    }
  }

  async createInstance(payload) {
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO workflow_instances (
          id, conversation_id, document_id, subject_type, subject_id, workflow_definition_id,
          workflow_version, policy_id, agent_code, current_state, approver_mode,
          required_approvals, priority, execution_mode, approval_strategy,
          expected_duration_minutes, maximum_duration_minutes, deadline_at,
          metadata, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22)
      `,
      [
        payload.id,
        payload.conversationId || null,
        payload.documentId || null,
        payload.subjectType || 'generated_document',
        payload.subjectId || payload.documentId || '',
        payload.workflowDefinitionId || null,
        payload.workflowVersion || 1,
        payload.policyId || null,
        payload.agentCode || '',
        payload.currentState,
        payload.approverMode,
        payload.requiredApprovals,
        payload.priority || 'normal',
        payload.executionMode || 'sequential',
        payload.approvalStrategy || 'all_required',
        payload.expectedDurationMinutes || 1440,
        payload.maximumDurationMinutes || 2880,
        payload.deadlineAt || null,
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );

    if (payload.documentId) {
      return this.getByDocumentId(payload.documentId);
    }
    return this.getInstance(payload.id);
  }

  async getByDocumentId(documentId) {
    const { clauses, values } = this.buildWhere(['document_id = $1'], [documentId]);
    return this.getInstanceByWhere(clauses, values);
  }

  async getBySubject(subjectType, subjectId) {
    const { clauses, values } = this.buildWhere(
      ['subject_type = $1', 'subject_id = $2'],
      [subjectType, subjectId]
    );
    return this.getInstanceByWhere(clauses, values);
  }

  async getInstance(id) {
    const { clauses, values } = this.buildWhere(['id = $1'], [id]);
    return this.getInstanceByWhere(clauses, values);
  }

  async getInstanceByWhere(clauses, values) {
    const instanceResult = await this.pool.query(
      `SELECT * FROM workflow_instances WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    const instance = instanceResult.rows[0];

    if (!instance) {
      return null;
    }

    const [historyResult, commentsResult, assignmentsResult, tasksResult, escalationsResult] =
      await Promise.all([
        this.pool.query(
          'SELECT * FROM workflow_history WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
          [instance.id]
        ),
        this.pool.query(
          'SELECT * FROM workflow_comments WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
          [instance.id]
        ),
        this.pool.query(
          'SELECT * FROM workflow_assignments WHERE workflow_instance_id = $1 ORDER BY created_at ASC',
          [instance.id]
        ),
        this.pool.query(
          'SELECT * FROM workflow_approval_tasks WHERE workflow_instance_id = $1 ORDER BY level_index ASC, created_at ASC',
          [instance.id]
        ),
        this.pool.query(
          'SELECT * FROM workflow_escalations WHERE workflow_instance_id = $1 ORDER BY escalated_at DESC',
          [instance.id]
        ),
      ]);

    return {
      id: instance.id,
      conversationId: instance.conversation_id,
      documentId: instance.document_id,
      subjectType: instance.subject_type,
      subjectId: instance.subject_id,
      workflowDefinitionId: instance.workflow_definition_id,
      workflowVersion: instance.workflow_version,
      policyId: instance.policy_id,
      agentCode: instance.agent_code,
      currentState: instance.current_state,
      approverMode: instance.approver_mode,
      requiredApprovals: instance.required_approvals,
      priority: instance.priority,
      executionMode: instance.execution_mode,
      approvalStrategy: instance.approval_strategy,
      expectedDurationMinutes: instance.expected_duration_minutes,
      maximumDurationMinutes: instance.maximum_duration_minutes,
      deadlineAt: instance.deadline_at,
      pausedAt: instance.paused_at,
      resumedAt: instance.resumed_at,
      escalatedAt: instance.escalated_at,
      completedAt: instance.completed_at,
      breachCount: instance.breach_count,
      metadata: asJson(instance.metadata, {}),
      tenantId: instance.tenant_id,
      organizationId: instance.organization_id,
      ownerId: instance.owner_id,
      createdAt: instance.created_at,
      updatedAt: instance.updated_at,
      history: historyResult.rows,
      comments: commentsResult.rows,
      assignments: assignmentsResult.rows,
      approvalTasks: tasksResult.rows.map(mapTask),
      escalations: escalationsResult.rows.map(mapEscalation),
    };
  }

  async listInstances(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.state) {
      values.push(filters.state);
      clauses.push(`current_state = $${values.length}`);
    }
    if (filters.subjectType) {
      values.push(filters.subjectType);
      clauses.push(`subject_type = $${values.length}`);
    }
    if (filters.agentCode) {
      values.push(filters.agentCode);
      clauses.push(`agent_code = $${values.length}`);
    }
    if (filters.priority) {
      values.push(filters.priority);
      clauses.push(`priority = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    values.push(clampLimit(filters.limit));
    const limitRef = `$${values.length}`;
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_instances ${where} ORDER BY updated_at DESC LIMIT ${limitRef}`,
      values
    );
    return Promise.all(result.rows.map((row) => this.getInstance(row.id)));
  }

  async updateState(workflowId, nextState) {
    const completed = ['Approved', 'Rejected', 'Exported', 'Archived'].includes(nextState);
    await this.pool.query(
      `
        UPDATE workflow_instances
        SET current_state = $2, updated_at = NOW(), completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END
        WHERE id = $1
      `,
      [workflowId, nextState, completed]
    );
  }

  async pauseInstance(workflowId) {
    await this.pool.query(
      'UPDATE workflow_instances SET paused_at = NOW(), updated_at = NOW() WHERE id = $1',
      [workflowId]
    );
    return this.getInstance(workflowId);
  }

  async resumeInstance(workflowId) {
    await this.pool.query(
      'UPDATE workflow_instances SET resumed_at = NOW(), paused_at = NULL, updated_at = NOW() WHERE id = $1',
      [workflowId]
    );
    return this.getInstance(workflowId);
  }

  async markEscalated(workflowId) {
    await this.pool.query(
      'UPDATE workflow_instances SET escalated_at = NOW(), updated_at = NOW() WHERE id = $1',
      [workflowId]
    );
  }

  async addHistory(payload) {
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO workflow_history (
          id, workflow_instance_id, actor, previous_state, new_state, comment,
          tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        payload.id,
        payload.workflowInstanceId,
        payload.actor,
        payload.previousState || null,
        payload.newState,
        payload.comment || null,
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
  }

  async addComment(payload) {
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO workflow_comments (
          id, workflow_instance_id, actor, comment, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        payload.id,
        payload.workflowInstanceId,
        payload.actor,
        payload.comment,
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
  }

  async assignReviewer(payload) {
    const tenant = tenantColumnsForInsert(payload);
    await this.pool.query(
      `
        INSERT INTO workflow_assignments (
          id, workflow_instance_id, reviewer, status, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        payload.id,
        payload.workflowInstanceId,
        payload.reviewer,
        payload.status || 'assigned',
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
  }

  async upsertPolicy(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || `policy-${payload.code || randomUUID()}`;
    await this.pool.query(
      `
        INSERT INTO workflow_policies (
          id, name, code, category, description, policy_type, rules, fallback_approvers,
          status, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          policy_type = EXCLUDED.policy_type,
          rules = EXCLUDED.rules,
          fallback_approvers = EXCLUDED.fallback_approvers,
          status = EXCLUDED.status,
          updated_at = NOW()
      `,
      [
        id,
        payload.name,
        payload.code,
        payload.category || 'general',
        payload.description || '',
        payload.policyType || 'generic',
        JSON.stringify(payload.rules || {}),
        JSON.stringify(payload.fallbackApprovers || []),
        payload.status || 'active',
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getPolicyByCode(payload.code);
  }

  async listPolicies(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_policies ${where} ORDER BY category ASC, name ASC`,
      values
    );
    return result.rows.map(mapPolicy);
  }

  async getPolicyByCode(code) {
    const { clauses, values } = this.buildWhere(['code = $1'], [code]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_policies WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapPolicy(result.rows[0]);
  }

  async upsertTemplate(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || `template-${payload.code || randomUUID()}`;
    await this.pool.query(
      `
        INSERT INTO workflow_templates (
          id, name, code, category, description, tags, owner, definition, status,
          tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10,$11,$12)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          tags = EXCLUDED.tags,
          owner = EXCLUDED.owner,
          definition = EXCLUDED.definition,
          status = EXCLUDED.status,
          updated_at = NOW()
      `,
      [
        id,
        payload.name,
        payload.code,
        payload.category || 'general',
        payload.description || '',
        JSON.stringify(normalizeTags(payload.tags)),
        payload.owner || '',
        JSON.stringify(payload.definition || {}),
        payload.status || 'published',
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getTemplateByCode(payload.code);
  }

  async listTemplates(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.category) {
      values.push(filters.category);
      clauses.push(`category = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_templates ${where} ORDER BY category ASC, name ASC`,
      values
    );
    return result.rows.map(mapTemplate);
  }

  async getTemplateByCode(code) {
    const { clauses, values } = this.buildWhere(['code = $1'], [code]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_templates WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapTemplate(result.rows[0]);
  }

  async createDefinition(payload = {}, actor = 'system') {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('workflow-definition');
    const code = payload.code || id;
    await this.pool.query(
      `
        INSERT INTO workflow_definitions (
          id, name, code, category, description, tags, owner, status, priority,
          policy_id, current_version, published_version, execution_mode,
          approval_strategy, approval_chain, conditions, sla, escalation_rules,
          metadata, tenant_id, organization_id, owner_id, created_by, updated_by
        )
        VALUES (
          $1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,
          $17::jsonb,$18::jsonb,$19::jsonb,$20,$21,$22,$23,$24
        )
      `,
      [
        id,
        payload.name,
        code,
        payload.category || 'general',
        payload.description || '',
        JSON.stringify(normalizeTags(payload.tags)),
        payload.owner || actor,
        payload.status || 'draft',
        payload.priority || 'normal',
        payload.policyId || null,
        1,
        payload.status === 'published' ? 1 : null,
        payload.executionMode || 'sequential',
        payload.approvalStrategy || 'all_required',
        JSON.stringify(payload.approvalChain || []),
        JSON.stringify(payload.conditions || []),
        JSON.stringify(payload.sla || {}),
        JSON.stringify(payload.escalationRules || []),
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
        actor,
        actor,
      ]
    );
    const definition = await this.getDefinition(id);
    await this.createDefinitionVersion(definition, {
      version: 1,
      status: definition.status,
      author: actor,
      changeSummary: payload.changeSummary || 'Initial version',
    });
    return definition;
  }

  async updateDefinition(id, payload = {}, actor = 'system') {
    const existing = await this.getDefinition(id);
    if (!existing) {
      const error = new Error('Workflow definition not found.');
      error.statusCode = 404;
      throw error;
    }
    const next = { ...existing, ...payload };
    const nextVersion = existing.currentVersion + 1;
    await this.pool.query(
      `
        UPDATE workflow_definitions SET
          name=$2, category=$3, description=$4, tags=$5::jsonb, owner=$6, status=$7,
          priority=$8, policy_id=$9, current_version=$10, published_version=$11,
          execution_mode=$12, approval_strategy=$13, approval_chain=$14::jsonb,
          conditions=$15::jsonb, sla=$16::jsonb, escalation_rules=$17::jsonb,
          metadata=$18::jsonb, updated_by=$19, updated_at=NOW()
        WHERE id=$1
      `,
      [
        id,
        next.name,
        next.category || 'general',
        next.description || '',
        JSON.stringify(normalizeTags(next.tags)),
        next.owner || actor,
        next.status || 'draft',
        next.priority || 'normal',
        next.policyId || null,
        nextVersion,
        next.status === 'published' ? nextVersion : next.publishedVersion || null,
        next.executionMode || 'sequential',
        next.approvalStrategy || 'all_required',
        JSON.stringify(next.approvalChain || []),
        JSON.stringify(next.conditions || []),
        JSON.stringify(next.sla || {}),
        JSON.stringify(next.escalationRules || []),
        JSON.stringify(next.metadata || {}),
        actor,
      ]
    );
    const definition = await this.getDefinition(id);
    await this.createDefinitionVersion(definition, {
      version: nextVersion,
      status: definition.status,
      author: actor,
      changeSummary: payload.changeSummary || 'Workflow updated',
    });
    return definition;
  }

  async listDefinitions(filters = {}) {
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
      clauses.push(`(LOWER(name) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`);
    }
    appendTenantFilter(clauses, values);
    values.push(clampLimit(filters.limit));
    const limitRef = `$${values.length}`;
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_definitions ${where} ORDER BY updated_at DESC LIMIT ${limitRef}`,
      values
    );
    return result.rows.map(mapDefinition);
  }

  async getDefinition(idOrCode) {
    const { clauses, values } = this.buildWhere(['(id = $1 OR code = $1)'], [idOrCode]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_definitions WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapDefinition(result.rows[0]);
  }

  async createDefinitionVersion(definition, payload = {}) {
    const tenant = tenantColumnsForInsert(definition);
    await this.pool.query(
      `
        INSERT INTO workflow_definition_versions (
          id, workflow_definition_id, version, status, change_summary, author,
          snapshot, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
        ON CONFLICT (workflow_definition_id, version) DO NOTHING
      `,
      [
        payload.id || randomId('workflow-version'),
        definition.id,
        payload.version || definition.currentVersion || 1,
        payload.status || definition.status || 'draft',
        payload.changeSummary || '',
        payload.author || '',
        JSON.stringify(definitionSnapshot(definition)),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
  }

  async listDefinitionVersions(definitionId) {
    const { clauses, values } = this.buildWhere(['workflow_definition_id = $1'], [definitionId]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_definition_versions WHERE ${clauses.join(' AND ')} ORDER BY version DESC`,
      values
    );
    return result.rows.map(mapVersion);
  }

  async getDefinitionVersion(definitionId, version) {
    const { clauses, values } = this.buildWhere(
      ['workflow_definition_id = $1', 'version = $2'],
      [definitionId, Number(version)]
    );
    const result = await this.pool.query(
      `SELECT * FROM workflow_definition_versions WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapVersion(result.rows[0]);
  }

  async rollbackDefinition(definitionId, version, actor = 'system') {
    const target = await this.getDefinitionVersion(definitionId, version);
    if (!target) {
      const error = new Error('Workflow version not found.');
      error.statusCode = 404;
      throw error;
    }
    return this.updateDefinition(
      definitionId,
      { ...target.snapshot, status: 'draft', changeSummary: `Rollback to version ${version}` },
      actor
    );
  }

  async cloneDefinition(definitionId, actor = 'system') {
    const existing = await this.getDefinition(definitionId);
    if (!existing) {
      const error = new Error('Workflow definition not found.');
      error.statusCode = 404;
      throw error;
    }
    return this.createDefinition(
      {
        ...existing,
        id: undefined,
        name: `${existing.name} Clone`,
        code: `${existing.code}-clone-${Date.now()}`,
        status: 'draft',
        publishedVersion: null,
        changeSummary: `Cloned from ${existing.code}`,
      },
      actor
    );
  }

  async exportDefinition(definitionId) {
    const definition = await this.getDefinition(definitionId);
    const versions = definition ? await this.listDefinitionVersions(definition.id) : [];
    return { definition, versions };
  }

  async createApprovalTask(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('approval-task');
    await this.pool.query(
      `
        INSERT INTO workflow_approval_tasks (
          id, workflow_instance_id, level_index, level_name, reviewer, reviewer_role,
          reviewer_department, status, required, vote_weight, delegated_from, due_at,
          metadata, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16)
      `,
      [
        id,
        payload.workflowInstanceId,
        payload.levelIndex || 1,
        payload.levelName || '',
        payload.reviewer || '',
        payload.reviewerRole || '',
        payload.reviewerDepartment || '',
        payload.status || 'pending',
        payload.required !== false,
        payload.voteWeight || 1,
        payload.delegatedFrom || '',
        payload.dueAt || null,
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return this.getApprovalTask(id);
  }

  async listApprovalTasks(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.workflowInstanceId) {
      values.push(filters.workflowInstanceId);
      clauses.push(`workflow_instance_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.reviewer) {
      values.push(filters.reviewer);
      clauses.push(`reviewer = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_approval_tasks ${where} ORDER BY created_at DESC LIMIT 500`,
      values
    );
    return result.rows.map(mapTask);
  }

  async getApprovalTask(id) {
    const { clauses, values } = this.buildWhere(['id = $1'], [id]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_approval_tasks WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapTask(result.rows[0]);
  }

  async decideApprovalTask(id, { decision, actor = '', comment = '' } = {}) {
    await this.pool.query(
      `
        UPDATE workflow_approval_tasks
        SET status=$2, decision=$3, comment=$4, decided_at=NOW(), updated_at=NOW()
        WHERE id=$1
      `,
      [id, decision === 'approved' ? 'approved' : 'rejected', decision, comment || actor]
    );
    return this.getApprovalTask(id);
  }

  async createDelegation(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('delegation');
    await this.pool.query(
      `
        INSERT INTO workflow_delegations (
          id, delegator, delegate, delegation_type, scope, reason, starts_at, expires_at,
          status, metadata, tenant_id, organization_id, owner_id, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)
      `,
      [
        id,
        payload.delegator,
        payload.delegate,
        payload.delegationType || 'temporary',
        payload.scope || 'all',
        payload.reason || '',
        payload.startsAt || new Date(),
        payload.expiresAt || null,
        payload.status || 'active',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
        payload.createdBy || '',
      ]
    );
    return this.getDelegation(id);
  }

  async listDelegations(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.delegator) {
      values.push(filters.delegator);
      clauses.push(`delegator = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_delegations ${where} ORDER BY created_at DESC LIMIT 500`,
      values
    );
    return result.rows.map(mapDelegation);
  }

  async getDelegation(id) {
    const { clauses, values } = this.buildWhere(['id = $1'], [id]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_delegations WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapDelegation(result.rows[0]);
  }

  async expireDelegations(now = new Date()) {
    await this.pool.query(
      "UPDATE workflow_delegations SET status='expired', updated_at=NOW() WHERE status='active' AND expires_at IS NOT NULL AND expires_at < $1",
      [now]
    );
  }

  async createEscalation(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('escalation');
    await this.pool.query(
      `
        INSERT INTO workflow_escalations (
          id, workflow_instance_id, approval_task_id, escalation_type, from_reviewer,
          to_reviewer, reason, status, metadata, tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
      `,
      [
        id,
        payload.workflowInstanceId || null,
        payload.approvalTaskId || null,
        payload.escalationType || 'timeout',
        payload.fromReviewer || '',
        payload.toReviewer || '',
        payload.reason || '',
        payload.status || 'open',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    if (payload.workflowInstanceId) {
      await this.markEscalated(payload.workflowInstanceId);
    }
    return this.getEscalation(id);
  }

  async listEscalations(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.workflowInstanceId) {
      values.push(filters.workflowInstanceId);
      clauses.push(`workflow_instance_id = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_escalations ${where} ORDER BY escalated_at DESC LIMIT 500`,
      values
    );
    return result.rows.map(mapEscalation);
  }

  async getEscalation(id) {
    const { clauses, values } = this.buildWhere(['id = $1'], [id]);
    const result = await this.pool.query(
      `SELECT * FROM workflow_escalations WHERE ${clauses.join(' AND ')} LIMIT 1`,
      values
    );
    return mapEscalation(result.rows[0]);
  }

  async addSlaEvent(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('sla-event');
    await this.pool.query(
      `
        INSERT INTO workflow_sla_events (
          id, workflow_instance_id, event_type, severity, message, metadata,
          tenant_id, organization_id, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
      `,
      [
        id,
        payload.workflowInstanceId,
        payload.eventType,
        payload.severity || 'info',
        payload.message || '',
        JSON.stringify(payload.metadata || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
      ]
    );
    return id;
  }

  async listSlaEvents(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.workflowInstanceId) {
      values.push(filters.workflowInstanceId);
      clauses.push(`workflow_instance_id = $${values.length}`);
    }
    if (filters.eventType) {
      values.push(filters.eventType);
      clauses.push(`event_type = $${values.length}`);
    }
    appendTenantFilter(clauses, values);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM workflow_sla_events ${where} ORDER BY occurred_at DESC LIMIT 500`,
      values
    );
    return result.rows.map((row) => ({
      id: row.id,
      workflowInstanceId: row.workflow_instance_id,
      eventType: row.event_type,
      severity: row.severity,
      occurredAt: row.occurred_at,
      message: row.message,
      metadata: asJson(row.metadata, {}),
    }));
  }

  async saveNotification(payload = {}) {
    const tenant = tenantColumnsForInsert(payload);
    const id = payload.id || randomId('workflow-notification');
    await this.pool.query(
      `
        INSERT INTO workflow_notifications (
          id, workflow_instance_id, channel, recipient, event_type, status,
          payload, tenant_id, organization_id, owner_id, delivered_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)
      `,
      [
        id,
        payload.workflowInstanceId || null,
        payload.channel || 'in_app',
        payload.recipient || '',
        payload.eventType || 'workflow_event',
        payload.status || 'queued',
        JSON.stringify(payload.payload || {}),
        tenant.tenantId,
        tenant.organizationId,
        tenant.ownerId,
        payload.deliveredAt || null,
      ]
    );
    return id;
  }

  async getDashboard({ days = 30 } = {}) {
    const since = new Date(Date.now() - Math.min(Math.max(Number(days) || 30, 1), 365) * 86400000);
    const tenantScope = this.buildWhere();
    const instanceWhere = tenantScope.where;
    const instanceValues = tenantScope.values;

    const overdueScope = this.buildWhere(['deadline_at IS NOT NULL', 'deadline_at < NOW()']);
    const breachScope = this.buildWhere(['event_type = $1'], ['sla_breached']);
    const trendScope = this.buildWhere(['created_at >= $1'], [since]);

    const [
      states,
      approvals,
      escalations,
      delegations,
      overdue,
      breached,
      topWorkflows,
      topApprovers,
      history,
      trends,
    ] = await Promise.all([
      this.pool.query(
        `SELECT current_state, COUNT(*)::int AS total FROM workflow_instances ${instanceWhere} GROUP BY current_state`,
        instanceValues
      ),
      this.pool.query(
        `SELECT status, COUNT(*)::int AS total FROM workflow_approval_tasks ${instanceWhere} GROUP BY status`,
        instanceValues
      ),
      this.pool.query(
        `SELECT status, COUNT(*)::int AS total FROM workflow_escalations ${instanceWhere} GROUP BY status`,
        instanceValues
      ),
      this.pool.query(
        `SELECT status, COUNT(*)::int AS total FROM workflow_delegations ${instanceWhere} GROUP BY status`,
        instanceValues
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM workflow_instances WHERE ${overdueScope.clauses.join(' AND ')}`,
        overdueScope.values
      ),
      this.pool.query(
        `SELECT COUNT(*)::int AS total FROM workflow_sla_events WHERE ${breachScope.clauses.join(' AND ')}`,
        breachScope.values
      ),
      this.pool.query(
        `SELECT COALESCE(workflow_definition_id, subject_type) AS workflow, COUNT(*)::int AS total
         FROM workflow_instances ${instanceWhere}
         GROUP BY COALESCE(workflow_definition_id, subject_type)
         ORDER BY total DESC LIMIT 8`,
        instanceValues
      ),
      this.pool.query(
        `SELECT reviewer, COUNT(*)::int AS total
         FROM workflow_approval_tasks ${instanceWhere}
         GROUP BY reviewer ORDER BY total DESC LIMIT 8`,
        instanceValues
      ),
      this.pool.query(
        `SELECT * FROM workflow_history ${instanceWhere} ORDER BY created_at DESC LIMIT 20`,
        instanceValues
      ),
      this.pool.query(
        `
          SELECT created_at
          FROM workflow_instances
          WHERE ${trendScope.clauses.join(' AND ')}
          ORDER BY created_at ASC
        `,
        trendScope.values
      ),
    ]);

    const stateCount = (name) =>
      states.rows.find((row) => row.current_state === name)?.total || 0;
    const approvalCount = (name) => approvals.rows.find((row) => row.status === name)?.total || 0;
    const totalInstances = states.rows.reduce((sum, row) => sum + row.total, 0);
    const approved = stateCount('Approved') + stateCount('Exported') + stateCount('Archived');
    const rejected = stateCount('Rejected');
    const decided = approved + rejected;
    const pending = approvalCount('pending') + approvalCount('assigned');
    const slaBreaches = breached.rows[0]?.total || 0;

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        running: totalInstances - decided,
        pendingApprovals: pending,
        rejected,
        approved,
        overdue: overdue.rows[0]?.total || 0,
        escalated: escalations.rows.reduce((sum, row) => sum + row.total, 0),
        delegated: delegations.rows.reduce((sum, row) => sum + row.total, 0),
        averageDurationMinutes: 0,
        approvalRate: decided ? Number(((approved / decided) * 100).toFixed(2)) : 0,
        slaCompliance: totalInstances ? Number((((totalInstances - slaBreaches) / totalInstances) * 100).toFixed(2)) : 100,
        workflowHealth: totalInstances ? Math.max(0, 100 - rejected * 5 - slaBreaches * 10) : 100,
      },
      states: states.rows.map((row) => ({ state: row.current_state, total: row.total })),
      approvalTasks: approvals.rows,
      escalations: escalations.rows,
      delegations: delegations.rows,
      bottlenecks: approvals.rows
        .filter((row) => ['pending', 'assigned'].includes(row.status))
        .map((row) => ({ label: row.status, total: row.total })),
      topWorkflows: topWorkflows.rows,
      topApprovers: topApprovers.rows,
      approvalHistory: history.rows,
      trends: {
        daily: this.bucketTrend(trends.rows, 'daily'),
        weekly: this.bucketTrend(trends.rows, 'weekly'),
        monthly: this.bucketTrend(trends.rows, 'monthly'),
      },
    };
  }

  bucketTrend(rows = [], granularity = 'daily') {
    const buckets = new Map();
    for (const row of rows) {
      const date = new Date(row.created_at);
      let key = date.toISOString().slice(0, 10);
      if (granularity === 'weekly') {
        const monday = new Date(date);
        const weekday = (monday.getDay() + 6) % 7;
        monday.setDate(monday.getDate() - weekday);
        key = monday.toISOString().slice(0, 10);
      }
      if (granularity === 'monthly') {
        key = date.toISOString().slice(0, 7);
      }
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    return [...buckets.entries()].map(([bucket, total]) => ({ bucket, total }));
  }

  async getAnalytics({ days = 30 } = {}) {
    const dashboard = await this.getDashboard({ days });
    return {
      generatedAt: dashboard.generatedAt,
      approvalKpis: {
        pending: dashboard.metrics.pendingApprovals,
        approvalRate: dashboard.metrics.approvalRate,
        averageApprovalTimeMinutes: dashboard.metrics.averageDurationMinutes,
      },
      slaKpis: {
        overdue: dashboard.metrics.overdue,
        compliance: dashboard.metrics.slaCompliance,
      },
      workflowUsage: dashboard.topWorkflows,
      workflowSuccess: dashboard.metrics.approvalRate,
      failureCauses: dashboard.states.filter((entry) => entry.state === 'Rejected'),
      escalations: dashboard.escalations,
      delegations: dashboard.delegations,
      trends: dashboard.trends,
    };
  }

  async getEvaluationMetrics() {
    const dashboard = await this.getDashboard({ days: 30 });
    const complexity = dashboard.topWorkflows.length + dashboard.metrics.pendingApprovals;
    return {
      workflowQualityScore: dashboard.metrics.workflowHealth,
      approvalEfficiency: dashboard.metrics.approvalRate,
      slaScore: dashboard.metrics.slaCompliance,
      governanceScore: Math.round(
        (dashboard.metrics.workflowHealth + dashboard.metrics.approvalRate + dashboard.metrics.slaCompliance) / 3
      ),
      escalationScore: Math.max(0, 100 - dashboard.metrics.escalated * 10),
      delegationScore: dashboard.metrics.delegated > 0 ? 95 : 85,
      approvalReliability: dashboard.metrics.approvalRate,
      workflowComplexity: Math.min(100, complexity * 5),
      workflowStability: Math.max(0, 100 - dashboard.metrics.rejected * 5),
      evidence: dashboard.metrics,
    };
  }
}
