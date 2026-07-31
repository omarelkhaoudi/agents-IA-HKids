import { randomUUID } from 'node:crypto';
import { workflowStates } from './WorkflowRules.js';

const DEFAULT_POLICIES = [
  {
    name: 'Administration Policy',
    code: 'administration-policy',
    category: 'administration',
    policyType: 'administration',
    description: 'Generic administrative approvals with manager fallback.',
    fallbackApprovers: ['Manager', 'Administrator'],
    rules: { approverTypes: ['role', 'owner', 'fallback'], exportRequiresApproval: true },
  },
  {
    name: 'Marketing Policy',
    code: 'marketing-policy',
    category: 'marketing',
    policyType: 'content',
    description: 'Generic content approvals before publication or export.',
    fallbackApprovers: ['Community Manager', 'Manager'],
    rules: { approverTypes: ['role', 'agent_specific'], publicationRequiresApproval: true },
  },
  {
    name: 'Sales Policy',
    code: 'sales-policy',
    category: 'sales',
    policyType: 'commercial',
    description: 'Generic commercial approval policy for quotations and contracts.',
    fallbackApprovers: ['Sales Manager', 'Administrator'],
    rules: { approverTypes: ['role', 'manager_hierarchy'], exportRequiresApproval: true },
  },
  {
    name: 'HR Policy',
    code: 'hr-policy',
    category: 'hr',
    policyType: 'hr',
    description: 'Generic HR approval policy for employee and candidate workflows.',
    fallbackApprovers: ['HR Manager', 'Administrator'],
    rules: { approverTypes: ['department', 'manager_hierarchy'], sensitiveActionApproval: true },
  },
  {
    name: 'Knowledge Policy',
    code: 'knowledge-policy',
    category: 'knowledge',
    policyType: 'knowledge',
    description: 'Generic knowledge publication approval policy.',
    fallbackApprovers: ['Knowledge Manager', 'Administrator'],
    rules: { approverTypes: ['knowledge_approver', 'role'], publicationRequiresApproval: true },
  },
  {
    name: 'Prompt Policy',
    code: 'prompt-policy',
    category: 'prompt',
    policyType: 'prompt',
    description: 'Generic prompt lifecycle approval policy.',
    fallbackApprovers: ['Prompt Owner', 'Administrator'],
    rules: { approverTypes: ['prompt_approver', 'owner'], publicationRequiresApproval: true },
  },
  {
    name: 'Security Policy',
    code: 'security-policy',
    category: 'security',
    policyType: 'security',
    description: 'Generic security review policy for sensitive changes.',
    fallbackApprovers: ['Security Reviewer', 'Administrator'],
    rules: { approverTypes: ['role', 'fallback'], escalationRequired: true },
  },
];

const DEFAULT_TEMPLATES = [
  ['Document Approval', 'document-approval', 'administration'],
  ['Content Approval', 'content-approval', 'marketing'],
  ['Quotation Approval', 'quotation-approval', 'sales'],
  ['Contract Approval', 'contract-approval', 'sales'],
  ['HR Request', 'hr-request', 'hr'],
  ['Recruitment', 'recruitment', 'hr'],
  ['Training', 'training', 'hr'],
  ['Knowledge Publication', 'knowledge-publication', 'knowledge'],
  ['Prompt Publication', 'prompt-publication', 'prompt'],
  ['Document Review', 'document-review', 'administration'],
  ['Security Review', 'security-review', 'security'],
  ['Policy Approval', 'policy-approval', 'administration'],
].map(([name, code, category]) => ({
  name,
  code,
  category,
  description: `Generic ${name.toLowerCase()} workflow structure.`,
  tags: [category, 'approval', 'governance'],
  owner: 'Workflow Governance',
  definition: {
    priority: category === 'security' ? 'high' : 'normal',
    executionMode: category === 'security' ? 'mixed' : 'sequential',
    approvalStrategy: category === 'security' ? 'all_required' : 'all_required',
    approvalChain: [
      {
        levelIndex: 1,
        levelName: 'Manager Review',
        approverType: 'role',
        approvers: ['Manager'],
        required: true,
        timeoutMinutes: 1440,
      },
      {
        levelIndex: 2,
        levelName: 'Administrator Approval',
        approverType: 'role',
        approvers: ['Administrator'],
        required: category === 'security' || category === 'sales' || category === 'hr',
        timeoutMinutes: 2880,
      },
    ],
    conditions: [{ field: 'risk', operator: 'gte', value: category === 'security' ? 'medium' : 'low' }],
    sla: {
      expectedDurationMinutes: 1440,
      maximumDurationMinutes: 2880,
      businessHours: true,
      escalationMinutes: 1440,
    },
    escalationRules: [
      { trigger: 'approval_timeout', escalateTo: 'Administrator', afterMinutes: 1440 },
      { trigger: 'high_priority', escalateTo: 'Administrator', afterMinutes: 240 },
    ],
  },
}));

function randomId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function minutesFromNow(minutes) {
  return new Date(Date.now() + Number(minutes || 0) * 60 * 1000);
}

function subjectFromPayload(payload = {}) {
  return {
    subjectType: payload.subjectType || 'generated_document',
    subjectId: payload.subjectId || payload.documentId || '',
  };
}

export class WorkflowEngine {
  constructor({
    workflowRepository,
    workflowRules,
    workflowHistory,
    approvalService,
    notificationService,
    observabilityService = null,
    auditService = null,
  }) {
    this.workflowRepository = workflowRepository;
    this.workflowRules = workflowRules;
    this.workflowHistory = workflowHistory;
    this.approvalService = approvalService;
    this.notificationService = notificationService;
    this.observabilityService = observabilityService;
    this.auditService = auditService;
  }

  setObservabilityService(observabilityService) {
    this.observabilityService = observabilityService;
  }

  setAuditService(auditService) {
    this.auditService = auditService;
  }

  async initialize() {
    await this.workflowRepository.ensureRules(this.workflowRules.listRules());
    await this.workflowRepository.seedGovernanceDefaults({
      templates: DEFAULT_TEMPLATES,
      policies: DEFAULT_POLICIES,
    });
  }

  async recordGovernanceEvent(event = {}) {
    if (this.observabilityService?.recordEvent) {
      await this.observabilityService.recordEvent({
        eventType: event.eventType || 'workflow_event',
        category: 'workflow',
        severity: event.severity || 'info',
        source: 'workflow-engine',
        actor: event.actor || 'system',
        subjectType: event.subjectType || 'workflow',
        subjectId: event.subjectId || event.workflowId,
        summary: event.summary || event.eventType || 'Workflow event recorded.',
        durationMs: event.durationMs,
        metadata: event.metadata || {},
      });
    }

    if (this.auditService?.record && event.sensitive) {
      await this.auditService.record({
        user: { email: event.actor || 'system' },
        eventType: event.eventType || 'workflow_event',
        subjectType: event.subjectType || 'workflow',
        subjectId: event.subjectId || event.workflowId,
        action: event.action || event.eventType,
        allowed: true,
        reason: event.reason || '',
        metadata: event.metadata || {},
      });
    }
  }

  async createWorkflow({
    conversationId,
    documentId,
    reviewers = ['Administrator'],
    approverMode = 'single',
    requiredApprovals,
    workflowDefinitionId,
    workflowDefinitionCode,
    policyCode,
    agentCode = '',
    priority = 'normal',
    metadata = {},
  }) {
    const definition = workflowDefinitionId || workflowDefinitionCode
      ? await this.workflowRepository.getDefinition(workflowDefinitionId || workflowDefinitionCode)
      : null;
    const policy = policyCode ? await this.workflowRepository.getPolicyByCode(policyCode) : null;
    const normalizedReviewers = reviewers.length ? reviewers : ['Administrator'];
    const chain = this.approvalService.normalizeChain({ reviewers: normalizedReviewers, definition, policy });
    const requiredTaskCount = chain.reduce(
      (count, level) => count + (level.required === false ? 0 : level.approvers.length),
      0
    );
    const sla = definition?.sla || {};
    const workflow = await this.workflowRepository.createInstance({
      id: randomId('workflow'),
      conversationId,
      documentId,
      subjectType: 'generated_document',
      subjectId: documentId,
      workflowDefinitionId: definition?.id || null,
      workflowVersion: definition?.publishedVersion || definition?.currentVersion || 1,
      policyId: policy?.id || definition?.policyId || null,
      agentCode,
      currentState: workflowStates.draft,
      approverMode,
      requiredApprovals:
        requiredApprovals || (approverMode === 'multiple' ? normalizedReviewers.length : requiredTaskCount || 1),
      priority: definition?.priority || priority,
      executionMode: definition?.executionMode || 'sequential',
      approvalStrategy: definition?.approvalStrategy || 'all_required',
      expectedDurationMinutes: sla.expectedDurationMinutes || 1440,
      maximumDurationMinutes: sla.maximumDurationMinutes || 2880,
      deadlineAt: minutesFromNow(sla.maximumDurationMinutes || 2880),
      metadata: { requiresHumanApproval: true, ...metadata },
    });

    await this.workflowHistory.logTransition({
      workflowInstanceId: workflow.id,
      actor: 'system',
      previousState: null,
      newState: workflowStates.draft,
      comment: 'Workflow created.',
    });

    await this.createApprovalTasks(workflow, chain);
    await this.notifyWorkflow(workflow, {
      eventType: 'workflow_created',
      actor: 'system',
      recipients: normalizedReviewers,
    });
    await this.recordGovernanceEvent({
      eventType: 'workflow_created',
      workflowId: workflow.id,
      subjectType: 'generated_document',
      subjectId: documentId,
      metadata: { agentCode, workflowDefinitionId: definition?.id || null },
    });

    return this.workflowRepository.getByDocumentId(documentId);
  }

  async createGovernedWorkflow(payload = {}) {
    const existing = payload.subjectId
      ? await this.workflowRepository.getBySubject(payload.subjectType, payload.subjectId)
      : null;
    if (existing) return existing;

    const definition = payload.workflowDefinitionId || payload.workflowDefinitionCode
      ? await this.workflowRepository.getDefinition(payload.workflowDefinitionId || payload.workflowDefinitionCode)
      : null;
    const policy = payload.policyCode ? await this.workflowRepository.getPolicyByCode(payload.policyCode) : null;
    const chain = this.approvalService.normalizeChain({
      reviewers: payload.reviewers || [],
      definition,
      policy,
    });
    const sla = definition?.sla || payload.sla || {};
    const subject = subjectFromPayload(payload);
    const workflow = await this.workflowRepository.createInstance({
      id: payload.id || randomId('workflow'),
      conversationId: payload.conversationId || null,
      documentId: payload.documentId || null,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      workflowDefinitionId: definition?.id || null,
      workflowVersion: definition?.publishedVersion || definition?.currentVersion || 1,
      policyId: policy?.id || definition?.policyId || null,
      agentCode: payload.agentCode || '',
      currentState: workflowStates.draft,
      approverMode: payload.approverMode || 'multi_level',
      requiredApprovals: payload.requiredApprovals || chain.length,
      priority: payload.priority || definition?.priority || 'normal',
      executionMode: payload.executionMode || definition?.executionMode || 'sequential',
      approvalStrategy: payload.approvalStrategy || definition?.approvalStrategy || 'all_required',
      expectedDurationMinutes: sla.expectedDurationMinutes || 1440,
      maximumDurationMinutes: sla.maximumDurationMinutes || 2880,
      deadlineAt: minutesFromNow(sla.maximumDurationMinutes || 2880),
      metadata: {
        requiresHumanApproval: true,
        source: payload.source || 'workflow_governance',
        ...payload.metadata,
      },
    });

    await this.workflowHistory.logTransition({
      workflowInstanceId: workflow.id,
      actor: payload.actor || 'system',
      previousState: null,
      newState: workflowStates.draft,
      comment: payload.comment || 'Governed workflow created.',
    });
    await this.createApprovalTasks(workflow, chain);
    await this.notifyWorkflow(workflow, {
      eventType: 'workflow_created',
      actor: payload.actor || 'system',
      recipients: chain.flatMap((level) => level.approvers),
    });
    await this.recordGovernanceEvent({
      eventType: 'workflow_created',
      workflowId: workflow.id,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      metadata: { agentCode: payload.agentCode || '', source: payload.source || '' },
    });
    return this.workflowRepository.getInstance(workflow.id);
  }

  async createApprovalTasks(workflow, chain = []) {
    for (const level of chain) {
      for (const reviewer of level.approvers) {
        await this.workflowRepository.assignReviewer({
          id: randomId('assignment'),
          workflowInstanceId: workflow.id,
          reviewer,
        });
        await this.workflowRepository.createApprovalTask({
          workflowInstanceId: workflow.id,
          levelIndex: level.levelIndex,
          levelName: level.levelName,
          reviewer,
          reviewerRole: level.approverType === 'role' ? reviewer : '',
          reviewerDepartment: level.approverType === 'department' ? reviewer : '',
          required: level.required,
          dueAt: minutesFromNow(level.timeoutMinutes || 1440),
          metadata: {
            approverType: level.approverType,
            strategy: level.strategy,
          },
        });
      }
    }
  }

  getWorkflowByDocumentId(documentId) {
    return this.workflowRepository.getByDocumentId(documentId);
  }

  getWorkflowBySubject(subjectType, subjectId) {
    return this.workflowRepository.getBySubject(subjectType, subjectId);
  }

  listWorkflows(filters = {}) {
    return this.workflowRepository.listInstances(filters);
  }

  async transition({ documentId, workflowId, subjectType, subjectId, actor, nextState, comment }) {
    const workflow = workflowId
      ? await this.workflowRepository.getInstance(workflowId)
      : subjectType && subjectId
        ? await this.workflowRepository.getBySubject(subjectType, subjectId)
        : await this.workflowRepository.getByDocumentId(documentId);

    if (!workflow) {
      throw new Error('Workflow instance not found.');
    }

    if (!this.workflowRules.canTransition(workflow.currentState, nextState)) {
      throw new Error(`Transition from "${workflow.currentState}" to "${nextState}" is not allowed.`);
    }

    if (nextState === workflowStates.archived && !this.approvalService.canArchive(workflow.currentState)) {
      throw new Error('Archive is only allowed after export.');
    }

    await this.workflowRepository.updateState(workflow.id, nextState);
    await this.workflowHistory.logTransition({
      workflowInstanceId: workflow.id,
      actor,
      previousState: workflow.currentState,
      newState: nextState,
      comment,
    });

    if (['Approved', 'Rejected'].includes(nextState)) {
      const tasks = await this.workflowRepository.listApprovalTasks({
        workflowInstanceId: workflow.id,
        status: 'pending',
      });
      for (const task of tasks) {
        await this.workflowRepository.decideApprovalTask(task.id, {
          decision: nextState === 'Approved' ? 'approved' : 'rejected',
          actor,
          comment: comment || nextState,
        });
      }
    }

    if (comment) {
      await this.workflowRepository.addComment({
        id: randomId('comment'),
        workflowInstanceId: workflow.id,
        actor,
        comment,
      });
    }

    await this.notifyWorkflow(workflow, {
      eventType: 'workflow_state_changed',
      state: nextState,
      actor,
    });
    await this.recordGovernanceEvent({
      eventType: 'workflow_transition',
      workflowId: workflow.id,
      subjectType: workflow.subjectType,
      subjectId: workflow.subjectId,
      actor,
      metadata: { previousState: workflow.currentState, nextState },
    });

    if (workflow.documentId) {
      return this.workflowRepository.getByDocumentId(workflow.documentId);
    }
    return this.workflowRepository.getInstance(workflow.id);
  }

  async submitGovernedSubject(subjectType, subjectId, actor = 'reviewer', comment = 'Submitted for review.') {
    const workflow = await this.workflowRepository.getBySubject(subjectType, subjectId);
    if (!workflow) {
      throw new Error('Workflow instance not found.');
    }
    if (workflow.currentState === workflowStates.draft) {
      return this.transition({
        workflowId: workflow.id,
        actor,
        nextState: workflowStates.pendingReview,
        comment,
      });
    }
    return workflow;
  }

  async approveGovernedSubject(subjectType, subjectId, actor = 'reviewer', comment = 'Approved.') {
    const workflow = await this.workflowRepository.getBySubject(subjectType, subjectId);
    if (!workflow) throw new Error('Workflow instance not found.');
    if (workflow.currentState === workflowStates.draft) {
      await this.submitGovernedSubject(subjectType, subjectId, actor, 'Submitted for approval.');
    }
    const pendingTasks = await this.workflowRepository.listApprovalTasks({
      workflowInstanceId: workflow.id,
      status: 'pending',
    });
    const task = pendingTasks.find((item) => item.reviewer === actor) || pendingTasks[0];
    if (task) {
      await this.workflowRepository.decideApprovalTask(task.id, {
        decision: 'approved',
        actor,
        comment,
      });
    }
    const tasks = await this.workflowRepository.listApprovalTasks({ workflowInstanceId: workflow.id });
    const decision = this.approvalService.evaluateCompletion(tasks, workflow.approvalStrategy);
    if (decision.completed) {
      return this.transition({
        workflowId: workflow.id,
        actor,
        nextState: decision.rejected ? workflowStates.rejected : workflowStates.approved,
        comment,
      });
    }
    return this.workflowRepository.getInstance(workflow.id);
  }

  async rejectGovernedSubject(subjectType, subjectId, actor = 'reviewer', comment = 'Rejected.') {
    const workflow = await this.workflowRepository.getBySubject(subjectType, subjectId);
    if (!workflow) throw new Error('Workflow instance not found.');
    if (workflow.currentState === workflowStates.draft) {
      await this.submitGovernedSubject(subjectType, subjectId, actor, 'Submitted before rejection.');
    }
    const pendingTasks = await this.workflowRepository.listApprovalTasks({
      workflowInstanceId: workflow.id,
      status: 'pending',
    });
    const task = pendingTasks.find((item) => item.reviewer === actor) || pendingTasks[0];
    if (task) {
      await this.workflowRepository.decideApprovalTask(task.id, {
        decision: 'rejected',
        actor,
        comment,
      });
    }
    return this.transition({
      workflowId: workflow.id,
      actor,
      nextState: workflowStates.rejected,
      comment,
    });
  }

  async exportGovernedSubject(subjectType, subjectId, actor = 'system', comment = 'Exported.') {
    const workflow = await this.workflowRepository.getBySubject(subjectType, subjectId);
    if (!workflow) throw new Error('Workflow instance not found.');
    if (!this.approvalService.canExport(workflow.currentState)) {
      const error = new Error('Workflow approval is required before export.');
      error.statusCode = 409;
      throw error;
    }
    if (workflow.currentState === workflowStates.approved) {
      return this.transition({
        workflowId: workflow.id,
        actor,
        nextState: workflowStates.exported,
        comment,
      });
    }
    return workflow;
  }

  async notifyWorkflow(workflow, event) {
    return this.notificationService.notify({
      workflowId: workflow.id,
      workflowInstanceId: workflow.id,
      subjectType: workflow.subjectType,
      subjectId: workflow.subjectId,
      ...event,
    });
  }

  validateDefinition(payload = {}) {
    const errors = [];
    const warnings = [];
    if (!payload.name) errors.push('Workflow name is required.');
    if (!payload.code) errors.push('Workflow code is required.');
    if (!Array.isArray(payload.approvalChain) || payload.approvalChain.length === 0) {
      errors.push('At least one approval level is required.');
    }
    for (const [index, level] of (payload.approvalChain || []).entries()) {
      if (!Array.isArray(level.approvers) || level.approvers.length === 0) {
        errors.push(`Approval level ${index + 1} needs at least one approver.`);
      }
      if (Number(level.timeoutMinutes || 0) <= 0) {
        warnings.push(`Approval level ${index + 1} has no timeout.`);
      }
    }
    if (!payload.sla?.maximumDurationMinutes) {
      warnings.push('Maximum SLA duration is not configured.');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  createDefinition(payload, actor = 'system') {
    const validation = this.validateDefinition(payload);
    if (!validation.valid) {
      const error = new Error(validation.errors.join(' '));
      error.statusCode = 400;
      throw error;
    }
    return this.workflowRepository.createDefinition(payload, actor);
  }

  updateDefinition(id, payload, actor = 'system') {
    return this.workflowRepository.updateDefinition(id, payload, actor);
  }

  publishDefinition(id, actor = 'system') {
    return this.workflowRepository.updateDefinition(id, { status: 'published', changeSummary: 'Published' }, actor);
  }

  archiveDefinition(id, actor = 'system') {
    return this.workflowRepository.updateDefinition(id, { status: 'archived', changeSummary: 'Archived' }, actor);
  }

  deprecateDefinition(id, actor = 'system') {
    return this.workflowRepository.updateDefinition(id, { status: 'deprecated', changeSummary: 'Deprecated' }, actor);
  }

  cloneDefinition(id, actor = 'system') {
    return this.workflowRepository.cloneDefinition(id, actor);
  }

  rollbackDefinition(id, version, actor = 'system') {
    return this.workflowRepository.rollbackDefinition(id, version, actor);
  }

  async compareDefinitionVersions(id, leftVersion, rightVersion) {
    const [left, right] = await Promise.all([
      this.workflowRepository.getDefinitionVersion(id, leftVersion),
      this.workflowRepository.getDefinitionVersion(id, rightVersion),
    ]);
    return {
      left,
      right,
      changes: {
        approvalChainChanged:
          JSON.stringify(left?.snapshot?.approvalChain || []) !==
          JSON.stringify(right?.snapshot?.approvalChain || []),
        slaChanged: JSON.stringify(left?.snapshot?.sla || {}) !== JSON.stringify(right?.snapshot?.sla || {}),
        statusChanged: left?.status !== right?.status,
      },
    };
  }

  listDefinitions(filters) {
    return this.workflowRepository.listDefinitions(filters);
  }

  getDefinition(id) {
    return this.workflowRepository.getDefinition(id);
  }

  listDefinitionVersions(id) {
    return this.workflowRepository.listDefinitionVersions(id);
  }

  exportDefinition(id) {
    return this.workflowRepository.exportDefinition(id);
  }

  importDefinition(payload, actor = 'system') {
    const definition = payload.definition || payload;
    return this.createDefinition(
      {
        ...definition,
        id: undefined,
        code: `${definition.code || 'imported-workflow'}-${Date.now()}`,
        status: 'draft',
        changeSummary: 'Imported workflow',
      },
      actor
    );
  }

  listTemplates(filters) {
    return this.workflowRepository.listTemplates(filters);
  }

  listPolicies(filters) {
    return this.workflowRepository.listPolicies(filters);
  }

  createDelegation(payload, actor = 'system') {
    return this.workflowRepository.createDelegation({ ...payload, createdBy: actor });
  }

  listDelegations(filters) {
    return this.workflowRepository.listDelegations(filters);
  }

  createEscalation(payload) {
    return this.workflowRepository.createEscalation(payload);
  }

  listEscalations(filters) {
    return this.workflowRepository.listEscalations(filters);
  }

  listApprovals(filters) {
    return this.workflowRepository.listApprovalTasks(filters);
  }

  decideApproval(taskId, payload = {}) {
    return this.workflowRepository.decideApprovalTask(taskId, payload);
  }

  async checkSla() {
    const workflows = await this.workflowRepository.listInstances({ limit: 500 });
    const now = Date.now();
    const breached = [];
    for (const workflow of workflows) {
      if (
        workflow.deadlineAt &&
        !workflow.completedAt &&
        new Date(workflow.deadlineAt).getTime() < now
      ) {
        await this.workflowRepository.addSlaEvent({
          workflowInstanceId: workflow.id,
          eventType: 'sla_breached',
          severity: workflow.priority === 'critical' ? 'critical' : 'warning',
          message: 'Workflow SLA deadline breached.',
          metadata: { deadlineAt: workflow.deadlineAt, subjectType: workflow.subjectType },
        });
        await this.workflowRepository.createEscalation({
          workflowInstanceId: workflow.id,
          escalationType: 'approval_timeout',
          reason: 'SLA deadline breached',
          toReviewer: 'Administrator',
          metadata: { deadlineAt: workflow.deadlineAt },
        });
        breached.push(workflow.id);
      }
    }
    return { checked: workflows.length, breached: breached.length, items: breached };
  }

  listSlaEvents(filters) {
    return this.workflowRepository.listSlaEvents(filters);
  }

  async simulateWorkflow(payload = {}) {
    const definition = payload.workflowDefinitionId || payload.workflowDefinitionCode
      ? await this.workflowRepository.getDefinition(payload.workflowDefinitionId || payload.workflowDefinitionCode)
      : payload.definition || null;
    const policy = payload.policyCode ? await this.workflowRepository.getPolicyByCode(payload.policyCode) : null;
    const chain = this.approvalService.normalizeChain({
      reviewers: payload.reviewers || [],
      definition,
      policy,
    });
    const path = [
      workflowStates.draft,
      workflowStates.pendingReview,
      ...(chain.length ? chain.map((level) => `Approval: ${level.levelName}`) : ['Approval']),
      workflowStates.approved,
      workflowStates.exported,
    ];
    const estimatedDurationMinutes = chain.reduce(
      (sum, level) => sum + Number(level.timeoutMinutes || 0),
      0
    );
    const maximumDuration = Number(definition?.sla?.maximumDurationMinutes || payload.sla?.maximumDurationMinutes || 2880);
    const warnings = [];
    if (estimatedDurationMinutes > maximumDuration) {
      warnings.push('Approval chain may breach the maximum SLA duration.');
    }
    if (chain.some((level) => level.approvers.includes('Administrator'))) {
      warnings.push('Administrator appears in the approval path and may become a bottleneck.');
    }
    return {
      simulation: true,
      executionPath: path,
      approvalChain: chain,
      conditions: definition?.conditions || payload.conditions || [],
      estimatedDurationMinutes,
      slaPrediction: {
        maximumDurationMinutes: maximumDuration,
        likelyBreach: estimatedDurationMinutes > maximumDuration,
      },
      possibleBottlenecks: chain
        .filter((level) => level.approvers.length === 1)
        .map((level) => ({ levelName: level.levelName, approver: level.approvers[0] })),
      warnings,
    };
  }

  getDashboard(filters) {
    return this.workflowRepository.getDashboard(filters);
  }

  getAnalytics(filters) {
    return this.workflowRepository.getAnalytics(filters);
  }

  getEvaluationMetrics() {
    return this.workflowRepository.getEvaluationMetrics();
  }
}
