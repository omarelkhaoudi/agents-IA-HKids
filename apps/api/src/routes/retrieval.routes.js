import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { retrievalService } from '../runtime/assistant-runtime.js';
import { retrievalSearchBodySchema } from '../validation/schemas.js';

const retrievalRouter = Router();

retrievalRouter.post('/retrieval/search', validate({ body: retrievalSearchBodySchema }), (request, response) => {
  try {
    const result = retrievalService.retrieveRelevantContext(request.body.question);
    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to search retrieval context.',
    });
  }
});

export default retrievalRouter;
