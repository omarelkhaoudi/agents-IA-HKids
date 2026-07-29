import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { communityManagerService } from '../runtime/community-manager-runtime.js';
import { CommunityManagerRepository } from '../repositories/CommunityManagerRepository.js';
import { databasePool } from '../runtime/database-runtime.js';
import {
  cmCampaignBodySchema,
  cmExportQuerySchema,
  cmGenerateBodySchema,
  cmLibraryBodySchema,
  cmPostBodySchema,
  cmGuidelinesBodySchema,
  idParamsSchema,
} from '../validation/schemas.js';

const communityManagerRouter = Router();
const repository = new CommunityManagerRepository(databasePool);

communityManagerRouter.get('/community-manager/bootstrap', async (_request, response) => {
  const bootstrap = await communityManagerService.getWorkspaceBootstrap();
  response.json(bootstrap);
});

communityManagerRouter.get('/community-manager/dashboard', async (_request, response) => {
  const stats = await repository.getDashboardStats();
  response.json(stats);
});

communityManagerRouter.get('/community-manager/search', async (request, response) => {
  const results = await repository.searchAll(request.query.q || '');
  response.json({ items: results });
});

communityManagerRouter.get('/community-manager/hashtags', async (request, response) => {
  response.json(
    communityManagerService.suggestHashtags({
      theme: request.query.theme || '',
      audience: request.query.audience || '',
      platform: request.query.platform || 'instagram',
    })
  );
});

communityManagerRouter.get('/community-manager/campaigns', async (_request, response) => {
  response.json({ items: await repository.listCampaigns() });
});

communityManagerRouter.post(
  '/community-manager/campaigns',
  validate({ body: cmCampaignBodySchema }),
  async (request, response) => {
    const campaign = await repository.createCampaign(request.body);
    response.status(201).json(campaign);
  }
);

communityManagerRouter.put(
  '/community-manager/campaigns/:id',
  validate({ params: idParamsSchema, body: cmCampaignBodySchema.partial() }),
  async (request, response) => {
    try {
      const campaign = await repository.updateCampaign(request.params.id, request.body);
      response.json(campaign);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update campaign.',
      });
    }
  }
);

communityManagerRouter.delete(
  '/community-manager/campaigns/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json(await repository.deleteCampaign(request.params.id));
  }
);

communityManagerRouter.get('/community-manager/posts', async (request, response) => {
  const items = await repository.listPosts({
    platform: request.query.platform,
    approvalStatus: request.query.approvalStatus,
    campaignId: request.query.campaignId,
    search: request.query.search,
  });
  response.json({ items });
});

communityManagerRouter.post(
  '/community-manager/posts',
  validate({ body: cmPostBodySchema }),
  async (request, response) => {
    const post = await repository.createPost(request.body);
    response.status(201).json(post);
  }
);

communityManagerRouter.put(
  '/community-manager/posts/:id',
  validate({ params: idParamsSchema, body: cmPostBodySchema.partial() }),
  async (request, response) => {
    try {
      const post = await repository.updatePost(request.params.id, request.body);
      response.json(post);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update post.',
      });
    }
  }
);

communityManagerRouter.post(
  '/community-manager/posts/:id/duplicate',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    const existing = await repository.getPost(request.params.id);
    if (!existing) {
      response.status(404).json({ message: 'Post not found.' });
      return;
    }

    const duplicated = await repository.createPost({
      ...existing,
      id: undefined,
      title: `${existing.title} (copy)`,
      approvalStatus: 'draft',
      status: 'draft',
      approvedAt: null,
      approvedBy: null,
    });
    response.status(201).json(duplicated);
  }
);

communityManagerRouter.post(
  '/community-manager/posts/:id/submit-review',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(await communityManagerService.submitForReview(request.params.id));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to submit for review.',
      });
    }
  }
);

communityManagerRouter.post(
  '/community-manager/posts/:id/approve',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await communityManagerService.approvePost(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to approve post.',
      });
    }
  }
);

communityManagerRouter.post(
  '/community-manager/posts/:id/reject',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await communityManagerService.rejectPost(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to reject post.',
      });
    }
  }
);

communityManagerRouter.get(
  '/community-manager/posts/:id/export',
  validate({ params: idParamsSchema, query: cmExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await communityManagerService.exportPost(
        request.params.id,
        request.query.format || 'markdown'
      );
      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export content.',
      });
    }
  }
);

communityManagerRouter.delete(
  '/community-manager/posts/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json(await repository.deletePost(request.params.id));
  }
);

communityManagerRouter.post(
  '/community-manager/generate',
  validate({ body: cmGenerateBodySchema }),
  async (request, response) => {
    try {
      const result = await communityManagerService.generateContent(
        request.body,
        request.user?.id
      );
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to generate content.',
      });
    }
  }
);

communityManagerRouter.get('/community-manager/guidelines', async (_request, response) => {
  response.json({
    guidelines: await repository.getBrandGuidelines(),
  });
});

communityManagerRouter.put(
  '/community-manager/guidelines',
  validate({ body: cmGuidelinesBodySchema }),
  async (request, response) => {
    const guidelines = await repository.upsertBrandGuidelines(request.body);
    response.json({ guidelines });
  }
);

communityManagerRouter.get('/community-manager/library', async (request, response) => {
  response.json({
    items: await repository.listLibraryItems({
      category: request.query.category,
      search: request.query.search,
    }),
  });
});

communityManagerRouter.post(
  '/community-manager/library',
  validate({ body: cmLibraryBodySchema }),
  async (request, response) => {
    const item = await repository.createLibraryItem(request.body);
    response.status(201).json(item);
  }
);

communityManagerRouter.delete(
  '/community-manager/library/:id',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    response.json(await repository.deleteLibraryItem(request.params.id));
  }
);

export default communityManagerRouter;
