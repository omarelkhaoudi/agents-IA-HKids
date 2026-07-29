import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { installationService } from '../runtime/setup-runtime.js';
import { setupBodySchema } from '../validation/schemas.js';

const setupRouter = Router();

setupRouter.get('/setup/status', async (_request, response) => {
  const status = await installationService.getStatus();
  response.json(status);
});

setupRouter.post('/setup', validate({ body: setupBodySchema }), async (request, response) => {
  try {
    const result = await installationService.completeSetup(request.body || {});
    response.status(201).json(result);
  } catch (error) {
    response.status(error.statusCode || 400).json({
      message: error instanceof Error ? error.message : 'Unable to complete setup.',
    });
  }
});

export default setupRouter;
