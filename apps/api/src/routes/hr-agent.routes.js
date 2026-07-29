import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { hrAgentService } from '../runtime/hr-agent-runtime.js';
import { HrAgentRepository } from '../repositories/HrAgentRepository.js';
import { databasePool } from '../runtime/database-runtime.js';
import {
  hrAbsenceBodySchema,
  hrCandidateBodySchema,
  hrDecideLeaveBodySchema,
  hrEmployeeBodySchema,
  hrExportQuerySchema,
  hrGenerateBodySchema,
  hrGenerateJobBodySchema,
  hrJobDescriptionBodySchema,
  hrLeaveBodySchema,
  hrLeaveRecommendBodySchema,
  hrDocumentBodySchema,
  idParamsSchema,
} from '../validation/schemas.js';

const hrAgentRouter = Router();
const repository = new HrAgentRepository(databasePool);

hrAgentRouter.get('/hr-agent/bootstrap', async (_request, response) => {
  response.json(await hrAgentService.getWorkspaceBootstrap());
});

hrAgentRouter.get('/hr-agent/dashboard', async (_request, response) => {
  response.json(await repository.getDashboardStats());
});

hrAgentRouter.get('/hr-agent/analytics', async (_request, response) => {
  const [employees, candidates, leave, documents, absences] = await Promise.all([
    repository.listEmployees(),
    repository.listCandidates(),
    repository.listLeaveRequests(),
    repository.listDocuments(),
    repository.listAbsences(),
  ]);
  response.json(hrAgentService.getAnalytics({ employees, candidates, leave, documents, absences }));
});

hrAgentRouter.get('/hr-agent/search', async (request, response) => {
  response.json({ items: await repository.searchAll(request.query.q || '') });
});

hrAgentRouter.get('/hr-agent/employees', async (request, response) => {
  response.json({
    items: await repository.listEmployees({
      status: request.query.status,
      department: request.query.department,
      search: request.query.search,
      sort: request.query.sort,
    }),
  });
});

hrAgentRouter.post(
  '/hr-agent/employees',
  validate({ body: hrEmployeeBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createEmployee(request.body));
  }
);

hrAgentRouter.put(
  '/hr-agent/employees/:id',
  validate({ params: idParamsSchema, body: hrEmployeeBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await repository.updateEmployee(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update employee.',
      });
    }
  }
);

hrAgentRouter.get('/hr-agent/candidates', async (request, response) => {
  response.json({
    items: await repository.listCandidates({
      stage: request.query.stage,
      search: request.query.search,
    }),
  });
});

hrAgentRouter.post(
  '/hr-agent/candidates',
  validate({ body: hrCandidateBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createCandidate(request.body));
  }
);

hrAgentRouter.put(
  '/hr-agent/candidates/:id',
  validate({ params: idParamsSchema, body: hrCandidateBodySchema.partial() }),
  async (request, response) => {
    try {
      response.json(await repository.updateCandidate(request.params.id, request.body));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to update candidate.',
      });
    }
  }
);

hrAgentRouter.get('/hr-agent/job-descriptions', async (_request, response) => {
  response.json({ items: await repository.listJobDescriptions() });
});

hrAgentRouter.post(
  '/hr-agent/job-descriptions',
  validate({ body: hrJobDescriptionBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createJobDescription(request.body));
  }
);

hrAgentRouter.post(
  '/hr-agent/job-descriptions/:id/submit-review',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(await hrAgentService.submitJobReview(request.params.id));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to submit job description.',
      });
    }
  }
);

hrAgentRouter.post(
  '/hr-agent/job-descriptions/:id/approve',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await hrAgentService.approveJob(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to approve job description.',
      });
    }
  }
);

hrAgentRouter.post(
  '/hr-agent/job-descriptions/:id/reject',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await hrAgentService.rejectJob(
          request.params.id,
          request.user?.email || request.user?.id || 'reviewer'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to reject job description.',
      });
    }
  }
);

hrAgentRouter.get('/hr-agent/leave-requests', async (request, response) => {
  response.json({
    items: await repository.listLeaveRequests({ status: request.query.status }),
  });
});

hrAgentRouter.post(
  '/hr-agent/leave-requests',
  validate({ body: hrLeaveBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createLeaveRequest(request.body));
  }
);

hrAgentRouter.post(
  '/hr-agent/leave-requests/recommend',
  validate({ body: hrLeaveRecommendBodySchema }),
  async (request, response) => {
    try {
      const result = await hrAgentService.recommendLeave(request.body, request.user?.id);
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to recommend leave.',
      });
    }
  }
);

hrAgentRouter.post(
  '/hr-agent/leave-requests/:id/decide',
  validate({ params: idParamsSchema, body: hrDecideLeaveBodySchema }),
  async (request, response) => {
    try {
      response.json(
        await hrAgentService.decideLeave(
          request.params.id,
          request.body.decision,
          request.user?.email || request.user?.id || 'manager'
        )
      );
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to decide leave.',
      });
    }
  }
);

hrAgentRouter.get('/hr-agent/absences', async (_request, response) => {
  response.json({ items: await repository.listAbsences() });
});

hrAgentRouter.post(
  '/hr-agent/absences',
  validate({ body: hrAbsenceBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createAbsence(request.body));
  }
);

hrAgentRouter.get('/hr-agent/documents', async (request, response) => {
  response.json({
    items: await repository.listDocuments({
      approvalStatus: request.query.approvalStatus,
      documentType: request.query.documentType,
    }),
  });
});

hrAgentRouter.post(
  '/hr-agent/documents',
  validate({ body: hrDocumentBodySchema }),
  async (request, response) => {
    response.status(201).json(await repository.createDocument(request.body));
  }
);

hrAgentRouter.post(
  '/hr-agent/documents/:id/submit-review',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(await hrAgentService.submitDocumentReview(request.params.id));
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to submit document.',
      });
    }
  }
);

hrAgentRouter.post(
  '/hr-agent/documents/:id/approve',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await hrAgentService.approveDocument(
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

hrAgentRouter.post(
  '/hr-agent/documents/:id/reject',
  validate({ params: idParamsSchema }),
  async (request, response) => {
    try {
      response.json(
        await hrAgentService.rejectDocument(
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

hrAgentRouter.get(
  '/hr-agent/documents/:id/export',
  validate({ params: idParamsSchema, query: hrExportQuerySchema }),
  async (request, response) => {
    try {
      const exported = await hrAgentService.exportDocument(
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

hrAgentRouter.post(
  '/hr-agent/generate',
  validate({ body: hrGenerateBodySchema }),
  async (request, response) => {
    try {
      const result = await hrAgentService.generateDocument(request.body, request.user?.id);
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to generate document.',
      });
    }
  }
);

hrAgentRouter.post(
  '/hr-agent/generate-job-description',
  validate({ body: hrGenerateJobBodySchema }),
  async (request, response) => {
    try {
      const result = await hrAgentService.generateJobDescription(request.body, request.user?.id);
      response.status(201).json(result);
    } catch (error) {
      response.status(error.statusCode || 400).json({
        message: error instanceof Error ? error.message : 'Unable to generate job description.',
      });
    }
  }
);

export default hrAgentRouter;
