import { Router } from 'express';
import { feedbackService } from '../runtime/assistant-runtime.js';

const feedbackRouter = Router();

feedbackRouter.get('/feedback/dashboard', async (request, response) => {
  const dashboard = await feedbackService.getDashboard(request.query.agentCode);
  response.json(dashboard);
});

feedbackRouter.post('/feedback', async (request, response) => {
  const result = await feedbackService.recordFeedback({
    conversationId: request.body.conversationId,
    messageId: request.body.messageId,
    documentId: request.body.documentId,
    agentCode: request.body.agentCode,
    originalText: request.body.originalText,
    correctedText: request.body.correctedText,
    feedbackType: request.body.feedbackType,
    rating: request.body.rating,
    comment: request.body.comment,
  });

  response.status(201).json(result);
});

feedbackRouter.post('/feedback/patterns/:id/approve', async (request, response) => {
  const pattern = await feedbackService.approvePattern(request.params.id);

  if (!pattern) {
    response.status(404).json({ message: 'Pattern not found.' });
    return;
  }

  response.json(pattern);
});

feedbackRouter.post('/feedback/improvements/:id/approve', async (request, response) => {
  const improvement = await feedbackService.approvePromptImprovement(request.params.id);

  if (!improvement) {
    response.status(404).json({ message: 'Prompt improvement not found.' });
    return;
  }

  response.json(improvement);
});

export default feedbackRouter;
