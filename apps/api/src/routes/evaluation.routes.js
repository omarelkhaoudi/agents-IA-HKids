import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  agentBenchmarkService,
  evaluationAlertService,
  evaluationService,
  evaluationSuiteService,
  feedbackIntelligenceService,
  knowledgeEvaluationService,
  promptEvaluationService,
  workflowEvaluationService,
} from '../runtime/evaluation-runtime.js';
import {
  evaluationActionBodySchema,
  evaluationAlertsQuerySchema,
  evaluationAnalyticsQuerySchema,
  evaluationComparisonQuerySchema,
  evaluationExportQuerySchema,
  evaluationHistoryQuerySchema,
  evaluationPromptsQuerySchema,
  evaluationRunBodySchema,
  evaluationSuggestionActionBodySchema,
  evaluationSuggestionsQuerySchema,
  evaluationSuitesQuerySchema,
  evaluationTrendQuerySchema,
  evaluationWindowQuerySchema,
  idParamsSchema,
} from '../validation/schemas.js';

const evaluationRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

function actorFrom(request, bodyActor) {
  return bodyActor || request.user?.email || request.user?.name || request.user?.id || '';
}

evaluationRouter.get(
  '/evaluation/overview',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await evaluationService.getOverview({ days: request.query.days }));
  }
);

evaluationRouter.get(
  '/evaluation/dashboard',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await evaluationService.getDashboard({ days: request.query.days }));
  }
);

evaluationRouter.get(
  '/evaluation/trend',
  validate({ query: evaluationTrendQuerySchema }),
  async (request, response) => {
    response.json(
      await evaluationService.getTrend({
        granularity: request.query.granularity,
        days: request.query.days,
      })
    );
  }
);

evaluationRouter.get(
  '/evaluation/analytics',
  validate({ query: evaluationAnalyticsQuerySchema }),
  async (request, response) => {
    response.json(
      await evaluationService.getAnalytics({
        granularity: request.query.granularity,
        days: request.query.days,
      })
    );
  }
);

evaluationRouter.get(
  '/evaluation/history',
  validate({ query: evaluationHistoryQuerySchema }),
  async (request, response) => {
    const { days, ...filters } = request.query;

    response.json(
      await evaluationService.getHistory({
        ...filters,
        since: days ? new Date(Date.now() - days * DAY_MS) : undefined,
      })
    );
  }
);

evaluationRouter.get(
  '/evaluation/history/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const run = await evaluationService.getRun(request.params.id);

    if (!run) {
      response.status(404).json({ message: 'Evaluation run not found' });
      return;
    }

    response.json(run);
  }
);

evaluationRouter.get(
  '/evaluation/benchmark',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await agentBenchmarkService.getBenchmark({ days: request.query.days }));
  }
);

evaluationRouter.get(
  '/evaluation/scorecards/:id',
  validate({ params: idParamsSchema, query: evaluationWindowQuerySchema }),
  async (request, response) => {
    const scorecard = await agentBenchmarkService.getScorecard(request.params.id, {
      days: request.query.days,
    });

    if (!scorecard) {
      response.status(404).json({ message: 'Agent scorecard not found' });
      return;
    }

    response.json(scorecard);
  }
);

evaluationRouter.get(
  '/evaluation/prompts',
  validate({ query: evaluationPromptsQuerySchema }),
  async (request, response) => {
    response.json(
      await promptEvaluationService.getPromptMetrics({
        days: request.query.days,
        limit: request.query.limit,
      })
    );
  }
);

evaluationRouter.get(
  '/evaluation/prompts/:id/comparison',
  validate({ params: idParamsSchema, query: evaluationComparisonQuerySchema }),
  async (request, response) => {
    const comparison = await promptEvaluationService.compareVersions(
      request.params.id,
      request.query.left,
      request.query.right
    );

    if (!comparison) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }

    response.json(comparison);
  }
);

evaluationRouter.get(
  '/evaluation/prompts/:id/stability',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json(await promptEvaluationService.getPromptStability(request.params.id));
  }
);

evaluationRouter.get('/evaluation/regressions', async (_request, response) => {
  response.json(await promptEvaluationService.detectRegressions({}));
});

evaluationRouter.get(
  '/evaluation/knowledge',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await knowledgeEvaluationService.getKnowledgeQuality({ days: request.query.days }));
  }
);

evaluationRouter.get(
  '/evaluation/workflows',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await workflowEvaluationService.getWorkflowQuality({ days: request.query.days }));
  }
);

evaluationRouter.get('/evaluation/security', async (_request, response) => {
  response.json(await evaluationService.getSecurityEvaluation());
});

evaluationRouter.get(
  '/evaluation/suites',
  validate({ query: evaluationSuitesQuerySchema }),
  async (request, response) => {
    response.json({
      items: await evaluationSuiteService.listSuites({
        agentCode: request.query.agentCode,
        status: request.query.status,
      }),
    });
  }
);

evaluationRouter.get(
  '/evaluation/suites/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const suite = await evaluationSuiteService.getSuiteDetail(request.params.id);

    if (!suite) {
      response.status(404).json({ message: 'Evaluation suite not found' });
      return;
    }

    response.json(suite);
  }
);

evaluationRouter.post(
  '/evaluation/suites/:id/run',
  validate({ params: idParamsSchema, body: evaluationActionBodySchema }),
  async (request, response) => {
    try {
      const result = await evaluationSuiteService.runSuite(request.params.id, {
        actor: actorFrom(request, request.body.actor),
      });

      if (!result) {
        response.status(404).json({ message: 'Evaluation suite not found' });
        return;
      }

      response.json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to run the evaluation suite.',
      });
    }
  }
);

evaluationRouter.post(
  '/evaluation/runs',
  validate({ body: evaluationRunBodySchema }),
  async (request, response) => {
    const result = await evaluationService.recordEvaluation({
      ...request.body,
      source: 'manual',
      reviewer: actorFrom(request),
    });

    response.status(201).json(result);
  }
);

evaluationRouter.get(
  '/evaluation/alerts',
  validate({ query: evaluationAlertsQuerySchema }),
  async (request, response) => {
    response.json(
      await evaluationAlertService.listAlerts({
        status: request.query.status,
        severity: request.query.severity,
        limit: request.query.limit,
      })
    );
  }
);

evaluationRouter.post(
  '/evaluation/alerts/evaluate',
  validate({ body: evaluationActionBodySchema }),
  async (request, response) => {
    response.json(
      await evaluationAlertService.evaluate({
        actor: actorFrom(request, request.body.actor),
        days: request.body.days || 7,
      })
    );
  }
);

evaluationRouter.post(
  '/evaluation/alerts/:id/acknowledge',
  validate({ params: idParamsSchema, body: evaluationActionBodySchema }),
  async (request, response) => {
    const alert = await evaluationAlertService.acknowledge(
      request.params.id,
      actorFrom(request, request.body.actor)
    );

    if (!alert) {
      response.status(404).json({ message: 'Alert not found' });
      return;
    }

    response.json(alert);
  }
);

evaluationRouter.post(
  '/evaluation/alerts/:id/resolve',
  validate({ params: idParamsSchema, body: evaluationActionBodySchema }),
  async (request, response) => {
    const alert = await evaluationAlertService.resolve(
      request.params.id,
      actorFrom(request, request.body.actor)
    );

    if (!alert) {
      response.status(404).json({ message: 'Alert not found' });
      return;
    }

    response.json(alert);
  }
);

evaluationRouter.get(
  '/evaluation/feedback-intelligence',
  validate({ query: evaluationWindowQuerySchema }),
  async (request, response) => {
    response.json(await feedbackIntelligenceService.getSignals({ days: request.query.days }));
  }
);

evaluationRouter.get(
  '/evaluation/suggestions',
  validate({ query: evaluationSuggestionsQuerySchema }),
  async (request, response) => {
    response.json(
      await feedbackIntelligenceService.listSuggestions({
        status: request.query.status,
        category: request.query.category,
        limit: request.query.limit,
      })
    );
  }
);

evaluationRouter.post(
  '/evaluation/suggestions/generate',
  validate({ body: evaluationActionBodySchema }),
  async (request, response) => {
    response.status(201).json(
      await feedbackIntelligenceService.generateSuggestions({ days: request.body.days || 30 })
    );
  }
);

evaluationRouter.post(
  '/evaluation/suggestions/:id/review',
  validate({ params: idParamsSchema, body: evaluationSuggestionActionBodySchema }),
  async (request, response) => {
    const suggestion = await feedbackIntelligenceService.reviewSuggestion(request.params.id, {
      status: request.body.status,
      actor: actorFrom(request, request.body.actor),
    });

    if (!suggestion) {
      response.status(404).json({ message: 'Suggestion not found' });
      return;
    }

    response.json(suggestion);
  }
);

evaluationRouter.get(
  '/evaluation/export',
  validate({ query: evaluationExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await evaluationService.export({
        dataset: request.query.dataset,
        format: request.query.format,
        days: request.query.days,
      });

      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export evaluation data.',
      });
    }
  }
);

export default evaluationRouter;
