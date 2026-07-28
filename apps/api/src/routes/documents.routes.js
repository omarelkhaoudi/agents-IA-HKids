import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  createDocument,
  listDocuments,
  removeDocument,
  updateDocument,
} from '../runtime/content-runtime.js';
import { retrievalService } from '../runtime/assistant-runtime.js';
import { documentBodySchema, idParamsSchema } from '../validation/schemas.js';

const documentsRouter = Router();

documentsRouter.get('/documents', (_request, response) => {
  response.json({
    items: listDocuments(),
  });
});

documentsRouter.post('/documents', validate({ body: documentBodySchema }), async (request, response) => {
  const document = await createDocument(request.body);
  retrievalService.refreshIndex();
  response.status(201).json(document);
});

documentsRouter.put(
  '/documents/:id',
  validate({ params: idParamsSchema, body: documentBodySchema.partial() }),
  async (request, response) => {
    const document = await updateDocument(request.params.id, request.body);

    if (!document) {
      response.status(404).json({ message: 'Document not found' });
      return;
    }

    retrievalService.refreshIndex();
    response.json(document);
  }
);

documentsRouter.delete('/documents/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const deleted = await removeDocument(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: 'Document not found' });
    return;
  }

  retrievalService.refreshIndex();
  response.status(204).send();
});

export default documentsRouter;
