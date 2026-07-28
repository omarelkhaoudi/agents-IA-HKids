import { Router } from 'express';
import { aiGateway } from '../runtime/assistant-runtime.js';

const aiRouter = Router();

aiRouter.get('/ai/providers', (_request, response) => {
  response.json({
    items: aiGateway.listProviders(),
    current: aiGateway.getCurrentConfiguration(),
  });
});

aiRouter.get('/ai/models', (request, response) => {
  response.json({
    items: aiGateway.listModels({ provider: request.query.provider }),
    current: aiGateway.getCurrentConfiguration(),
  });
});

aiRouter.get('/ai/usage', async (request, response) => {
  const items = await aiGateway.listUsage({
    provider: request.query.provider,
    model: request.query.model,
    date: request.query.date,
    agentCode: request.query.agentCode,
  });

  response.json({ items });
});

aiRouter.get('/ai/statistics', async (_request, response) => {
  const statistics = await aiGateway.getStatistics();
  response.json({
    ...statistics,
    current: aiGateway.getCurrentConfiguration(),
  });
});

export default aiRouter;
