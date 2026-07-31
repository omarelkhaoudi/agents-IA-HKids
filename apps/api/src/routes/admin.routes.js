import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { retrievalService } from '../runtime/assistant-runtime.js';
import { authService } from '../runtime/auth-runtime.js';
import {
  agentConfigurationService,
  agentManagementService,
  dashboardService,
  exportService,
  systemSettingsService,
  systemStatusService,
} from '../runtime/admin-runtime.js';
import {
  encryptionService,
  secretManager,
  securityDashboardService,
  securityRepository,
} from '../runtime/security-runtime.js';
import { workflowEngine } from '../runtime/workflow-runtime.js';
import {
  createAgentBodySchema,
  exportQuerySchema,
  exportTypeParamsSchema,
  idParamsSchema,
  secretRotationBodySchema,
  updateAgentBodySchema,
  updateSettingsBodySchema,
  vectorIndexActionBodySchema,
  vectorIndexJobsQuerySchema,
} from '../validation/schemas.js';

const adminRouter = Router();

adminRouter.get('/admin/dashboard', async (_request, response) => {
  const dashboard = await dashboardService.getDashboard();
  response.json(dashboard);
});

adminRouter.get('/admin/statistics', async (_request, response) => {
  const statistics = await dashboardService.getStatistics();
  response.json(statistics);
});

adminRouter.get('/admin/system-status', async (_request, response) => {
  const status = await systemStatusService.getSystemStatus();
  response.json(status);
});

adminRouter.get('/admin/vector/stats', async (_request, response) => {
  response.json(await retrievalService.getVectorStats());
});

adminRouter.get('/admin/security', async (_request, response) => {
  response.json(await securityDashboardService.getDashboard());
});

adminRouter.get('/admin/workflows', async (request, response) => {
  response.json(await workflowEngine.getDashboard({ days: request.query.days }));
});

adminRouter.get('/admin/workflows/analytics', async (request, response) => {
  response.json(await workflowEngine.getAnalytics({ days: request.query.days }));
});

adminRouter.get('/admin/security/events', async (request, response) => {
  response.json({
    items: await securityRepository.listSecurityEvents({
      eventType: request.query.eventType,
      severity: request.query.severity,
      allowed:
        request.query.allowed === undefined ? undefined : String(request.query.allowed) === 'true',
      limit: request.query.limit,
      offset: request.query.offset,
    }),
  });
});

adminRouter.post('/admin/security/secrets/validate', async (_request, response) => {
  await securityDashboardService.syncSecretInventory();
  response.json(secretManager.getSecretHealth());
});

adminRouter.post(
  '/admin/security/secrets/:id/rotate',
  validate({ params: idParamsSchema, body: secretRotationBodySchema }),
  async (request, response) => {
    const rotated = secretManager.rotateSecret(request.params.id, request.body.value, {
      expiresAt: request.body.expiresAt,
    });
    await securityDashboardService.syncSecretInventory();
    response.json(rotated);
  }
);

adminRouter.post('/admin/security/encryption/rotate', async (_request, response) => {
  const rotated = encryptionService.rotateKey();
  await securityDashboardService.syncEncryptionInventory();
  response.json(rotated);
});

adminRouter.post(
  '/admin/security/users/:id/force-logout',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json(await authService.forceLogout(request.params.id, request.user?.email || 'admin'));
  }
);

adminRouter.get(
  '/admin/vector/jobs',
  validate({ query: vectorIndexJobsQuerySchema }),
  async (request, response) => {
    response.json(await retrievalService.listIndexJobs(request.query));
  }
);

adminRouter.post(
  '/admin/vector/reindex',
  validate({ body: vectorIndexActionBodySchema }),
  async (request, response) => {
    const payload = {
      actor: request.body.actor || request.user?.email || request.user?.id || 'admin',
      force: request.body.force !== false,
      background: request.body.background !== false,
    };

    if (request.body.scope === 'document' && request.body.targetId) {
      response.status(202).json(await retrievalService.reindexDocument(request.body.targetId, payload));
      return;
    }

    if (request.body.scope === 'collection' && request.body.targetId) {
      response
        .status(202)
        .json(await retrievalService.reindexCollection(request.body.targetId, payload));
      return;
    }

    response.status(202).json(await retrievalService.reindexAll(payload));
  }
);

adminRouter.post(
  '/admin/vector/jobs/:id/cancel',
  validate({ params: idParamsSchema, body: vectorIndexActionBodySchema.partial() }),
  async (request, response) => {
    response.json(
      await retrievalService.cancelIndexJob(
        request.params.id,
        request.body.actor || request.user?.email || request.user?.id || 'admin'
      )
    );
  }
);

adminRouter.post(
  '/admin/vector/jobs/retry-failed',
  validate({ body: vectorIndexActionBodySchema.partial() }),
  async (request, response) => {
    response.status(202).json(
      await retrievalService.retryFailedJobs({
        actor: request.body.actor || request.user?.email || request.user?.id || 'admin',
        background: request.body.background !== false,
      })
    );
  }
);

adminRouter.post('/admin/vector/cache/clear', async (_request, response) => {
  response.json({ cleared: retrievalService.clearCache() });
});

adminRouter.get(
  '/admin/exports/:type',
  validate({ params: exportTypeParamsSchema, query: exportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await exportService.exportAs(
        request.params.type,
        request.query.format || 'json'
      );
      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export data.',
      });
    }
  }
);

adminRouter.get('/admin/agents', async (_request, response) => {
  const agents = await agentManagementService.listAgents();
  const resources = agentConfigurationService.getAvailableResources();
  response.json({ items: agents, resources });
});

adminRouter.post('/admin/agents', validate({ body: createAgentBodySchema }), async (request, response) => {
  try {
    const agent = await agentManagementService.createAgent(request.body || {});
    response.status(201).json(agent);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to create agent.',
    });
  }
});

adminRouter.put('/admin/agents/:id', validate({ params: idParamsSchema, body: updateAgentBodySchema }), async (request, response) => {
  try {
    const agent = await agentManagementService.updateAgent(request.params.id, request.body || {});
    response.json(agent);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to update agent.',
    });
  }
});

adminRouter.delete('/admin/agents/:id', validate({ params: idParamsSchema }), async (request, response) => {
  try {
    const result = await agentManagementService.deleteAgent(request.params.id);
    response.json(result);
  } catch (error) {
    response.status(404).json({
      message: error instanceof Error ? error.message : 'Unable to delete agent.',
    });
  }
});

adminRouter.get('/admin/settings', async (_request, response) => {
  const settings = await systemSettingsService.getSettings();
  response.json({ settings });
});

adminRouter.put('/admin/settings', validate({ body: updateSettingsBodySchema }), async (request, response) => {
  try {
    const settings = await systemSettingsService.updateSettings(request.body?.settings || request.body || {});
    response.json({ settings });
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to update settings.',
    });
  }
});

export default adminRouter;
