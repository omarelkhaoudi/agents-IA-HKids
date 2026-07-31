import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { retrievalService } from '../runtime/assistant-runtime.js';
import { documentManagementService, wireDmsRuntime } from '../runtime/dms-runtime.js';
import {
  dmsChunkBodySchema,
  dmsFolderBodySchema,
  dmsImportBodySchema,
  dmsMoveBodySchema,
  dmsUploadBodySchema,
  dmsUploadSessionBodySchema,
  dmsWorkflowBodySchema,
  idParamsSchema,
  vectorIndexActionBodySchema,
} from '../validation/schemas.js';

const dmsRouter = Router();

wireDmsRuntime({
  scheduleRefreshIndex: () => retrievalService.scheduleRefreshIndex(),
});

function actorFrom(request, bodyActor) {
  return bodyActor || request.user?.email || request.user?.name || request.user?.id || '';
}

dmsRouter.get('/dms/bootstrap', async (_request, response) => {
  response.json(await documentManagementService.getBootstrap());
});

dmsRouter.get('/dms/dashboard', async (_request, response) => {
  response.json(await documentManagementService.getDashboard());
});

dmsRouter.get('/dms/analytics', async (_request, response) => {
  response.json(await documentManagementService.getAnalytics());
});

dmsRouter.get('/dms/vector/stats', async (_request, response) => {
  response.json(await retrievalService.getVectorStats());
});

dmsRouter.get('/dms/search', async (request, response) => {
  response.json(
    await documentManagementService.search({
      search: request.query.q || request.query.search,
      status: request.query.status,
      category: request.query.category,
      collectionId: request.query.collectionId,
      folderId: request.query.folderId,
      owner: request.query.owner,
      language: request.query.language,
      tag: request.query.tag,
      securityClassification: request.query.securityClassification,
      aiVisibility: request.query.aiVisibility,
      sort: request.query.sort,
      limit: request.query.limit,
      offset: request.query.offset,
    })
  );
});

dmsRouter.get('/dms/folders', async (request, response) => {
  response.json({
    items: await documentManagementService.listFolders({
      parentId: Object.prototype.hasOwnProperty.call(request.query, 'parentId')
        ? request.query.parentId || null
        : undefined,
    }),
  });
});

dmsRouter.post(
  '/dms/folders',
  validate({ body: dmsFolderBodySchema }),
  async (request, response) => {
    response
      .status(201)
      .json(await documentManagementService.createFolder(request.body, actorFrom(request)));
  }
);

dmsRouter.put(
  '/dms/folders/:id',
  validate({ params: idParamsSchema, body: dmsFolderBodySchema.partial() }),
  async (request, response) => {
    const folder = await documentManagementService.updateFolder(
      request.params.id,
      request.body,
      actorFrom(request)
    );
    if (!folder) {
      response.status(404).json({ message: 'Folder not found' });
      return;
    }
    response.json(folder);
  }
);

dmsRouter.post(
  '/dms/folders/:id/rename',
  validate({ params: idParamsSchema, body: dmsFolderBodySchema.pick({ name: true }) }),
  async (request, response) => {
    response.json(
      await documentManagementService.renameFolder(
        request.params.id,
        request.body.name,
        actorFrom(request)
      )
    );
  }
);

dmsRouter.post(
  '/dms/folders/:id/move',
  validate({
    params: idParamsSchema,
    body: dmsFolderBodySchema.pick({ parentId: true }),
  }),
  async (request, response) => {
    try {
      response.json(
        await documentManagementService.moveFolder(
          request.params.id,
          request.body.parentId,
          actorFrom(request)
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

dmsRouter.post(
  '/dms/folders/:id/copy',
  validate({ params: idParamsSchema, body: dmsWorkflowBodySchema }),
  async (request, response) => {
    const folder = await documentManagementService.copyFolder(
      request.params.id,
      actorFrom(request, request.body.actor)
    );
    if (!folder) {
      response.status(404).json({ message: 'Folder not found' });
      return;
    }
    response.status(201).json(folder);
  }
);

dmsRouter.post(
  '/dms/folders/:id/archive',
  validate({ params: idParamsSchema, body: dmsWorkflowBodySchema }),
  async (request, response) => {
    response.json(
      await documentManagementService.archiveFolder(
        request.params.id,
        actorFrom(request, request.body.actor)
      )
    );
  }
);

dmsRouter.post(
  '/dms/folders/:id/restore',
  validate({ params: idParamsSchema, body: dmsWorkflowBodySchema }),
  async (request, response) => {
    response.json(
      await documentManagementService.restoreFolder(
        request.params.id,
        actorFrom(request, request.body.actor)
      )
    );
  }
);

dmsRouter.delete(
  '/dms/folders/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const folder = await documentManagementService.deleteFolder(
      request.params.id,
      actorFrom(request)
    );
    if (!folder) {
      response.status(404).json({ message: 'Folder not found' });
      return;
    }
    response.json(folder);
  }
);

dmsRouter.get(
  '/dms/folders/:id/breadcrumb',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await documentManagementService.getFolderBreadcrumb(request.params.id) });
  }
);

dmsRouter.post(
  '/dms/uploads/sessions',
  validate({ body: dmsUploadSessionBodySchema }),
  async (request, response) => {
    try {
      response
        .status(201)
        .json(await documentManagementService.startUploadSession(request.body, actorFrom(request)));
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

dmsRouter.post(
  '/dms/uploads/sessions/:id/chunks',
  validate({ params: idParamsSchema, body: dmsChunkBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await documentManagementService.receiveUploadChunk(request.params.id, request.body)
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

dmsRouter.post(
  '/dms/uploads/sessions/:id/cancel',
  validate({ params: idParamsSchema, body: dmsWorkflowBodySchema }),
  async (request, response) => {
    response.json(
      await documentManagementService.cancelUploadSession(
        request.params.id,
        actorFrom(request, request.body.actor)
      )
    );
  }
);

dmsRouter.post(
  '/dms/uploads',
  validate({ body: dmsUploadBodySchema }),
  async (request, response) => {
    try {
      const result = await documentManagementService.uploadDocument(
        request.body,
        actorFrom(request)
      );
      response.status(result.duplicate ? 409 : 201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

dmsRouter.get(
  '/dms/documents/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const detail = await documentManagementService.getDocumentDetail(request.params.id);
    if (!detail) {
      response.status(404).json({ message: 'Document not found' });
      return;
    }
    response.json(detail);
  }
);

dmsRouter.get(
  '/dms/documents/:id/download',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      const result = await documentManagementService.downloadDocument(
        request.params.id,
        actorFrom(request)
      );
      if (!result) {
        response.status(404).json({ message: 'Document not found' });
        return;
      }
      response.setHeader('Content-Type', result.mimeType);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename.replaceAll('"', '')}"`
      );
      response.send(result.buffer);
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

dmsRouter.post(
  '/dms/documents/:id/reindex',
  validate({ params: idParamsSchema, body: vectorIndexActionBodySchema.partial() }),
  async (request, response) => {
    response.status(202).json(
      await retrievalService.reindexDocument(request.params.id, {
        actor: actorFrom(request, request.body.actor),
        force: request.body.force !== false,
        background: request.body.background !== false,
      })
    );
  }
);

dmsRouter.post(
  '/dms/documents/move',
  validate({ body: dmsMoveBodySchema }),
  async (request, response) => {
    response.json(
      await documentManagementService.moveDocuments(
        request.body.documentIds,
        request.body.folderId,
        actorFrom(request)
      )
    );
  }
);

const workflowActions = ['submit', 'approve', 'publish', 'corrections', 'archive', 'restore'];
for (const action of workflowActions) {
  dmsRouter.post(
    `/dms/documents/:id/${action}`,
    validate({ params: idParamsSchema, body: dmsWorkflowBodySchema }),
    async (request, response) => {
      try {
        const document = await documentManagementService.transitionDocument(
          request.params.id,
          action,
          actorFrom(request, request.body.actor),
          request.body.comment
        );
        if (!document) {
          response.status(404).json({ message: 'Document not found' });
          return;
        }
        response.json(document);
      } catch (error) {
        response.status(error.statusCode || 400).json({ message: error.message });
      }
    }
  );
}

dmsRouter.get('/dms/export', async (request, response) => {
  const exported = await documentManagementService.exportMetadata(request.query.format || 'json', {
    search: request.query.q || request.query.search,
    status: request.query.status,
    folderId: request.query.folderId,
    collectionId: request.query.collectionId,
  });
  if (exported.format === 'csv') {
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader('Content-Disposition', 'attachment; filename="dms-metadata.csv"');
    response.send(exported.body);
    return;
  }
  response.json(exported);
});

dmsRouter.post(
  '/dms/import',
  validate({ body: dmsImportBodySchema }),
  async (request, response) => {
    response
      .status(201)
      .json(await documentManagementService.importMetadata(request.body.items, actorFrom(request)));
  }
);

dmsRouter.get('/dms/audit', async (request, response) => {
  response.json({
    items: await documentManagementService.listAudit({
      documentId: request.query.documentId,
      folderId: request.query.folderId,
      limit: request.query.limit,
    }),
  });
});

export default dmsRouter;
