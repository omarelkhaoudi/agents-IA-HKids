import { Router } from 'express';
import { workflowEngine } from '../runtime/workflow-runtime.js';

const workflowRouter = Router();

workflowRouter.get('/conversations/:id/generated-documents/:documentId/workflow', async (request, response) => {
  const workflow = await workflowEngine.getWorkflowByDocumentId(request.params.documentId);

  if (!workflow) {
    response.status(404).json({ message: 'Workflow not found.' });
    return;
  }

  response.json(workflow);
});

workflowRouter.post('/conversations/:id/generated-documents/:documentId/workflow/transition', async (request, response) => {
  try {
    const workflow = await workflowEngine.transition({
      documentId: request.params.documentId,
      actor: request.body.actor || 'Administrator',
      nextState: request.body.nextState,
      comment: request.body.comment || '',
    });

    response.json(workflow);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to transition workflow.',
    });
  }
});

export default workflowRouter;
