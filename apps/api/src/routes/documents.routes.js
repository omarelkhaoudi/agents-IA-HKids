import { Router } from 'express';
import {
  createDocument,
  listDocuments,
  removeDocument,
  updateDocument,
} from '../data/mock-documents.js';
import {
  createDocumentSource,
  removeDocumentSource,
  updateDocumentSource,
} from '../data/mock-document-sources.js';
import { retrievalService } from '../runtime/assistant-runtime.js';

const documentsRouter = Router();

documentsRouter.get('/documents', (_request, response) => {
  response.json({
    items: listDocuments(),
  });
});

documentsRouter.post('/documents', (request, response) => {
  const document = createDocument(request.body);
  createDocumentSource(document);
  retrievalService.refreshIndex();
  response.status(201).json(document);
});

documentsRouter.put('/documents/:id', (request, response) => {
  const document = updateDocument(request.params.id, request.body);

  if (!document) {
    response.status(404).json({ message: 'Document not found' });
    return;
  }

  updateDocumentSource(document);
  retrievalService.refreshIndex();
  response.json(document);
});

documentsRouter.delete('/documents/:id', (request, response) => {
  const deleted = removeDocument(request.params.id);

  if (!deleted) {
    response.status(404).json({ message: 'Document not found' });
    return;
  }

  removeDocumentSource(request.params.id);
  retrievalService.refreshIndex();
  response.status(204).send();
});

export default documentsRouter;
