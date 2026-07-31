import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { alertService, observabilityService } from '../runtime/observability-runtime.js';
import {
  idParamsSchema,
  observabilityAlertActionBodySchema,
  observabilityAlertsQuerySchema,
  observabilityAnalyticsQuerySchema,
  observabilityEventBodySchema,
  observabilityExportQuerySchema,
  observabilityLogsQuerySchema,
  observabilitySnapshotsQuerySchema,
  observabilityTimelineQuerySchema,
  observabilityUsageQuerySchema,
} from '../validation/schemas.js';

const observabilityRouter = Router();

function actorFrom(request, bodyActor) {
  return bodyActor || request.user?.email || request.user?.name || request.user?.id || '';
}

observabilityRouter.get('/observability/overview', async (_request, response) => {
  response.json(await observabilityService.getOverview());
});

observabilityRouter.get('/observability/realtime', async (_request, response) => {
  response.json(await observabilityService.getRealtime());
});

observabilityRouter.get(
  '/observability/usage',
  validate({ query: observabilityUsageQuerySchema }),
  async (request, response) => {
    response.json(
      await observabilityService.getUsage({
        granularity: request.query.granularity,
        days: request.query.days,
      })
    );
  }
);

observabilityRouter.get(
  '/observability/logs',
  validate({ query: observabilityLogsQuerySchema }),
  async (request, response) => {
    response.json(
      await observabilityService.getConversationLogs({
        search: request.query.search,
        agentCode: request.query.agentCode,
        limit: request.query.limit,
        offset: request.query.offset,
      })
    );
  }
);

observabilityRouter.get(
  '/observability/logs/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const log = await observabilityService.getConversationLog(request.params.id);

    if (!log) {
      response.status(404).json({ message: 'Conversation log not found' });
      return;
    }

    response.json(log);
  }
);

observabilityRouter.get('/observability/health', async (_request, response) => {
  response.json(await observabilityService.getSystemHealth());
});

observabilityRouter.get(
  '/observability/analytics',
  validate({ query: observabilityAnalyticsQuerySchema }),
  async (request, response) => {
    response.json(await observabilityService.getAnalytics({ days: request.query.days }));
  }
);

observabilityRouter.get(
  '/observability/timeline',
  validate({ query: observabilityTimelineQuerySchema }),
  async (request, response) => {
    response.json(
      await observabilityService.getTimeline({
        category: request.query.category,
        severity: request.query.severity,
        days: request.query.days,
        limit: request.query.limit,
      })
    );
  }
);

observabilityRouter.post(
  '/observability/events',
  validate({ body: observabilityEventBodySchema }),
  async (request, response) => {
    const event = await observabilityService.recordEvent({
      ...request.body,
      actor: actorFrom(request),
    });
    response.status(201).json(event);
  }
);

observabilityRouter.get(
  '/observability/alerts',
  validate({ query: observabilityAlertsQuerySchema }),
  async (request, response) => {
    response.json(
      await alertService.listAlerts({
        status: request.query.status,
        severity: request.query.severity,
        limit: request.query.limit,
      })
    );
  }
);

observabilityRouter.post(
  '/observability/alerts/evaluate',
  validate({ body: observabilityAlertActionBodySchema }),
  async (request, response) => {
    response.json(await alertService.evaluate({ actor: actorFrom(request, request.body.actor) }));
  }
);

observabilityRouter.post(
  '/observability/alerts/:id/acknowledge',
  validate({ params: idParamsSchema, body: observabilityAlertActionBodySchema }),
  async (request, response) => {
    const alert = await alertService.acknowledge(
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

observabilityRouter.post(
  '/observability/alerts/:id/resolve',
  validate({ params: idParamsSchema, body: observabilityAlertActionBodySchema }),
  async (request, response) => {
    const alert = await alertService.resolve(
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

observabilityRouter.get(
  '/observability/snapshots',
  validate({ query: observabilitySnapshotsQuerySchema }),
  async (request, response) => {
    response.json({ items: await observabilityService.listSnapshots({ limit: request.query.limit }) });
  }
);

observabilityRouter.post('/observability/snapshots', async (_request, response) => {
  response.status(201).json(await observabilityService.captureSnapshot());
});

observabilityRouter.get(
  '/observability/export',
  validate({ query: observabilityExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await observabilityService.export({
        dataset: request.query.dataset,
        format: request.query.format,
        days: request.query.days,
      });

      await observabilityService.recordEvent({
        eventType: 'observability_exported',
        category: 'export',
        severity: 'info',
        source: 'observability-api',
        actor: actorFrom(request),
        subjectType: 'dataset',
        subjectId: request.query.dataset,
        summary: `Exported ${request.query.dataset} as ${exported.format}.`,
        metadata: { format: exported.format },
      });

      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export observability data.',
      });
    }
  }
);

export default observabilityRouter;
