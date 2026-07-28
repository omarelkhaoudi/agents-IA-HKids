import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import aiRouter from './routes/ai.routes.js';
import adminRouter from './routes/admin.routes.js';
import assistantRouter from './routes/assistant.routes.js';
import documentsRouter from './routes/documents.routes.js';
import feedbackRouter from './routes/feedback.routes.js';
import generatedDocumentsRouter from './routes/generated-documents.routes.js';
import healthRouter from './routes/health.routes.js';
import promptsRouter from './routes/prompts.routes.js';
import retrievalRouter from './routes/retrieval.routes.js';
import workflowRouter from './routes/workflow.routes.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientUrl,
    })
  );
  app.use(express.json());

  app.get('/', (_request, response) => {
    response.json({
      name: 'H-Kids Administrative AI Assistant API',
      version: '1.0.0',
    });
  });

  app.use('/api', healthRouter);
  app.use('/api', adminRouter);
  app.use('/api', aiRouter);
  app.use('/api', assistantRouter);
  app.use('/api', documentsRouter);
  app.use('/api', feedbackRouter);
  app.use('/api', generatedDocumentsRouter);
  app.use('/api', promptsRouter);
  app.use('/api', retrievalRouter);
  app.use('/api', workflowRouter);

  return app;
}
