import { Router } from 'express';
import {
  createPrompt,
  listPrompts,
  removePrompt,
  updatePrompt,
} from '../data/mock-prompts.js';

const promptsRouter = Router();

promptsRouter.get('/prompts', (_request, response) => {
  response.json({
    items: listPrompts(),
  });
});

promptsRouter.post('/prompts', (request, response) => {
  const prompt = createPrompt(request.body);
  response.status(201).json(prompt);
});

promptsRouter.put('/prompts/:id', (request, response) => {
  const prompt = updatePrompt(request.params.id, request.body);

  if (!prompt) {
    response.status(404).json({ message: 'Prompt not found' });
    return;
  }

  response.json(prompt);
});

promptsRouter.delete('/prompts/:id', (request, response) => {
  const deleted = removePrompt(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: 'Prompt not found' });
    return;
  }

  response.status(204).send();
});

export default promptsRouter;
