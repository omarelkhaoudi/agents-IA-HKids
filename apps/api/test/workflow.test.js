import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { ApprovalService } from '../src/services/workflows/ApprovalService.js';
import { NotificationService } from '../src/services/workflows/NotificationService.js';
import { WorkflowEngine } from '../src/services/workflows/WorkflowEngine.js';
import { WorkflowHistory } from '../src/services/workflows/WorkflowHistory.js';
import { WorkflowRepository } from '../src/services/workflows/WorkflowRepository.js';
import { WorkflowRules, workflowStates } from '../src/services/workflows/WorkflowRules.js';

async function createWorkflowEngine() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  await pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language, current_context, metadata)
      VALUES ('session-001', 'Workflow Session', 'anthropic', 'claude-3-5-sonnet-latest', 'English', '{}'::jsonb, '{}'::jsonb)
    `
  );
  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, resolved_variables,
        rendered_preview, validation_warnings, available_export_formats, approved, status, version,
        created_by, input, metadata
      )
      VALUES (
        'generated-001', 'session-001', 'quotation', 'QT-001', '{"title":"Quotation","reference":"QT-001"}'::jsonb,
        '{}'::jsonb, '<html></html>', '[]'::jsonb, '["pdf","docx"]'::jsonb, false, 'draft', 1, 'system',
        '{}'::jsonb, '{}'::jsonb
      )
    `
  );

  const repository = new WorkflowRepository(pool);
  const engine = new WorkflowEngine({
    workflowRepository: repository,
    workflowRules: new WorkflowRules(),
    workflowHistory: new WorkflowHistory(repository),
    approvalService: new ApprovalService(),
    notificationService: new NotificationService(),
  });

  await engine.initialize();

  return engine;
}

test('WorkflowEngine logs transitions and enforces approval before export', async () => {
  const engine = await createWorkflowEngine();

  const created = await engine.createWorkflow({
    conversationId: 'session-001',
    documentId: 'generated-001',
  });

  assert.equal(created.currentState, workflowStates.draft);
  assert.equal(created.history.length, 1);

  await engine.transition({
    documentId: 'generated-001',
    actor: 'Administrator',
    nextState: workflowStates.pendingReview,
    comment: 'Ready for review.',
  });

  await engine.transition({
    documentId: 'generated-001',
    actor: 'Administrator',
    nextState: workflowStates.approved,
    comment: 'Looks good.',
  });

  const approved = await engine.getWorkflowByDocumentId('generated-001');
  assert.equal(approved?.currentState, workflowStates.approved);
  assert.equal(approved?.history.length, 3);
  assert.equal(approved?.comments.length, 2);
});

test('WorkflowEngine prevents archiving before export', async () => {
  const engine = await createWorkflowEngine();

  await engine.createWorkflow({
    conversationId: 'session-001',
    documentId: 'generated-001',
  });

  await assert.rejects(
    engine.transition({
      documentId: 'generated-001',
      actor: 'Administrator',
      nextState: workflowStates.archived,
      comment: 'Too early.',
    }),
    /Transition|Archive/
  );
});
