import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { aiGateway, retrievalService } from '../runtime/assistant-runtime.js';
import { listDocuments } from '../runtime/content-runtime.js';
import {
  promptPlatformService,
  wirePromptPlatformRuntime,
} from '../runtime/prompt-platform-runtime.js';
import {
  idParamsSchema,
  promptBodySchema,
  promptCompareQuerySchema,
  promptFeedbackSuggestionBodySchema,
  promptLibraryBodySchema,
  promptLinkBodySchema,
  promptLinkParamsSchema,
  promptPlaygroundBodySchema,
  promptReviewBodySchema,
  promptVersionParamsSchema,
} from '../validation/schemas.js';

const promptPlatformRouter = Router();

wirePromptPlatformRuntime({
  aiGateway,
  retrievalService,
  listDocuments,
});

function actorFrom(request, bodyActor) {
  return bodyActor || request.user?.email || request.user?.name || request.user?.id || '';
}

promptPlatformRouter.get('/prompt-platform/bootstrap', async (_request, response) => {
  response.json(await promptPlatformService.getBootstrap());
});

promptPlatformRouter.get('/prompt-platform/dashboard', async (_request, response) => {
  response.json(await promptPlatformService.getDashboard());
});

promptPlatformRouter.get('/prompt-platform/analytics', async (_request, response) => {
  response.json(await promptPlatformService.getAnalytics());
});

promptPlatformRouter.get('/prompt-platform/search', async (request, response) => {
  response.json(
    await promptPlatformService.search({
      search: request.query.q || request.query.search,
      status: request.query.status,
      category: request.query.category,
      libraryId: request.query.libraryId,
      owner: request.query.owner,
      language: request.query.language,
      agent: request.query.agent,
      tag: request.query.tag,
      version: request.query.version,
      model: request.query.model,
      priority: request.query.priority,
      sort: request.query.sort,
      limit: request.query.limit,
      offset: request.query.offset,
    })
  );
});

promptPlatformRouter.get('/prompt-platform/libraries', async (_request, response) => {
  response.json({ items: await promptPlatformService.listLibraries() });
});

promptPlatformRouter.post(
  '/prompt-platform/libraries',
  validate({ body: promptLibraryBodySchema }),
  async (request, response) => {
    response.status(201).json(await promptPlatformService.createLibrary(request.body));
  }
);

promptPlatformRouter.put(
  '/prompt-platform/libraries/:id',
  validate({ params: idParamsSchema, body: promptLibraryBodySchema.partial() }),
  async (request, response) => {
    const library = await promptPlatformService.updateLibrary(request.params.id, request.body);
    if (!library) {
      response.status(404).json({ message: 'Library not found' });
      return;
    }
    response.json(library);
  }
);

promptPlatformRouter.get(
  '/prompt-platform/prompts/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const detail = await promptPlatformService.getPromptDetail(request.params.id);
    if (!detail) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }
    response.json(detail);
  }
);

promptPlatformRouter.post(
  '/prompt-platform/prompts',
  validate({ body: promptBodySchema }),
  async (request, response) => {
    response
      .status(201)
      .json(await promptPlatformService.createPrompt(request.body, actorFrom(request)));
  }
);

promptPlatformRouter.put(
  '/prompt-platform/prompts/:id',
  validate({ params: idParamsSchema, body: promptBodySchema.partial() }),
  async (request, response) => {
    const prompt = await promptPlatformService.updatePrompt(
      request.params.id,
      request.body,
      actorFrom(request)
    );
    if (!prompt) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }
    response.json(prompt);
  }
);

const reviewActions = [
  ['submit-review', 'submitForReview'],
  ['approve', 'approvePrompt'],
  ['publish', 'publishPrompt'],
  ['request-corrections', 'requestCorrections'],
  ['archive', 'archivePrompt'],
  ['deprecate', 'deprecatePrompt'],
  ['restore', 'restorePrompt'],
];

for (const [pathSuffix, methodName] of reviewActions) {
  promptPlatformRouter.post(
    `/prompt-platform/prompts/:id/${pathSuffix}`,
    validate({ params: idParamsSchema, body: promptReviewBodySchema }),
    async (request, response) => {
      try {
        response.json(
          await promptPlatformService[methodName](
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
}

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/duplicate',
  validate({ params: idParamsSchema, body: promptReviewBodySchema }),
  async (request, response) => {
    const prompt = await promptPlatformService.duplicatePrompt(
      request.params.id,
      actorFrom(request, request.body.actor)
    );
    if (!prompt) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }
    response.status(201).json(prompt);
  }
);

promptPlatformRouter.get(
  '/prompt-platform/prompts/:id/versions',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await promptPlatformService.listVersions(request.params.id) });
  }
);

promptPlatformRouter.get(
  '/prompt-platform/prompts/:id/versions/compare',
  validate({ params: idParamsSchema, query: promptCompareQuerySchema }),
  async (request, response) => {
    const comparison = await promptPlatformService.compareVersions(
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

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/versions/:version/restore',
  validate({ params: promptVersionParamsSchema, body: promptReviewBodySchema }),
  async (request, response) => {
    const prompt = await promptPlatformService.restoreVersion(
      request.params.id,
      request.params.version,
      actorFrom(request, request.body.actor)
    );
    if (!prompt) {
      response.status(404).json({ message: 'Version not found' });
      return;
    }
    response.json(prompt);
  }
);

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/versions/:version/clone',
  validate({ params: promptVersionParamsSchema, body: promptReviewBodySchema }),
  async (request, response) => {
    const prompt = await promptPlatformService.cloneVersion(
      request.params.id,
      request.params.version,
      actorFrom(request, request.body.actor)
    );
    if (!prompt) {
      response.status(404).json({ message: 'Version not found' });
      return;
    }
    response.status(201).json(prompt);
  }
);

promptPlatformRouter.get(
  '/prompt-platform/prompts/:id/links',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await promptPlatformService.listLinks(request.params.id) });
  }
);

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/links',
  validate({ params: idParamsSchema, body: promptLinkBodySchema }),
  async (request, response) => {
    response.status(201).json(
      await promptPlatformService.addLink(
        { promptId: request.params.id, ...request.body },
        actorFrom(request)
      )
    );
  }
);

promptPlatformRouter.delete(
  '/prompt-platform/prompts/:id/links/:linkId',
  validate({ params: promptLinkParamsSchema }),
  async (request, response) => {
    const removed = await promptPlatformService.removeLink(
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

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/playground',
  validate({ params: idParamsSchema, body: promptPlaygroundBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await promptPlatformService.runPlayground(request.params.id, {
          ...request.body,
          actor: actorFrom(request, request.body.actor),
        })
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({ message: error.message });
    }
  }
);

promptPlatformRouter.get(
  '/prompt-platform/prompts/:id/test-runs',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json({ items: await promptPlatformService.listTestRuns(request.params.id) });
  }
);

promptPlatformRouter.post(
  '/prompt-platform/prompts/:id/feedback-suggestion',
  validate({ params: idParamsSchema, body: promptFeedbackSuggestionBodySchema }),
  async (request, response) => {
    const result = await promptPlatformService.applyFeedbackSuggestion(
      request.params.id,
      request.body.suggestion,
      actorFrom(request, request.body.actor)
    );
    if (!result) {
      response.status(404).json({ message: 'Prompt not found' });
      return;
    }
    response.json(result);
  }
);

export default promptPlatformRouter;
