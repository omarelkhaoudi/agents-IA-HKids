import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  agentConfigurationService,
  agentManagementService,
  dashboardService,
  exportService,
  systemSettingsService,
  systemStatusService,
} from '../runtime/admin-runtime.js';
import {
  createAgentBodySchema,
  exportQuerySchema,
  exportTypeParamsSchema,
  idParamsSchema,
  updateAgentBodySchema,
  updateSettingsBodySchema,
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
