import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { KnowledgeDocumentRepository } from '../src/repositories/KnowledgeDocumentRepository.js';
import { PromptDefinitionRepository } from '../src/repositories/PromptDefinitionRepository.js';
import { DocumentManagementService } from '../src/services/dms/DocumentManagementService.js';
import { KnowledgePlatformService } from '../src/services/knowledge/KnowledgePlatformService.js';
import { PromptPlatformService } from '../src/services/prompt/PromptPlatformService.js';
import { ApprovalService } from '../src/services/workflows/ApprovalService.js';
import { NotificationService } from '../src/services/workflows/NotificationService.js';
import { WorkflowEngine } from '../src/services/workflows/WorkflowEngine.js';
import { WorkflowHistory } from '../src/services/workflows/WorkflowHistory.js';
import { WorkflowRepository } from '../src/services/workflows/WorkflowRepository.js';
import { WorkflowRules, workflowStates } from '../src/services/workflows/WorkflowRules.js';

class MemoryStorage {
  constructor() {
    this.files = new Map();
  }

  async save({ documentId, version, extension, buffer }) {
    const storageKey = `${documentId}/v${version}.${extension || 'bin'}`;
    this.files.set(storageKey, buffer);
    return {
      storageKey,
      checksum: createHash('sha256').update(buffer).digest('hex'),
      byteSize: buffer.byteLength,
    };
  }

  async read(storageKey) {
    const buffer = this.files.get(storageKey);
    if (!buffer) throw new Error('missing');
    return buffer;
  }
}

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const workflowRepository = new WorkflowRepository(pool);
  const workflowEngine = new WorkflowEngine({
    workflowRepository,
    workflowRules: new WorkflowRules(),
    workflowHistory: new WorkflowHistory(workflowRepository),
    approvalService: new ApprovalService(),
    notificationService: new NotificationService({ workflowRepository }),
  });
  await workflowEngine.initialize();

  const documentRepository = new KnowledgeDocumentRepository(pool);
  const promptRepository = new PromptDefinitionRepository(pool);
  const knowledgePlatform = new KnowledgePlatformService(pool, {
    documentRepository,
    workflowEngine,
  });
  const promptPlatform = new PromptPlatformService(pool, {
    promptRepository,
    workflowEngine,
  });
  const dms = new DocumentManagementService(pool, {
    documentRepository,
    knowledgePlatform,
    workflowEngine,
    infrastructure: {
      storage: new MemoryStorage(),
      maxUploadBytes: 5 * 1024 * 1024,
    },
  });

  await knowledgePlatform.seedCollectionsIfEmpty();
  await promptPlatform.seedLibrariesIfEmpty();
  await dms.seedFoldersIfEmpty();

  return { pool, workflowEngine, knowledgePlatform, promptPlatform, dms };
}

test('workflow governance seeds templates, policies, versions and simulation', async () => {
  const { workflowEngine } = await createStack();

  const templates = await workflowEngine.listTemplates();
  const policies = await workflowEngine.listPolicies();

  assert.ok(templates.some((item) => item.code === 'knowledge-publication'));
  assert.ok(templates.some((item) => item.code === 'prompt-publication'));
  assert.ok(policies.some((item) => item.code === 'security-policy'));

  const definition = await workflowEngine.createDefinition(
    {
      name: 'Security review test',
      code: 'security-review-test',
      category: 'security',
      status: 'draft',
      priority: 'high',
      executionMode: 'mixed',
      approvalStrategy: 'all_required',
      approvalChain: [
        {
          levelIndex: 1,
          levelName: 'Manager',
          approverType: 'role',
          approvers: ['Manager'],
          required: true,
          timeoutMinutes: 60,
        },
        {
          levelIndex: 2,
          levelName: 'Administrator',
          approverType: 'role',
          approvers: ['Administrator'],
          required: true,
          timeoutMinutes: 120,
        },
      ],
      conditions: [{ field: 'risk', operator: 'gte', value: 'medium' }],
      sla: { expectedDurationMinutes: 120, maximumDurationMinutes: 240, businessHours: true },
      escalationRules: [{ trigger: 'approval_timeout', escalateTo: 'Administrator' }],
    },
    'admin'
  );

  assert.equal(definition.status, 'draft');
  assert.equal(definition.currentVersion, 1);

  const published = await workflowEngine.publishDefinition(definition.id, 'admin');
  assert.equal(published.status, 'published');
  assert.equal(published.currentVersion, 2);
  assert.equal(published.publishedVersion, 2);

  const versions = await workflowEngine.listDefinitionVersions(definition.id);
  assert.ok(versions.length >= 2);

  const comparison = await workflowEngine.compareDefinitionVersions(definition.id, 1, 2);
  assert.equal(comparison.changes.statusChanged, true);

  const clone = await workflowEngine.cloneDefinition(definition.id, 'admin');
  assert.equal(clone.status, 'draft');
  assert.match(clone.code, /security-review-test-clone/);

  const simulation = await workflowEngine.simulateWorkflow({
    workflowDefinitionId: definition.id,
  });
  assert.equal(simulation.simulation, true);
  assert.ok(simulation.executionPath.includes(workflowStates.pendingReview));
  assert.equal(simulation.approvalChain.length, 2);
});

test('workflow governance handles multi-level approvals, SLA, escalation and evaluation', async () => {
  const { pool, workflowEngine } = await createStack();

  const definition = await workflowEngine.createDefinition(
    {
      name: 'Quotation approval test',
      code: 'quotation-approval-test',
      category: 'sales',
      status: 'published',
      priority: 'high',
      executionMode: 'sequential',
      approvalStrategy: 'all_required',
      approvalChain: [
        {
          levelIndex: 1,
          levelName: 'Manager',
          approverType: 'role',
          approvers: ['Manager'],
          required: true,
          timeoutMinutes: 30,
        },
        {
          levelIndex: 2,
          levelName: 'Director',
          approverType: 'role',
          approvers: ['Director'],
          required: true,
          timeoutMinutes: 60,
        },
      ],
      sla: { expectedDurationMinutes: 60, maximumDurationMinutes: 90 },
    },
    'admin'
  );

  const workflow = await workflowEngine.createGovernedWorkflow({
    subjectType: 'sales_quotation',
    subjectId: 'quote-001',
    workflowDefinitionId: definition.id,
    policyCode: 'sales-policy',
    agentCode: 'sales-agent',
    actor: 'sales-agent',
  });

  assert.equal(workflow.currentState, workflowStates.draft);
  assert.equal(workflow.approvalTasks.length, 2);

  const submitted = await workflowEngine.submitGovernedSubject(
    'sales_quotation',
    'quote-001',
    'sales-agent'
  );
  assert.equal(submitted.currentState, workflowStates.pendingReview);

  const afterManager = await workflowEngine.approveGovernedSubject(
    'sales_quotation',
    'quote-001',
    'Manager',
    'Manager approved'
  );
  assert.equal(afterManager.currentState, workflowStates.pendingReview);

  const approved = await workflowEngine.approveGovernedSubject(
    'sales_quotation',
    'quote-001',
    'Director',
    'Director approved'
  );
  assert.equal(approved.currentState, workflowStates.approved);

  const exported = await workflowEngine.exportGovernedSubject(
    'sales_quotation',
    'quote-001',
    'sales-agent'
  );
  assert.equal(exported.currentState, workflowStates.exported);

  const delegation = await workflowEngine.createDelegation(
    {
      delegator: 'Manager',
      delegate: 'Backup Manager',
      delegationType: 'vacation',
      reason: 'Temporary coverage',
    },
    'admin'
  );
  assert.equal(delegation.status, 'active');

  const blocked = await workflowEngine.createGovernedWorkflow({
    subjectType: 'security_review',
    subjectId: 'security-001',
    reviewers: ['Security Reviewer'],
    priority: 'critical',
    actor: 'security',
  });
  await pool.query('UPDATE workflow_instances SET deadline_at = $2 WHERE id = $1', [
    blocked.id,
    new Date(Date.now() - 60 * 60 * 1000),
  ]);

  const sla = await workflowEngine.checkSla();
  assert.ok(sla.breached >= 1);

  await workflowEngine.createEscalation({
    workflowInstanceId: blocked.id,
    escalationType: 'workflow_blocked',
    fromReviewer: 'Security Reviewer',
    toReviewer: 'Administrator',
    reason: 'Blocked review',
  });

  const dashboard = await workflowEngine.getDashboard();
  assert.ok(dashboard.metrics.escalated >= 1);
  assert.ok(dashboard.metrics.delegated >= 1);
  assert.ok(dashboard.metrics.overdue >= 1);

  const analytics = await workflowEngine.getAnalytics();
  assert.ok(analytics.escalations.length >= 1);
  assert.ok(analytics.delegations.length >= 1);

  const evaluation = await workflowEngine.getEvaluationMetrics();
  assert.ok(evaluation.workflowQualityScore >= 0);
  assert.ok(evaluation.governanceScore >= 0);
});

test('knowledge, prompt and DMS lifecycle actions are governed by the workflow engine', async () => {
  const { workflowEngine, knowledgePlatform, promptPlatform, dms } = await createStack();

  const document = await knowledgePlatform.createDocument(
    {
      title: 'Governed knowledge',
      category: 'Policies',
      description: 'Governance test',
      tags: ['governance'],
      status: 'draft',
      author: 'editor',
      fileType: 'TXT',
      size: '0.0 MB',
      sourceFileName: 'knowledge.txt',
    },
    'editor'
  );

  const inReview = await knowledgePlatform.submitForReview(document.id, 'editor');
  assert.equal(inReview.status, 'review');
  const published = await knowledgePlatform.publishDocument(document.id, 'Knowledge Manager');
  assert.equal(published.status, 'active');
  const knowledgeWorkflow = await workflowEngine.getWorkflowBySubject('knowledge_document', document.id);
  assert.equal(knowledgeWorkflow.currentState, workflowStates.approved);

  const prompt = await promptPlatform.createPrompt(
    {
      promptGroupId: 'governance-group',
      version: 1,
      status: 'draft',
      name: 'Governed prompt',
      description: 'Governance prompt test',
      role: 'Reviewer',
      objective: 'Validate prompt governance',
      systemPrompt: 'System',
      instructions: ['Review'],
      constraints: ['No side effects'],
      validationChecklist: ['Human approval'],
      outputStyle: 'Concise',
    },
    'prompt-editor'
  );

  await promptPlatform.submitForReview(prompt.id, 'prompt-editor');
  const approvedPrompt = await promptPlatform.approvePrompt(prompt.id, 'Prompt Owner');
  assert.equal(approvedPrompt.status, 'approved');
  const promptWorkflow = await workflowEngine.getWorkflowBySubject('prompt_definition', prompt.id);
  assert.equal(promptWorkflow.currentState, workflowStates.approved);

  const uploaded = await dms.uploadDocument(
    {
      filename: 'governed.txt',
      contentBase64: Buffer.from('Governed DMS document').toString('base64'),
      mimeType: 'text/plain',
      category: 'Documents',
      status: 'draft',
    },
    'dms-editor'
  );

  await dms.transitionDocument(uploaded.document.id, 'submit', 'dms-editor');
  await dms.transitionDocument(uploaded.document.id, 'approve', 'Manager');
  const active = await dms.transitionDocument(uploaded.document.id, 'publish', 'Manager');
  assert.equal(active.status, 'active');
  const dmsWorkflow = await workflowEngine.getWorkflowBySubject('dms_document', uploaded.document.id);
  assert.equal(dmsWorkflow.currentState, workflowStates.exported);
});
