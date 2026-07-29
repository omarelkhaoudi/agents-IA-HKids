import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { HrAgentRepository } from '../src/repositories/HrAgentRepository.js';
import { HrAgentService } from '../src/services/hr-agent/HrAgentService.js';

async function createStack() {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);
  const repository = new HrAgentRepository(pool);

  const service = new HrAgentService({
    repository,
    aiGateway: {
      generate: async () => ({
        text: JSON.stringify({
          title: 'Plan onboarding H-Kids',
          body: 'Checklist onboarding préparée pour validation manager.',
          reasoning: 'Basé sur les procédures internes.',
          knowledgeCitations: ['Handbook RH'],
          checklist: ['Compte', 'Formation', 'Matériel'],
          recommendations: ['Valider avec le manager'],
          risks: ['Aucune action automatique'],
          mission: 'Accompagner les familles',
          responsibilities: ['Coordination'],
          dailyTasks: ['Suivi'],
          requiredSkills: ['Communication'],
          preferredSkills: ['Pédagogie'],
          experience: '2 ans',
          education: 'Bac+3',
          softSkills: ['Empathie'],
          languages: ['FR', 'AR'],
          benefits: ['Mutuelle'],
          recommendation: 'Recommandation IA uniquement — décision manager requise.',
        }),
        usage: { id: 'usage-hr', model: 'claude-3-5-sonnet-latest' },
      }),
    },
    retrievalService: {
      retrieveRelevantContext: () => ({
        contextText: 'Procédures RH H-Kids et handbook interne.',
        rankedChunks: [{ id: 'chunk-hr-1' }],
      }),
    },
    listDocuments: () => [
      {
        id: 'doc-hr',
        title: 'Handbook RH',
        category: 'HR',
        tags: ['hr', 'policy'],
      },
    ],
    listPrompts: () => [
      {
        id: 'prompt-hr-onboarding-001',
        promptGroupId: 'hr-onboarding',
        name: 'HR Onboarding Plan',
        objective: 'Prepare onboarding plans',
      },
      {
        id: 'prompt-hr-job-description-001',
        promptGroupId: 'hr-job-description',
        name: 'HR Job Description',
        objective: 'Prepare job descriptions',
      },
    ],
  });

  await service.initialize();
  return { repository, service };
}

test('HR Agent initializes demo employees', async () => {
  const { repository } = await createStack();
  const employees = await repository.listEmployees();
  assert.ok(employees.length >= 2);
});

test('HR Agent generates draft without hiring or contacting', async () => {
  const { service } = await createStack();
  const result = await service.generateDocument({
    instruction: 'Prepare onboarding plan',
    documentType: 'onboarding_plan',
  });

  assert.equal(result.document.approvalStatus, 'draft');
  assert.equal(result.document.documentType, 'onboarding_plan');
  assert.equal(result.document.metadata?.governance?.neverHire, true);
  assert.equal(result.document.metadata?.governance?.neverSendEmail, true);
  assert.equal(result.document.metadata?.retrievalChunks, 1);
});

test('HR Agent enforces approval before export and leave manager decision', async () => {
  const { service } = await createStack();
  const { document } = await service.generateDocument({
    instruction: 'Warning letter draft',
    documentType: 'warning_letter',
  });

  await assert.rejects(() => service.exportDocument(document.id, 'markdown'), /approved/i);

  await service.submitDocumentReview(document.id);
  const approved = await service.approveDocument(document.id, 'tester');
  assert.equal(approved.approvalStatus, 'approved');

  const exported = await service.exportDocument(document.id, 'markdown');
  assert.match(exported.contentType, /markdown/);
  assert.match(exported.body, /human validation/i);

  const { leave } = await service.recommendLeave({
    employeeName: 'Sara Benali',
    leaveType: 'annual',
    days: 2,
    reason: 'Congé',
  });
  assert.equal(leave.status, 'pending');
  const decided = await service.decideLeave(leave.id, 'approved', 'manager');
  assert.equal(decided.status, 'approved');
});

test('HR Agent job description, dashboard and search work', async () => {
  const { repository, service } = await createStack();
  const { job } = await service.generateJobDescription({
    title: 'Coordinateur',
    department: 'Pédagogie',
  });
  assert.equal(job.approvalStatus, 'draft');

  const stats = await repository.getDashboardStats();
  assert.equal(stats.employees >= 2, true);
  assert.equal(stats.generatedDocuments >= 0, true);

  await repository.createCandidate({
    fullName: 'Candidat Pipeline',
    positionApplied: 'Animateur',
    stage: 'interview',
  });
  const results = await repository.searchAll('pipeline');
  assert.ok(results.some((item) => item.type === 'candidate'));
});
