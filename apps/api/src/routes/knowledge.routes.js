import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { retrievalService } from '../runtime/assistant-runtime.js';
import { knowledgePlatformService } from '../runtime/knowledge-runtime.js';
import {
  documentBodySchema,
  idParamsSchema,
  knowledgeBulkBodySchema,
  knowledgeCollectionBodySchema,
  knowledgeCompareQuerySchema,
  knowledgeImportBodySchema,
  knowledgeLinkBodySchema,
  knowledgeLinkParamsSchema,
  knowledgeMergeTagsBodySchema,
  knowledgeReviewBodySchema,
  knowledgeTagBodySchema,
  knowledgeVersionParamsSchema,
  vectorIndexActionBodySchema,
  vectorIndexJobsQuerySchema,
} from '../validation/schemas.js';

const knowledgeRouter = Router();

knowledgePlatformService.scheduleRefreshIndex = () => retrievalService.scheduleRefreshIndex();

function actorFrom(request, bodyActor) {
  return bodyActor || request.user?.email || request.user?.name || request.user?.id || '';
}

knowledgeRouter.get('/knowledge/bootstrap', async (_request, response) => {
  response.json(await knowledgePlatformService.getBootstrap());
});

knowledgeRouter.get('/knowledge/dashboard', async (_request, response) => {
  response.json(await knowledgePlatformService.getDashboard());
});

knowledgeRouter.get('/knowledge/analytics', async (_request, response) => {
  response.json(await knowledgePlatformService.getAnalytics());
});

knowledgeRouter.get('/knowledge/vector/stats', async (_request, response) => {
  response.json(await retrievalService.getVectorStats());
});

knowledgeRouter.get(
  '/knowledge/index/jobs',
  validate({ query: vectorIndexJobsQuerySchema }),
  async (request, response) => {
    response.json(await retrievalService.listIndexJobs(request.query));
  }
);

knowledgeRouter.post(
  '/knowledge/index/reindex',
  validate({ body: vectorIndexActionBodySchema }),
  async (request, response) => {
    const payload = {
      actor: actorFrom(request, request.body.actor),
      force: request.body.force !== false,
      background: request.body.background !== false,
    };

    if (request.body.scope === 'document' && request.body.targetId) {
      response.status(202).json(await retrievalService.reindexDocument(request.body.targetId, payload));
      return;
    }

    if (request.body.scope === 'collection' && request.body.targetId) {
      response
        .status(202)
        .json(await retrievalService.reindexCollection(request.body.targetId, payload));
      return;
    }

    if (request.body.scope === 'cache') {
      response.json({ cleared: retrievalService.clearCache() });
      return;
    }

    response.status(202).json(await retrievalService.reindexAll(payload));
  }
);

knowledgeRouter.post(
  '/knowledge/index/jobs/retry-failed',
  validate({ body: vectorIndexActionBodySchema }),
  async (request, response) => {
    response.status(202).json(
      await retrievalService.retryFailedJobs({
        actor: actorFrom(request, request.body.actor),
        background: request.body.background !== false,
      })
    );
  }
);

knowledgeRouter.post(
  '/knowledge/index/jobs/:id/cancel',
  validate({ params: idParamsSchema, body: vectorIndexActionBodySchema.partial() }),
  async (request, response) => {
    response.json(await retrievalService.cancelIndexJob(request.params.id, actorFrom(request, request.body.actor)));
  }
);

knowledgeRouter.post('/knowledge/vector/cache/clear', async (_request, response) => {
  response.json({ cleared: retrievalService.clearCache() });
});

knowledgeRouter.get('/knowledge/search', async (request, response) => {
  response.json(
    await knowledgePlatformService.search({
      search: request.query.q || request.query.search,
      status: request.query.status,
      category: request.query.category,
      collectionId: request.query.collectionId,
      owner: request.query.owner,
      language: request.query.language,
      tag: request.query.tag,
      agent: request.query.agent,
      version: request.query.version,
      priority: request.query.priority,
      fileType: request.query.fileType,
      sort: request.query.sort,
      limit: request.query.limit,
      offset: request.query.offset,
    })
  );
});

knowledgeRouter.get('/knowledge/collections', async (_request, response) => {
  response.json({ items: await knowledgePlatformService.listCollections() });
});

knowledgeRouter.post(
  '/knowledge/collections',
  validate({ body: knowledgeCollectionBodySchema }),
  async (request, response) => {
    response.status(201).json(await knowledgePlatformService.createCollection(request.body));
  }
);

knowledgeRouter.put(
  '/knowledge/collections/:id',
  validate({ params: idParamsSchema, body: knowledgeCollectionBodySchema.partial() }),
  async (request, response) => {
    const collection = await knowledgePlatformService.updateCollection(request.params.id, request.body);
    if (!collection) {
      response.status(404).json({ message: 'Collection not found' });
      return;
    }
    response.json(collection);
  }
);

knowledgeRouter.get('/knowledge/documents/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const detail = await knowledgePlatformService.getDocumentDetail(request.params.id);
  if (!detail) {
    response.status(404).json({ message: 'Document not found' });
    return;
  }
  response.json(detail);
});

knowledgeRouter.post(
  '/knowledge/documents',
  validate({ body: documentBodySchema }),
  async (request, response) => {
    const document = await knowledgePlatformService.createDocument(
      request.body,
      actorFrom(request)
    );
    response.status(201).json(document);
  }
);

knowledgeRouter.put(
  '/knowledge/documents/:id',
  validate({ params: idParamsSchema, body: documentBodySchema.partial() }),
  async (request, response) => {
    const document = await knowledgePlatformService.updateDocument(
      request.params.id,
      request.body,
      actorFrom(request),
      { changeSummary: request.body.notes ? 'Updated with notes' : 'Document updated' }
    );
    if (!document) {
      response.status(404).json({ message: 'Document not found' });
      return;
    }
    response.json(document);
  }
);

knowledgeRouter.delete(
  '/knowledge/documents/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const deleted = await knowledgePlatformService.removeDocument(
      request.params.id,
      actorFrom(request)
    );
    if (!deleted) {
      response.status(404).json({ message: 'Document not found' });
      return;
    }
    response.status(204).send();
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/submit-review',
  validate({ params: idParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await knowledgePlatformService.submitForReview(
          request.params.id,
          actorFrom(request, request.body.actor),
          request.body.comment
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/publish',
  validate({ params: idParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await knowledgePlatformService.publishDocument(
          request.params.id,
          actorFrom(request, request.body.actor),
          request.body.comment
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/request-corrections',
  validate({ params: idParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await knowledgePlatformService.requestCorrections(
          request.params.id,
          actorFrom(request, request.body.actor),
          request.body.comment
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/archive',
  validate({ params: idParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await knowledgePlatformService.archiveDocument(
          request.params.id,
          actorFrom(request, request.body.actor),
          request.body.comment
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

knowledgeRouter.get(
  '/knowledge/documents/:id/versions',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await knowledgePlatformService.listVersions(request.params.id) });
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/reindex',
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

knowledgeRouter.post(
  '/knowledge/collections/:id/reindex',
  validate({ params: idParamsSchema, body: vectorIndexActionBodySchema.partial() }),
  async (request, response) => {
    response.status(202).json(
      await retrievalService.reindexCollection(request.params.id, {
        actor: actorFrom(request, request.body.actor),
        force: request.body.force !== false,
        background: request.body.background !== false,
      })
    );
  }
);

knowledgeRouter.get(
  '/knowledge/documents/:id/versions/compare',
  validate({ params: idParamsSchema, query: knowledgeCompareQuerySchema }),
  async (request, response) => {
    const comparison = await knowledgePlatformService.compareVersions(
      request.params.id,
      request.query.left,
      request.query.right
    );
    if (!comparison) {
      response.status(404).json({ message: 'Versions not found' });
      return;
    }
    response.json(comparison);
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/versions/:version/restore',
  validate({ params: knowledgeVersionParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    const document = await knowledgePlatformService.restoreVersion(
      request.params.id,
      request.params.version,
      actorFrom(request, request.body.actor)
    );
    if (!document) {
      response.status(404).json({ message: 'Version not found' });
      return;
    }
    response.json(document);
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/versions/:version/duplicate',
  validate({ params: knowledgeVersionParamsSchema, body: knowledgeReviewBodySchema }),
  async (request, response) => {
    const document = await knowledgePlatformService.duplicateVersion(
      request.params.id,
      request.params.version,
      actorFrom(request, request.body.actor)
    );
    if (!document) {
      response.status(404).json({ message: 'Version not found' });
      return;
    }
    response.status(201).json(document);
  }
);

knowledgeRouter.get(
  '/knowledge/documents/:id/links',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await knowledgePlatformService.listLinks(request.params.id) });
  }
);

knowledgeRouter.post(
  '/knowledge/documents/:id/links',
  validate({ params: idParamsSchema, body: knowledgeLinkBodySchema }),
  async (request, response) => {
    response.status(201).json(
      await knowledgePlatformService.addLink(
        {
          documentId: request.params.id,
          ...request.body,
        },
        actorFrom(request)
      )
    );
  }
);

knowledgeRouter.delete(
  '/knowledge/documents/:id/links/:linkId',
  validate({ params: knowledgeLinkParamsSchema }),
  async (request, response) => {
    const removed = await knowledgePlatformService.removeLink(
      request.params.linkId,
      request.params.id,
      actorFrom(request)
    );
    if (!removed) {
      response.status(404).json({ message: 'Link not found' });
      return;
    }
    response.status(204).send();
  }
);

knowledgeRouter.get('/knowledge/tags', async (_request, response) => {
  response.json({ items: await knowledgePlatformService.listTags() });
});

knowledgeRouter.post(
  '/knowledge/tags',
  validate({ body: knowledgeTagBodySchema }),
  async (request, response) => {
    response.status(201).json(await knowledgePlatformService.upsertTag(request.body));
  }
);

knowledgeRouter.post(
  '/knowledge/tags/merge',
  validate({ body: knowledgeMergeTagsBodySchema }),
  async (request, response) => {
    response.json(
      await knowledgePlatformService.mergeTags(
        request.body.sourceName,
        request.body.targetName,
        actorFrom(request)
      )
    );
  }
);

knowledgeRouter.post(
  '/knowledge/bulk',
  validate({ body: knowledgeBulkBodySchema }),
  async (request, response) => {
    response.json(
      await knowledgePlatformService.bulkAction(
        request.body.action,
        request.body.documentIds,
        {
          collectionId: request.body.collectionId,
          tags: request.body.tags,
        },
        actorFrom(request)
      )
    );
  }
);

knowledgeRouter.get('/knowledge/export', async (request, response) => {
  response.json(
    await knowledgePlatformService.exportMetadata({
      search: request.query.q || request.query.search,
      status: request.query.status,
      category: request.query.category,
      collectionId: request.query.collectionId,
    })
  );
});

knowledgeRouter.post(
  '/knowledge/import',
  validate({ body: knowledgeImportBodySchema }),
  async (request, response) => {
    response.status(201).json(
      await knowledgePlatformService.importMetadata(request.body.items, actorFrom(request))
    );
  }
);

export default knowledgeRouter;
