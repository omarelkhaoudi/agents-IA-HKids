import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { authorizeAccess } from './middleware/authorize.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import aiRouter from './routes/ai.routes.js';
import adminRouter from './routes/admin.routes.js';
import assistantRouter from './routes/assistant.routes.js';
import authRouter from './routes/auth.routes.js';
import documentsRouter from './routes/documents.routes.js';
import feedbackRouter from './routes/feedback.routes.js';
import generatedDocumentsRouter from './routes/generated-documents.routes.js';
import healthRouter from './routes/health.routes.js';
import promptsRouter from './routes/prompts.routes.js';
import retrievalRouter from './routes/retrieval.routes.js';
import setupRouter from './routes/setup.routes.js';
import communityManagerRouter from './routes/community-manager.routes.js';
import salesAgentRouter from './routes/sales-agent.routes.js';
import hrAgentRouter from './routes/hr-agent.routes.js';
import workflowRouter from './routes/workflow.routes.js';

const protectedMiddleware = [authenticate, authorizeAccess];

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestLogger);
  app.use(
    cors({
      origin: env.clientUrl,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: env.jsonBodyLimit }));

  app.get('/', (_request, response) => {
    response.json({
      name: 'H-Kids Administrative AI Assistant API',
      version: '1.0.0',
    });
  });

  app.use('/api', apiRateLimiter);
  app.use('/api', healthRouter);
  app.use('/api', setupRouter);
  app.use('/api', authRouter);
  app.use('/api', protectedMiddleware, adminRouter);
  app.use('/api', protectedMiddleware, aiRouter);
  app.use('/api', protectedMiddleware, assistantRouter);
  app.use('/api', protectedMiddleware, communityManagerRouter);
  app.use('/api', protectedMiddleware, salesAgentRouter);
  app.use('/api', protectedMiddleware, hrAgentRouter);
  app.use('/api', protectedMiddleware, documentsRouter);
  app.use('/api', protectedMiddleware, feedbackRouter);
  app.use('/api', protectedMiddleware, generatedDocumentsRouter);
  app.use('/api', protectedMiddleware, promptsRouter);
  app.use('/api', protectedMiddleware, retrievalRouter);
  app.use('/api', protectedMiddleware, workflowRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
