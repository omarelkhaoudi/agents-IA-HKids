import { Router } from 'express';
import { retrievalService } from '../runtime/assistant-runtime.js';

const retrievalRouter = Router();

retrievalRouter.post('/retrieval/search', (request, response) => {
  const question = request.body.question || '';

  if (!question.trim()) {
    response.status(400).json({ message: 'Question is required.' });
    return;
  }

  const result = retrievalService.retrieveRelevantContext(question);
  response.json(result);
});

export default retrievalRouter;
