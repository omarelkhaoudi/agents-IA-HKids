import { Router } from 'express';
import { healthService } from '../runtime/health-runtime.js';

const healthRouter = Router();

healthRouter.get('/health', async (_request, response) => {
  const health = await healthService.getHealth();
  response.status(health.status === 'ok' ? 200 : 503).json(health);
});

healthRouter.get('/ready', async (_request, response) => {
  const readiness = await healthService.getReadiness();
  response.status(readiness.ready ? 200 : 503).json(readiness);
});

export default healthRouter;
