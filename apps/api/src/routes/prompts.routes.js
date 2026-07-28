import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  createPrompt,
  listPrompts,
  removePrompt,
  updatePrompt,
} from '../runtime/content-runtime.js';
import { idParamsSchema, promptBodySchema } from '../validation/schemas.js';

const promptsRouter = Router();

promptsRouter.get('/prompts', (_request, response) => {
  response.json({
    items: listPrompts(),
  });
});

promptsRouter.post('/prompts', validate({ body: promptBodySchema }), async (request, response) => {
  const prompt = await createPrompt(request.body);
  response.status(201).json(prompt);
});

promptsRouter.put(
  '/prompts/:id',
  validate({ params: idParamsSchema, body: promptBodySchema.partial() }),
  async (request, response) => {
    const prompt = await updatePrompt(request.params.id, request.body);

    if (!prompt) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }

    response.json(prompt);
  }
);

promptsRouter.delete('/prompts/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const deleted = await removePrompt(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: 'Prompt not found' });
    return;
  }

  response.status(204).send();
});

export default promptsRouter;
