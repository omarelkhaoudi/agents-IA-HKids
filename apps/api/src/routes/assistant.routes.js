import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { agentManagementService } from '../runtime/admin-runtime.js';
import { conversationService, getAssistantBootstrap } from '../runtime/assistant-runtime.js';
import {
  conversationIdParamsSchema,
  createConversationBodySchema,
  sendMessageBodySchema,
} from '../validation/schemas.js';

const assistantRouter = Router();

assistantRouter.get('/assistant/bootstrap', async (_request, response) => {
  const agents = await agentManagementService.listAgents();
  const activeAgents = agents.filter((agent) => agent.status === 'active');

  response.json({
    ...getAssistantBootstrap(),
    agents: activeAgents,
    defaultAgentCode: activeAgents[0]?.code || 'administrative-assistant',
  });
});

assistantRouter.get('/conversations', (_request, response) => {
  Promise.resolve(conversationService.listSessions({ agentCode: _request.query.agentCode }))
    .then((items) => {
      response.json({ items });
    })
    .catch((error) => {
      response.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to list conversations.',
      });
    });
});

assistantRouter.post('/conversations', validate({ body: createConversationBodySchema }), (request, response) => {
  Promise.resolve(conversationService.createSession(request.body))
    .then((session) => {
      response.status(201).json(session);
    })
    .catch((error) => {
      response.status(400).json({
        message: error instanceof Error ? error.message : 'Unable to create conversation.',
      });
    });
});

assistantRouter.get('/conversations/:id', validate({ params: conversationIdParamsSchema }), (request, response) => {
  Promise.resolve(conversationService.getSession(request.params.id))
    .then((session) => {
      if (!session) {
        response.status(404).json({ message: 'Conversation session not found' });
        return;
      }

      response.json(session);
    })
    .catch((error) => {
      response.status(500).json({
        message: error instanceof Error ? error.message : 'Unable to load conversation.',
      });
    });
});

assistantRouter.post(
  '/conversations/:id/messages',
  validate({ params: conversationIdParamsSchema, body: sendMessageBodySchema }),
  async (request, response) => {
  try {
    const result = await conversationService.sendMessage({
      sessionId: request.params.id,
      provider: request.body.provider,
      model: request.body.model,
      agentCode: request.body.agentCode,
      selectedPromptId: request.body.selectedPromptId,
      selectedDocumentIds: request.body.selectedDocumentIds || [],
      currentContext: request.body.currentContext,
      userMessage: request.body.message,
    });

    response.json(result);
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Unable to process assistant message.',
    });
  }
});

export default assistantRouter;
