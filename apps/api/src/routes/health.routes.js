import { Router } from 'express';

const healthRouter = Router();

healthRouter.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

export default healthRouter;
