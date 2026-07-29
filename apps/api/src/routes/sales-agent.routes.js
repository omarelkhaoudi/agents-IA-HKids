import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { salesAgentService } from '../runtime/sales-agent-runtime.js';
import { SalesAgentRepository } from '../repositories/SalesAgentRepository.js';
import { databasePool } from '../runtime/database-runtime.js';
import {
  idParamsSchema,
  salesCompanyBodySchema,
  salesDealBodySchema,
  salesDocumentBodySchema,
  salesExportQuerySchema,
  salesGenerateBodySchema,
  salesGenerateQuotationBodySchema,
  salesMoveDealBodySchema,
  salesProductBodySchema,
  salesProspectBodySchema,
  salesQuotationBodySchema,
} from '../validation/schemas.js';

const salesAgentRouter = Router();
const repository = new SalesAgentRepository(databasePool);

salesAgentRouter.get('/sales-agent/bootstrap', async (_request, response) => {
  response.json(await salesAgentService.getWorkspaceBootstrap());
});

salesAgentRouter.get('/sales-agent/dashboard', async (_request, response) => {
  response.json(await repository.getDashboardStats());
});

salesAgentRouter.get('/sales-agent/analytics', async (_request, response) => {
  const [deals, quotations, documents, products] = await Promise.all([
    repository.listDeals(),
    repository.listQuotations(),
    repository.listDocuments(),
    repository.listProducts(),
  ]);
  response.json(salesAgentService.getAnalytics({ deals, quotations, documents, products }));
});

salesAgentRouter.get('/sales-agent/search', async (request, response) => {
  response.json({ items: await repository.searchAll(request.query.q || '') });
});

salesAgentRouter.get('/sales-agent/companies', async (_request, response) => {
  response.json({ items: await repository.listCompanies() });
});

salesAgentRouter.post(
  '/sales-agent/companies',
  validate({ body: salesCompanyBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createCompany(request.body));
  }
);

salesAgentRouter.get('/sales-agent/prospects', async (request, response) => {
  response.json({
    items: await repository.listProspects({
      status: request.query.status,
      search: request.query.search,
    }),
  });
});

salesAgentRouter.post(
  '/sales-agent/prospects',
  validate({ body: salesProspectBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createProspect(request.body));
  }
);

salesAgentRouter.put(
  '/sales-agent/prospects/:id',
  validate({ params: idParamsSchema, body: salesProspectBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await repository.updateProspect(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update prospect.',
      });
    }
  }
);

salesAgentRouter.get('/sales-agent/products', async (_request, response) => {
  response.json({ items: await repository.listProducts() });
});

salesAgentRouter.post(
  '/sales-agent/products',
  validate({ body: salesProductBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createProduct(request.body));
  }
);

salesAgentRouter.get('/sales-agent/deals', async (_request, response) => {
  response.json({ items: await repository.listDeals() });
});

salesAgentRouter.post(
  '/sales-agent/deals',
  validate({ body: salesDealBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createDeal(request.body));
  }
);

salesAgentRouter.put(
  '/sales-agent/deals/:id',
  validate({ params: idParamsSchema, body: salesDealBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await repository.updateDeal(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update deal.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/deals/:id/move',
  validate({ params: idParamsSchema, body: salesMoveDealBodySchema }),
  async (request, response) => {
    try {
      response.json(await salesAgentService.moveDealStage(request.params.id, request.body.stage));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to move deal.',
      });
    }
  }
);

salesAgentRouter.get('/sales-agent/quotations', async (request, response) => {
  response.json({
    items: await repository.listQuotations({
      approvalStatus: request.query.approvalStatus,
    }),
  });
});

salesAgentRouter.post(
  '/sales-agent/quotations',
  validate({ body: salesQuotationBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createQuotation(request.body));
  }
);

salesAgentRouter.put(
  '/sales-agent/quotations/:id',
  validate({ params: idParamsSchema, body: salesQuotationBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await repository.updateQuotation(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update quotation.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/quotations/:id/submit-review',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(await salesAgentService.submitQuotationReview(request.params.id));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to submit quotation.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/quotations/:id/approve',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await salesAgentService.approveQuotation(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to approve quotation.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/quotations/:id/reject',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await salesAgentService.rejectQuotation(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to reject quotation.',
      });
    }
  }
);

salesAgentRouter.get(
  '/sales-agent/quotations/:id/export',
  validate({ params: idParamsSchema, query: salesExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await salesAgentService.exportQuotation(
        request.params.id,
        request.query.format || 'markdown'
      );
      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export quotation.',
      });
    }
  }
);

salesAgentRouter.get('/sales-agent/documents', async (request, response) => {
  response.json({
    items: await repository.listDocuments({
      approvalStatus: request.query.approvalStatus,
    }),
  });
});

salesAgentRouter.post(
  '/sales-agent/documents',
  validate({ body: salesDocumentBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createDocument(request.body));
  }
);

salesAgentRouter.post(
  '/sales-agent/documents/:id/submit-review',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(await salesAgentService.submitDocumentReview(request.params.id));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to submit document.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/documents/:id/approve',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await salesAgentService.approveDocument(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to approve document.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/documents/:id/reject',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await salesAgentService.rejectDocument(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to reject document.',
      });
    }
  }
);

salesAgentRouter.get(
  '/sales-agent/documents/:id/export',
  validate({ params: idParamsSchema, query: salesExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await salesAgentService.exportDocument(
        request.params.id,
        request.query.format || 'markdown'
      );
      response.setHeader('Content-Type', exported.contentType);
      response.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
      response.send(exported.body);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to export document.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/generate',
  validate({ body: salesGenerateBodySchema }),
  async (request, response) => {
    try {
      const result = await salesAgentService.generateCommercialDocument(
        request.body,
        request.user?.id
      );
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to generate document.',
      });
    }
  }
);

salesAgentRouter.post(
  '/sales-agent/generate-quotation',
  validate({ body: salesGenerateQuotationBodySchema }),
  async (request, response) => {
    try {
      const result = await salesAgentService.generateQuotation(request.body, request.user?.id);
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to generate quotation.',
      });
    }
  }
);

export default salesAgentRouter;
