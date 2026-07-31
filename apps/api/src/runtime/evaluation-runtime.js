import { env } from '../config/env.js';
import { EvaluationRepository } from '../repositories/EvaluationRepository.js';
import { ObservabilityRepository } from '../repositories/ObservabilityRepository.js';
import { AgentBenchmarkService } from '../services/evaluation/AgentBenchmarkService.js';
import { EvaluationAlertService } from '../services/evaluation/EvaluationAlertService.js';
import { EvaluationEngine } from '../services/evaluation/EvaluationEngine.js';
import { EvaluationInstrumentation } from '../services/evaluation/EvaluationInstrumentation.js';
import { EvaluationService } from '../services/evaluation/EvaluationService.js';
import { EvaluationSuiteService } from '../services/evaluation/EvaluationSuiteService.js';
import { FeedbackIntelligenceService } from '../services/evaluation/FeedbackIntelligenceService.js';
import { KnowledgeEvaluationService } from '../services/evaluation/KnowledgeEvaluationService.js';
import { PromptEvaluationService } from '../services/evaluation/PromptEvaluationService.js';
import { WorkflowEvaluationService } from '../services/evaluation/WorkflowEvaluationService.js';
import { aiGateway, persistenceService } from './assistant-runtime.js';
import { observabilityService } from './observability-runtime.js';
import { securityDashboardService } from './security-runtime.js';
import { logger } from '../utils/logger.js';

const evaluationRepository = new EvaluationRepository(persistenceService.pool);
const observabilityRepository = new ObservabilityRepository(persistenceService.pool);

export const evaluationEngine = new EvaluationEngine();

export const knowledgeEvaluationService = new KnowledgeEvaluationService({
  evaluationRepository,
  staleDays: env.evaluationStaleKnowledgeDays,
});

export const workflowEvaluationService = new WorkflowEvaluationService({ evaluationRepository });

export const promptEvaluationService = new PromptEvaluationService({
  evaluationRepository,
  regressionDropPercent: env.evaluationRegressionDropPercent,
});

export const agentBenchmarkService = new AgentBenchmarkService({ evaluationRepository });

export const evaluationService = new EvaluationService({
  evaluationRepository,
  evaluationEngine,
  knowledgeEvaluationService,
  workflowEvaluationService,
  promptEvaluationService,
  agentBenchmarkService,
  observabilityService,
  securityDashboardService,
});

export const evaluationSuiteService = new EvaluationSuiteService({
  evaluationRepository,
  evaluationService,
  evaluationEngine,
  aiGateway,
});

export const feedbackIntelligenceService = new FeedbackIntelligenceService({
  evaluationRepository,
  promptEvaluationService,
});

export const evaluationAlertService = new EvaluationAlertService({
  observabilityRepository,
  evaluationRepository,
  promptEvaluationService,
  knowledgeEvaluationService,
});

const evaluationInstrumentation = new EvaluationInstrumentation({
  evaluationService,
  evaluationRepository,
  enabled: env.evaluationEnabled,
});

evaluationInstrumentation.instrumentAiGateway(aiGateway);

export async function initializeEvaluationRuntime() {
  try {
    await evaluationSuiteService.seedDefaultSuitesIfEmpty();
  } catch (error) {
    logger.warn('evaluation_runtime_start_failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
