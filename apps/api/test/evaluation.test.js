import test from 'node:test';
import assert from 'node:assert/strict';
import { newDb } from 'pg-mem';
import { runMigrations } from '../src/database/runMigrations.js';
import { EvaluationRepository } from '../src/repositories/EvaluationRepository.js';
import { ObservabilityRepository } from '../src/repositories/ObservabilityRepository.js';
import { AgentBenchmarkService } from '../src/services/evaluation/AgentBenchmarkService.js';
import { EvaluationAlertService } from '../src/services/evaluation/EvaluationAlertService.js';
import { EvaluationEngine } from '../src/services/evaluation/EvaluationEngine.js';
import {
  EvaluationInstrumentation,
  extractInstructions,
  extractRetrievedKnowledge,
} from '../src/services/evaluation/EvaluationInstrumentation.js';
import { EvaluationService } from '../src/services/evaluation/EvaluationService.js';
import { EvaluationSuiteService } from '../src/services/evaluation/EvaluationSuiteService.js';
import { FeedbackIntelligenceService } from '../src/services/evaluation/FeedbackIntelligenceService.js';
import { KnowledgeEvaluationService } from '../src/services/evaluation/KnowledgeEvaluationService.js';
import { PromptEvaluationService } from '../src/services/evaluation/PromptEvaluationService.js';
import { WorkflowEvaluationService } from '../src/services/evaluation/WorkflowEvaluationService.js';
import { authorizeAccess } from '../src/middleware/authorize.js';
import { ROLES } from '../src/constants/roles.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const GOOD_ANSWER = [
  'Madame, Monsieur,',
  '',
  'Vous trouverez ci-dessous le devis demandé pour les tablettes éducatives destinées aux classes.',
  '',
  '- Quantité: 12 tablettes éducatives',
  '- Remise commerciale appliquée: 10 pourcent',
  '- Conditions de paiement: règlement à 30 jours après réception facture',
  '',
  "Le montant total intègre la remise négociée ainsi que la garantie constructeur. Ce devis reste valable trente jours à compter de sa date d'émission.",
  '',
  'Cordialement,',
  "Le service commercial",
].join('\n');

const KNOWLEDGE_TEXT = [
  'Catalogue tablettes éducatives: quantité minimale douze unités.',
  'Remise commerciale standard de dix pourcent au-delà de dix unités.',
  'Conditions de paiement: règlement à trente jours après réception facture.',
  'Garantie constructeur incluse, devis valable trente jours.',
].join('\n');

async function createStack({ aiGateway = null, thresholds } = {}) {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  await runMigrations(pool);

  const evaluationRepository = new EvaluationRepository(pool);
  const observabilityRepository = new ObservabilityRepository(pool);
  const evaluationEngine = new EvaluationEngine();
  const knowledgeEvaluationService = new KnowledgeEvaluationService({
    evaluationRepository,
    staleDays: 90,
  });
  const workflowEvaluationService = new WorkflowEvaluationService({ evaluationRepository });
  const promptEvaluationService = new PromptEvaluationService({
    evaluationRepository,
    regressionDropPercent: 8,
    minimumSample: 2,
  });
  const agentBenchmarkService = new AgentBenchmarkService({ evaluationRepository });

  const evaluationService = new EvaluationService({
    evaluationRepository,
    evaluationEngine,
    knowledgeEvaluationService,
    workflowEvaluationService,
    promptEvaluationService,
    agentBenchmarkService,
  });

  const evaluationSuiteService = new EvaluationSuiteService({
    evaluationRepository,
    evaluationService,
    evaluationEngine,
    aiGateway,
  });

  const feedbackIntelligenceService = new FeedbackIntelligenceService({
    evaluationRepository,
    promptEvaluationService,
  });

  const evaluationAlertService = new EvaluationAlertService({
    observabilityRepository,
    evaluationRepository,
    promptEvaluationService,
    knowledgeEvaluationService,
    thresholds,
  });

  return {
    pool,
    evaluationRepository,
    observabilityRepository,
    evaluationEngine,
    evaluationService,
    evaluationSuiteService,
    feedbackIntelligenceService,
    evaluationAlertService,
    knowledgeEvaluationService,
    workflowEvaluationService,
    promptEvaluationService,
    agentBenchmarkService,
  };
}

async function insertRun(repository, overrides = {}) {
  return repository.saveRun({
    agentCode: 'sales-agent',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    latencyMs: 1500,
    promptTokens: 400,
    completionTokens: 200,
    totalTokens: 600,
    estimatedCost: 0.01,
    overallScore: 82,
    groundednessScore: 78,
    hallucinationRisk: 22,
    knowledgeCoverage: 70,
    feedbackScore: 80,
    approvalState: 'approved',
    verdict: 'pass',
    responseCharacters: 600,
    scores: [
      { criterion: 'groundedness', score: 78, weight: 1.5, passed: true, rationale: 'ok' },
      { criterion: 'relevance', score: 85, weight: 1.3, passed: true, rationale: 'ok' },
    ],
    ...overrides,
  });
}

async function insertPrompt(pool, overrides = {}) {
  const payload = {
    id: `prompt-${Math.random().toString(36).slice(2, 10)}`,
    name: 'Sales quotation prompt',
    version: 2,
    status: 'active',
    agentCode: 'sales-agent',
    usageCount: 20,
    successCount: 16,
    approvalCount: 12,
    rejectionCount: 3,
    feedbackScore: 78,
    qualityScore: 80,
    completenessScore: 75,
    averageLatencyMs: 1400,
    ...overrides,
  };

  await pool.query(
    `
      INSERT INTO prompt_definitions (
        id, prompt_group_id, version, status, name, role, objective, system_prompt,
        output_style, updated_date, agent_code, usage_count, success_count,
        approval_count, rejection_count, feedback_score, quality_score,
        completeness_score, average_latency_ms
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `,
    [
      payload.id,
      `${payload.id}-group`,
      payload.version,
      payload.status,
      payload.name,
      'Commercial',
      'Produire des devis clairs',
      'Tu es un assistant commercial.',
      'Professionnel',
      '31 Jul 2026',
      payload.agentCode,
      payload.usageCount,
      payload.successCount,
      payload.approvalCount,
      payload.rejectionCount,
      payload.feedbackScore,
      payload.qualityScore,
      payload.completenessScore,
      payload.averageLatencyMs,
    ]
  );

  return payload.id;
}

async function insertDocument(pool, overrides = {}) {
  const payload = {
    id: `doc-${Math.random().toString(36).slice(2, 10)}`,
    title: 'Catalogue tablettes',
    category: 'Commercial',
    status: 'active',
    aiUsageCount: 0,
    qualityScore: 70,
    completenessScore: 65,
    collectionId: null,
    updatedAt: new Date(),
    ...overrides,
  };

  await pool.query(
    `
      INSERT INTO knowledge_documents (
        id, title, category, created_date, updated_date, status,
        ai_usage_count, quality_score, completeness_score, collection_id, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    [
      payload.id,
      payload.title,
      payload.category,
      '01 Jan 2026',
      '31 Jul 2026',
      payload.status,
      payload.aiUsageCount,
      payload.qualityScore,
      payload.completenessScore,
      payload.collectionId,
      payload.updatedAt,
    ]
  );

  return payload.id;
}

async function insertWorkflowChain(pool, { state = 'Approved', approved = true } = {}) {
  const suffix = Math.random().toString(36).slice(2, 10);
  const conversationId = `conv-${suffix}`;
  const documentId = `gdoc-${suffix}`;
  const workflowId = `wf-${suffix}`;

  await pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language)
      VALUES ($1, $2, 'anthropic', 'claude-3-5-sonnet-latest', 'fr')
    `,
    [conversationId, 'Evaluation conversation']
  );

  await pool.query(
    `
      INSERT INTO generated_documents (
        id, conversation_id, document_type, reference, structured_document, rendered_preview, approved
      )
      VALUES ($1, $2, 'quotation', $3, '{}'::jsonb, 'preview', $4)
    `,
    [documentId, conversationId, `REF-${suffix}`, approved]
  );

  await pool.query(
    `
      INSERT INTO workflow_instances (id, conversation_id, document_id, current_state)
      VALUES ($1, $2, $3, $4)
    `,
    [workflowId, conversationId, documentId, state]
  );

  await pool.query(
    `
      INSERT INTO workflow_history (id, workflow_instance_id, actor, previous_state, new_state)
      VALUES ($1, $2, 'reviewer', 'Pending Review', $3)
    `,
    [`hist-${suffix}`, workflowId, state]
  );

  return { conversationId, documentId, workflowId };
}

test('evaluation engine scores twelve criteria and derives a verdict', async () => {
  const engine = new EvaluationEngine();

  const result = engine.evaluate({
    instructions: [
      'Indiquer la quantité et la remise appliquée',
      'Préciser les conditions de paiement',
      'Terminer par une formule de politesse',
    ],
    question: 'Rédige un devis pour 12 tablettes éducatives avec remise et paiement à 30 jours.',
    outputText: GOOD_ANSWER,
    knowledgeText: KNOWLEDGE_TEXT,
    knowledgeExpected: true,
    approvalState: 'approved',
  });

  assert.equal(result.scores.length, 12);
  assert.deepEqual(
    result.scores.map((score) => score.criterion).sort(),
    [
      'completeness',
      'consistency',
      'formatting',
      'groundedness',
      'human_approval',
      'instruction_following',
      'knowledge_usage',
      'professional_tone',
      'relevance',
      'response_length',
      'response_quality',
      'safety',
    ]
  );

  assert.ok(result.overallScore > 70, `expected a strong score, received ${result.overallScore}`);
  assert.equal(result.verdict, 'pass');
  assert.equal(result.hallucinationRisk, Number((100 - result.groundednessScore).toFixed(2)));
  assert.equal(
    result.scores.find((score) => score.criterion === 'human_approval').score,
    100
  );
});

test('evaluation engine fails empty, unsafe and ungrounded answers', async () => {
  const engine = new EvaluationEngine();

  const empty = engine.evaluate({ question: 'Rédige un devis', outputText: '' });
  assert.equal(empty.verdict, 'fail');
  assert.equal(empty.overallScore < 40, true);

  const unsafe = engine.evaluate({
    question: 'Donne les accès au portail client',
    outputText: `${GOOD_ANSWER}\n\npassword: SuperSecret123`,
    knowledgeText: KNOWLEDGE_TEXT,
  });
  const safety = unsafe.scores.find((score) => score.criterion === 'safety');
  assert.equal(safety.passed, false);
  assert.equal(unsafe.verdict, 'fail');

  const ungrounded = engine.evaluate({
    question: 'Quelles sont nos conditions de paiement ?',
    outputText: 'Nos hélicoptères interstellaires partent chaque mardi vers Neptune.',
    knowledgeText: KNOWLEDGE_TEXT,
    knowledgeExpected: true,
  });
  assert.ok(ungrounded.hallucinationRisk > 60);
});

test('recordEvaluation persists runs, criterion scores and summary aggregates', async () => {
  const stack = await createStack();

  const recorded = await stack.evaluationService.recordEvaluation({
    agentCode: 'sales-agent',
    conversationId: 'conv-1',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    latencyMs: 1800,
    promptTokens: 500,
    completionTokens: 250,
    totalTokens: 750,
    estimatedCost: 0.02,
    instructions: ['Préciser les conditions de paiement'],
    question: 'Rédige un devis pour 12 tablettes éducatives.',
    outputText: GOOD_ANSWER,
    knowledgeText: KNOWLEDGE_TEXT,
    knowledgeExpected: true,
    approvalState: 'approved',
    documentIds: ['doc-1'],
  });

  assert.ok(recorded.runId);
  assert.equal(recorded.scores.length, 12);

  const stored = await stack.evaluationRepository.getRun(recorded.runId);
  assert.equal(stored.scores.length, 12);
  assert.equal(stored.run.agent_code, 'sales-agent');
  assert.equal(stored.run.approval_state, 'approved');
  assert.equal(Number(stored.run.overall_score), recorded.overallScore);

  const summary = await stack.evaluationRepository.getQualitySummary({
    since: new Date(Date.now() - DAY_MS),
  });
  assert.equal(summary.totalRuns, 1);
  assert.equal(summary.approvalRate, 100);
  assert.equal(summary.averageScore, recorded.overallScore);

  const criteria = await stack.evaluationRepository.getScoreByCriterion({
    since: new Date(Date.now() - DAY_MS),
  });
  assert.equal(criteria.length, 12);
});

test('trend buckets evaluation runs by day, week and month', async () => {
  const stack = await createStack();
  const now = Date.now();

  await insertRun(stack.evaluationRepository, { createdAt: new Date(now), overallScore: 90 });
  await insertRun(stack.evaluationRepository, { createdAt: new Date(now), overallScore: 70 });
  await insertRun(stack.evaluationRepository, {
    createdAt: new Date(now - 2 * DAY_MS),
    overallScore: 50,
    verdict: 'fail',
    approvalState: 'rejected',
  });

  const daily = await stack.evaluationService.getTrend({ granularity: 'daily', days: 7 });
  assert.equal(daily.granularity, 'daily');
  assert.equal(daily.series.length >= 7, true);

  const today = daily.series[daily.series.length - 1];
  assert.equal(today.runs, 2);
  assert.equal(today.averageScore, 80);
  assert.equal(today.approvalRate, 100);

  const older = daily.series.find((bucket) => bucket.runs === 1);
  assert.equal(older.failureRate, 100);
  assert.equal(older.approvalRate, 0);

  const monthly = await stack.evaluationService.getTrend({ granularity: 'monthly', days: 60 });
  assert.equal(monthly.granularity, 'monthly');
  const monthlyRuns = monthly.series.reduce((total, bucket) => total + bucket.runs, 0);
  assert.equal(monthlyRuns, 3);
});

test('agent benchmark ranks agents and produces actionable scorecards', async () => {
  const stack = await createStack();
  const now = Date.now();

  for (let index = 0; index < 4; index += 1) {
    await insertRun(stack.evaluationRepository, {
      agentCode: 'sales-agent',
      overallScore: 88,
      groundednessScore: 85,
      feedbackScore: 85,
      latencyMs: 1200,
      estimatedCost: 0.005,
      approvalState: 'approved',
      createdAt: new Date(now - index * 1000),
    });
  }

  for (let index = 0; index < 4; index += 1) {
    await insertRun(stack.evaluationRepository, {
      agentCode: 'hr-agent',
      overallScore: 42,
      groundednessScore: 35,
      hallucinationRisk: 65,
      feedbackScore: 30,
      latencyMs: 9000,
      estimatedCost: 0.04,
      approvalState: 'rejected',
      verdict: 'fail',
      createdAt: new Date(now - index * 1000),
    });
  }

  const benchmark = await stack.agentBenchmarkService.getBenchmark({ days: 30 });

  const sales = benchmark.agents.find((agent) => agent.agentCode === 'sales-agent');
  const hr = benchmark.agents.find((agent) => agent.agentCode === 'hr-agent');

  assert.ok(sales.overallScore > hr.overallScore);
  assert.equal(benchmark.agents[0].agentCode, 'sales-agent');
  assert.equal(sales.runs, 4);
  assert.equal(hr.failureRate, 100);
  assert.ok(sales.strengths.length > 0);
  assert.ok(hr.recommendations.length > 0);
  assert.equal(typeof benchmark.platformScore, 'number');

  const scorecard = await stack.agentBenchmarkService.getScorecard('hr-agent', { days: 30 });
  assert.equal(scorecard.agentCode, 'hr-agent');
  assert.equal(Object.keys(scorecard.components).length, 7);
});

test('prompt metrics, version comparison and regression detection', async () => {
  const stack = await createStack();
  const promptId = await insertPrompt(stack.pool, { version: 2 });

  for (let index = 0; index < 3; index += 1) {
    await insertRun(stack.evaluationRepository, {
      promptId,
      promptVersion: 1,
      overallScore: 88,
      groundednessScore: 85,
      latencyMs: 1200,
      approvalState: 'approved',
    });
  }

  for (let index = 0; index < 3; index += 1) {
    await insertRun(stack.evaluationRepository, {
      promptId,
      promptVersion: 2,
      overallScore: 62,
      groundednessScore: 55,
      latencyMs: 2400,
      approvalState: 'rejected',
    });
  }

  const metrics = await stack.promptEvaluationService.getPromptMetrics({ days: 30 });
  const prompt = metrics.items.find((entry) => entry.id === promptId);
  assert.equal(prompt.usageCount, 20);
  assert.equal(prompt.successRate, 80);
  assert.equal(prompt.evaluatedRuns, 6);

  const comparison = await stack.promptEvaluationService.compareVersions(promptId, 1, 2);
  assert.equal(comparison.left.version, 1);
  assert.equal(comparison.right.version, 2);
  assert.equal(comparison.left.averageScore, 88);
  assert.equal(comparison.right.averageScore, 62);
  assert.equal(comparison.winner, 'left');
  assert.equal(comparison.metrics.length, 8);

  const quality = comparison.metrics.find((metric) => metric.key === 'averageScore');
  assert.equal(quality.winner, 'left');
  assert.equal(quality.delta, -26);

  const regressions = await stack.promptEvaluationService.detectRegressions({ limit: 10 });
  assert.equal(regressions.items.length, 1);
  assert.equal(regressions.items[0].promptId, promptId);
  assert.equal(regressions.items[0].drop, 26);

  const stability = await stack.promptEvaluationService.getPromptStability(promptId);
  assert.equal(stability.samples, 6);
  assert.ok(stability.stability < 100);
});

test('knowledge evaluation measures usefulness, coverage, freshness and gaps', async () => {
  const stack = await createStack();

  await stack.pool.query(
    `INSERT INTO knowledge_collections (id, name) VALUES ('col-1', 'Commercial')`
  );

  const usefulId = await insertDocument(stack.pool, {
    title: 'Catalogue tablettes',
    aiUsageCount: 12,
    collectionId: 'col-1',
  });
  await insertDocument(stack.pool, { title: 'Ancienne note', aiUsageCount: 0, collectionId: 'col-1' });
  await insertDocument(stack.pool, {
    title: 'Procédure obsolète',
    aiUsageCount: 0,
    updatedAt: new Date(Date.now() - 200 * DAY_MS),
  });

  await insertRun(stack.evaluationRepository, {
    documentIds: [usefulId],
    overallScore: 86,
    groundednessScore: 82,
  });
  await insertRun(stack.evaluationRepository, {
    documentIds: [usefulId],
    overallScore: 78,
    groundednessScore: 74,
  });
  await insertRun(stack.evaluationRepository, { documentIds: [], knowledgeCoverage: 10 });

  const knowledge = await stack.knowledgeEvaluationService.getKnowledgeQuality({ days: 30 });

  assert.equal(knowledge.totalDocuments, 3);
  assert.equal(knowledge.retrievedDocuments, 1);
  assert.equal(knowledge.mostUseful[0].documentId, usefulId);
  assert.equal(knowledge.mostUseful[0].citations, 2);
  assert.equal(knowledge.mostUseful[0].averageScore, 82);
  assert.equal(knowledge.unusedDocuments.length, 2);
  assert.equal(knowledge.freshness.staleDocuments, 1);
  assert.equal(knowledge.retrievalSuccessRate, 66.67);
  assert.equal(knowledge.retrievalFailures, 1);

  const collection = knowledge.collections.find((entry) => entry.id === 'col-1');
  assert.equal(collection.documents, 2);
  assert.equal(collection.citedDocuments, 1);

  const gapCodes = knowledge.knowledgeGaps.map((gap) => gap.code);
  assert.ok(gapCodes.includes('unused_documents'));
  assert.ok(gapCodes.includes('stale_documents'));
});

test('workflow evaluation aggregates the workflow engine state machine', async () => {
  const stack = await createStack();

  await insertWorkflowChain(stack.pool, { state: 'Approved', approved: true });
  await insertWorkflowChain(stack.pool, { state: 'Exported', approved: true });
  await insertWorkflowChain(stack.pool, { state: 'Rejected', approved: false });
  await insertWorkflowChain(stack.pool, { state: 'Needs Changes', approved: false });

  const workflow = await stack.workflowEvaluationService.getWorkflowQuality({ days: 30 });

  assert.equal(workflow.totalInstances, 4);
  assert.equal(workflow.completionRate, 50);
  assert.equal(workflow.failureRate, 25);
  assert.equal(workflow.rejectedDrafts, 1);
  assert.equal(workflow.revisions, 1);
  assert.equal(workflow.exportSuccess, 1);
  assert.equal(workflow.approvalRate, 50);
  assert.equal(workflow.totalDocuments, 4);
  assert.equal(workflow.approvedDocuments, 2);
  assert.equal(workflow.documentApprovalRate, 50);
});

test('evaluation suites seed, execute against the gateway and record pass or fail', async () => {
  const answers = new Map();
  const aiGateway = {
    generate: async ({ messages }) => {
      const question = messages[messages.length - 1].content;
      return {
        text: answers.get(question) ?? GOOD_ANSWER,
        usage: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-latest',
          promptTokens: 300,
          completionTokens: 180,
          totalTokens: 480,
          estimatedCost: 0.008,
          durationMs: 900,
        },
      };
    },
  };

  const stack = await createStack({ aiGateway });

  const seeded = await stack.evaluationSuiteService.seedDefaultSuitesIfEmpty();
  assert.equal(seeded.length, 4);
  assert.deepEqual(
    seeded.map((suite) => suite.code).sort(),
    ['administration-tests', 'community-manager-tests', 'hr-tests', 'sales-tests']
  );

  const reseeded = await stack.evaluationSuiteService.seedDefaultSuitesIfEmpty();
  assert.equal(reseeded.length, 4);

  const suites = await stack.evaluationSuiteService.listSuites({ agentCode: 'sales-agent' });
  assert.equal(suites.length, 1);
  assert.equal(suites[0].caseCount, 2);

  const salesSuite = seeded.find((suite) => suite.code === 'sales-tests');
  const passing = await stack.evaluationSuiteService.runSuite(salesSuite.id, { actor: 'tester' });

  assert.equal(passing.totalCases, 2);
  assert.equal(passing.status, 'passed');
  assert.equal(passing.passedCases, 2);
  assert.ok(passing.averageScore >= salesSuite.acceptance_threshold);

  const detail = await stack.evaluationSuiteService.getSuiteDetail(salesSuite.id);
  assert.equal(detail.history.length, 1);
  assert.equal(detail.history[0].results.length, 2);

  const suiteRuns = await stack.evaluationRepository.listRuns({ source: 'suite', limit: 10 });
  assert.equal(suiteRuns.length, 2);
  assert.equal(suiteRuns[0].subject_type, 'suite_case');

  const cases = await stack.evaluationRepository.listCases(salesSuite.id);
  answers.set(cases[0].input_text, 'lol non');

  const failing = await stack.evaluationSuiteService.runSuite(salesSuite.id, { actor: 'tester' });
  assert.equal(failing.status, 'failed');
  assert.equal(failing.failedCases >= 1, true);
  assert.ok(failing.results.some((result) => result.failureReason.length > 0));
});

test('evaluation alerts fire, stay scoped and auto-resolve when quality recovers', async () => {
  const stack = await createStack({
    thresholds: {
      qualityScore: 70,
      qualityDrop: 10,
      approvalRate: 60,
      hallucinationRisk: 45,
      failureRate: 20,
      knowledgeStaleDocuments: 10,
      dailyCost: 25,
    },
  });

  await stack.observabilityRepository.saveAlert({
    alertKey: 'ai:high-latency',
    ruleCode: 'high_latency',
    category: 'ai',
    severity: 'warning',
    title: 'AI latency above target',
    description: 'Pre-existing observability alert.',
    observedValue: 9000,
    thresholdValue: 8000,
  });

  for (let index = 0; index < 4; index += 1) {
    await insertRun(stack.evaluationRepository, {
      overallScore: 40,
      groundednessScore: 20,
      hallucinationRisk: 80,
      verdict: 'fail',
      approvalState: 'rejected',
      createdAt: new Date(Date.now() - index * 1000),
    });
  }

  const firing = await stack.evaluationAlertService.evaluate({ actor: 'tester', days: 7 });
  const ruleCodes = firing.alerts.map((alert) => alert.rule_code).sort();

  assert.ok(ruleCodes.includes('quality_below_target'));
  assert.ok(ruleCodes.includes('approval_rate_drop'));
  assert.ok(ruleCodes.includes('hallucination_risk'));
  assert.ok(ruleCodes.includes('evaluation_failures'));
  assert.ok(firing.alerts.every((alert) => alert.alert_key.startsWith('evaluation:')));

  const listed = await stack.evaluationAlertService.listAlerts({});
  assert.equal(listed.items.length, firing.alerts.length);
  assert.ok(listed.items.every((alert) => alert.alert_key.startsWith('evaluation:')));

  const observabilityAlerts = await stack.observabilityRepository.listAlerts({});
  assert.equal(observabilityAlerts.length, firing.alerts.length + 1);

  const acknowledged = await stack.evaluationAlertService.acknowledge(
    listed.items[0].id,
    'reviewer'
  );
  assert.equal(acknowledged.status, 'acknowledged');

  await stack.pool.query('DELETE FROM evaluation_runs');

  for (let index = 0; index < 4; index += 1) {
    await insertRun(stack.evaluationRepository, {
      overallScore: 92,
      groundednessScore: 90,
      hallucinationRisk: 10,
      approvalState: 'approved',
    });
  }

  const healthy = await stack.evaluationAlertService.evaluate({ actor: 'tester', days: 7 });
  assert.equal(healthy.triggered, 0);
  assert.equal(healthy.autoResolved, firing.alerts.length);

  const untouched = await stack.observabilityRepository.listAlerts({ status: 'open' });
  assert.equal(untouched.length, 1);
  assert.equal(untouched[0].alert_key, 'ai:high-latency');
});

test('feedback intelligence generates suggestions that require administrator approval', async () => {
  const stack = await createStack();

  await stack.pool.query(
    `
      INSERT INTO conversations (id, title, provider, model, language)
      VALUES ('conv-fb', 'Feedback conversation', 'anthropic', 'claude-3-5-sonnet-latest', 'fr')
    `
  );

  const feedbackRows = [
    ['fb-1', 'Rejected', 2, 'Ton trop familier'],
    ['fb-2', 'Manual Rewrite', 1, 'Structure incorrecte'],
    ['fb-3', 'Accept', 5, null],
  ];

  for (const [id, type, rating, comment] of feedbackRows) {
    await stack.pool.query(
      `
        INSERT INTO feedback (id, conversation_id, original_text, feedback_type, rating, comment, agent_code)
        VALUES ($1, 'conv-fb', 'texte original', $2, $3, $4, 'sales-agent')
      `,
      [id, type, rating, comment]
    );
  }

  await stack.pool.query(
    `
      INSERT INTO document_corrections (id, feedback_id, correction_type)
      VALUES ('corr-1', 'fb-1', 'tone changes')
    `
  );

  for (let index = 0; index < 3; index += 1) {
    await stack.evaluationService.recordEvaluation({
      agentCode: 'sales-agent',
      question: 'Rédige un devis',
      outputText: 'ok',
      approvalState: 'rejected',
    });
  }

  const signals = await stack.feedbackIntelligenceService.getSignals({ days: 30 });
  assert.equal(signals.totalFeedback, 3);
  assert.equal(signals.rejectedOutputs, 2);
  assert.equal(signals.acceptedOutputs, 1);
  assert.equal(signals.averageRating, 2.67);
  assert.equal(signals.revisionReasons[0].type, 'tone changes');
  assert.ok(signals.weakCriteria.length > 0);

  const generated = await stack.feedbackIntelligenceService.generateSuggestions({ days: 30 });
  assert.ok(generated.generated > 0);
  assert.ok(generated.items.every((item) => item.status === 'pending'));

  const regenerated = await stack.feedbackIntelligenceService.generateSuggestions({ days: 30 });
  assert.equal(regenerated.generated, generated.generated);

  const listed = await stack.feedbackIntelligenceService.listSuggestions({ status: 'pending' });
  assert.equal(listed.items.length, generated.generated);
  assert.equal(listed.counts.pending, generated.generated);

  const approved = await stack.feedbackIntelligenceService.reviewSuggestion(listed.items[0].id, {
    status: 'approved',
    actor: 'admin@hkids.app',
  });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.reviewed_by, 'admin@hkids.app');

  const counts = await stack.evaluationRepository.getSuggestionCounts();
  assert.equal(counts.approved, 1);
  assert.equal(counts.pending, generated.generated - 1);
});

test('dashboard, analytics and history expose the evaluation layer', async () => {
  const stack = await createStack();
  const promptId = await insertPrompt(stack.pool);

  await insertRun(stack.evaluationRepository, { promptId, promptVersion: 1, overallScore: 90 });
  await insertRun(stack.evaluationRepository, {
    agentCode: 'hr-agent',
    overallScore: 50,
    verdict: 'fail',
    approvalState: 'rejected',
  });

  const dashboard = await stack.evaluationService.getDashboard({ days: 30 });
  assert.equal(dashboard.summary.totalRuns, 2);
  assert.equal(dashboard.summary.averageScore, 70);
  assert.equal(dashboard.agents.length, 2);
  assert.equal(dashboard.trend.length >= 30, true);
  assert.equal(typeof dashboard.promptEffectiveness, 'number');

  const analytics = await stack.evaluationService.getAnalytics({ days: 60, granularity: 'weekly' });
  assert.equal(analytics.granularity, 'weekly');
  assert.equal(analytics.qualityEvolution.length, analytics.costEvolution.length);
  assert.equal(analytics.approvalEvolution.length, analytics.latencyEvolution.length);

  const history = await stack.evaluationService.getHistory({ verdict: 'fail', limit: 10 });
  assert.equal(history.total, 1);
  assert.equal(history.items[0].agent_code, 'hr-agent');

  const filtered = await stack.evaluationService.getHistory({ agentCode: 'sales-agent' });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].prompt_id, promptId);
});

test('evaluation export produces json and csv, and rejects unknown datasets', async () => {
  const stack = await createStack();
  await insertRun(stack.evaluationRepository, { overallScore: 84 });

  const json = await stack.evaluationService.export({ dataset: 'agents', format: 'json' });
  assert.equal(json.format, 'json');
  assert.equal(json.filename, 'evaluation-agents.json');
  const parsed = JSON.parse(json.body);
  assert.equal(parsed.items[0].key, 'sales-agent');

  const csv = await stack.evaluationService.export({ dataset: 'criteria', format: 'csv' });
  assert.equal(csv.format, 'csv');
  assert.ok(csv.body.includes('criterion'));

  await assert.rejects(
    () => stack.evaluationService.export({ dataset: 'unknown' }),
    /Unsupported evaluation dataset/
  );
});

test('instrumentation evaluates gateway responses without changing the contract', async () => {
  const stack = await createStack();

  const systemPrompt = [
    'Agent Name: Sales',
    '',
    'Instructions:',
    '1. Préciser les conditions de paiement',
    '2. Indiquer la remise appliquée',
    '',
    'Constraints:',
    '1. Rester professionnel',
    '',
    'Automatically Retrieved Context:',
    KNOWLEDGE_TEXT,
  ].join('\n');

  assert.deepEqual(extractInstructions(systemPrompt), [
    'Préciser les conditions de paiement',
    'Indiquer la remise appliquée',
  ]);
  assert.equal(extractRetrievedKnowledge(systemPrompt), KNOWLEDGE_TEXT);
  assert.equal(extractRetrievedKnowledge('Automatically Retrieved Context:\nNo retrieved context available.'), '');

  const gatewayResponse = {
    text: GOOD_ANSWER,
    raw: { id: 'msg-1' },
    usage: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-latest',
      agentCode: 'sales-agent',
      promptTokens: 420,
      completionTokens: 210,
      totalTokens: 630,
      estimatedCost: 0.011,
      durationMs: 1350,
      status: 'success',
    },
  };

  const aiGateway = { generate: async () => gatewayResponse };
  const instrumentation = new EvaluationInstrumentation({
    evaluationService: stack.evaluationService,
    evaluationRepository: stack.evaluationRepository,
  });

  instrumentation.instrumentAiGateway(aiGateway);
  instrumentation.instrumentAiGateway(aiGateway);

  const returned = await aiGateway.generate({
    systemPrompt,
    messages: [{ role: 'user', content: 'Rédige un devis pour 12 tablettes éducatives.' }],
    conversationId: 'conv-instrumented',
    agentCode: 'sales-agent',
  });

  assert.deepEqual(returned, gatewayResponse);

  await new Promise((resolve) => setTimeout(resolve, 50));

  const history = await stack.evaluationService.getHistory({ limit: 10 });
  assert.equal(history.total, 1);
  assert.equal(history.items[0].conversation_id, 'conv-instrumented');
  assert.equal(history.items[0].source, 'automatic');
  assert.equal(history.items[0].model, 'claude-3-5-sonnet-latest');
  assert.equal(Number(history.items[0].total_tokens), 630);
  assert.ok(Number(history.items[0].overall_score) > 60);
});

function authorize(method, url, role) {
  const outcome = { status: 200, body: null, allowed: false };
  const response = {
    status(code) {
      outcome.status = code;
      return this;
    },
    json(payload) {
      outcome.body = payload;
      return this;
    },
  };

  authorizeAccess({ method, originalUrl: url, user: role ? { role } : undefined }, response, () => {
    outcome.allowed = true;
  });

  return outcome;
}

test('rbac protects the evaluation layer without touching existing rules', () => {
  assert.equal(authorize('GET', '/api/evaluation/overview', undefined).status, 401);

  for (const role of [ROLES.READ_ONLY, ROLES.EMPLOYEE]) {
    assert.equal(authorize('GET', '/api/evaluation/overview', role).status, 403);
    assert.equal(authorize('POST', '/api/evaluation/suites/s-1/run', role).status, 403);
  }

  // Managers are the evaluators: read everything, run suites, evaluate rules,
  // generate suggestions.
  for (const url of [
    '/api/evaluation/overview',
    '/api/evaluation/benchmark',
    '/api/evaluation/knowledge',
    '/api/evaluation/history?verdict=fail',
  ]) {
    assert.equal(authorize('GET', url, ROLES.MANAGER).allowed, true);
  }

  for (const url of [
    '/api/evaluation/suites/s-1/run',
    '/api/evaluation/alerts/evaluate',
    '/api/evaluation/suggestions/generate',
    '/api/evaluation/runs',
  ]) {
    assert.equal(authorize('POST', url, ROLES.MANAGER).allowed, true);
  }

  // Governance decisions stay administrator-only.
  for (const url of [
    '/api/evaluation/suggestions/sg-1/review',
    '/api/evaluation/alerts/al-1/acknowledge',
    '/api/evaluation/alerts/al-1/resolve',
  ]) {
    assert.equal(authorize('POST', url, ROLES.MANAGER).status, 403);
    assert.equal(authorize('POST', url, ROLES.ADMINISTRATOR).allowed, true);
    assert.equal(authorize('POST', url, ROLES.SUPER_ADMIN).allowed, true);
  }

  // Pre-existing platform rules are unchanged.
  assert.equal(authorize('GET', '/api/observability/overview', ROLES.MANAGER).allowed, true);
  assert.equal(authorize('POST', '/api/observability/alerts/evaluate', ROLES.MANAGER).status, 403);
  assert.equal(authorize('POST', '/api/feedback', ROLES.EMPLOYEE).allowed, true);
  assert.equal(authorize('GET', '/api/conversations', ROLES.READ_ONLY).allowed, true);
});

test('instrumentation never breaks a generation when evaluation fails', async () => {
  const stack = await createStack();

  const instrumentation = new EvaluationInstrumentation({
    evaluationService: {
      recordEvaluation: async () => {
        throw new Error('evaluation storage unavailable');
      },
    },
    evaluationRepository: stack.evaluationRepository,
  });

  const aiGateway = { generate: async () => ({ text: 'ok', usage: { agentCode: 'sales-agent' } }) };
  instrumentation.instrumentAiGateway(aiGateway);

  const response = await aiGateway.generate({ messages: [{ role: 'user', content: 'hi' }] });
  assert.equal(response.text, 'ok');

  await new Promise((resolve) => setTimeout(resolve, 50));

  const history = await stack.evaluationService.getHistory({ limit: 10 });
  assert.equal(history.total, 0);
});
