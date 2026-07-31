import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { workflowEngine } from '../runtime/workflow-runtime.js';
import {
  conversationDocumentParamsSchema,
  idParamsSchema,
  workflowApprovalDecisionBodySchema,
  workflowCompareQuerySchema,
  workflowDefinitionBodySchema,
  workflowDefinitionPatchSchema,
  workflowDelegationBodySchema,
  workflowEscalationBodySchema,
  workflowImportBodySchema,
  workflowSimulationBodySchema,
  workflowTransitionBodySchema,
  workflowVersionParamsSchema,
} from '../validation/schemas.js';

const workflowRouter = Router();

function actorFromRequest(request) {
  return request.user?.email || request.user?.id || 'workflow-admin';
}

function sendError(response, error, fallback = 'Workflow operation failed.') {
  response.status(error.statusCode || 400).json({
    message: error instanceof Error ? error.message : fallback,
  });
}

workflowRouter.get(
  '/conversations/:id/generated-documents/:documentId/workflow',
  validate({ params: conversationDocumentParamsSchema }),
  async (request, response) => {
    const workflow = await workflowEngine.getWorkflowByDocumentId(request.params.documentId);

    if (!workflow) {
      response.status(404).json({ message: 'Workflow not found.' });
      return;
    }

    response.json(workflow);
  }
);

workflowRouter.get('/workflows', async (request, response) => {
  response.json({
    items: await workflowEngine.listWorkflows({
      state: request.query.state,
      subjectType: request.query.subjectType,
      agentCode: request.query.agentCode,
      priority: request.query.priority,
      limit: request.query.limit,
    }),
  });
});

workflowRouter.get('/workflows/definitions', async (request, response) => {
  response.json({
    items: await workflowEngine.listDefinitions({
      status: request.query.status,
      category: request.query.category,
      search: request.query.search,
      limit: request.query.limit,
    }),
  });
});

workflowRouter.post(
  '/workflows',
  validate({ body: workflowDefinitionBodySchema }),
  async (request, response) => {
    try {
      response.status(201).json(await workflowEngine.createDefinition(request.body, actorFromRequest(request)));
    } catch (error) {
      sendError(response, error, 'Unable to create workflow definition.');
    }
  }
);

workflowRouter.get('/workflows/templates', async (request, response) => {
  response.json({ items: await workflowEngine.listTemplates({ category: request.query.category }) });
});

workflowRouter.get('/workflows/policies', async (request, response) => {
  response.json({ items: await workflowEngine.listPolicies({ category: request.query.category }) });
});

workflowRouter.get('/workflows/history', async (request, response) => {
  const dashboard = await workflowEngine.getDashboard({ days: request.query.days });
  response.json({ items: dashboard.approvalHistory });
});

workflowRouter.post(
  '/workflows/import',
  validate({ body: workflowImportBodySchema }),
  async (request, response) => {
    try {
      response.status(201).json(await workflowEngine.importDefinition(request.body, actorFromRequest(request)));
    } catch (error) {
      sendError(response, error, 'Unable to import workflow.');
    }
  }
);

workflowRouter.post(
  '/workflows/simulation',
  validate({ body: workflowSimulationBodySchema }),
  async (request, response) => {
    response.json(await workflowEngine.simulateWorkflow(request.body));
  }
);

workflowRouter.get('/workflows/analytics', async (request, response) => {
  response.json(await workflowEngine.getAnalytics({ days: request.query.days }));
});

workflowRouter.get('/workflows/dashboard', async (request, response) => {
  response.json(await workflowEngine.getDashboard({ days: request.query.days }));
});

workflowRouter.get('/workflows/approvals', async (request, response) => {
  response.json({
    items: await workflowEngine.listApprovals({
      workflowInstanceId: request.query.workflowInstanceId,
      status: request.query.status,
      reviewer: request.query.reviewer,
    }),
  });
});

workflowRouter.post(
  '/workflows/approvals/:id/decision',
  validate({ params: idParamsSchema, body: workflowApprovalDecisionBodySchema }),
  async (request, response) => {
    response.json(
      await workflowEngine.decideApproval(request.params.id, {
        decision: request.body.decision,
        actor: request.body.actor || actorFromRequest(request),
        comment: request.body.comment || '',
      })
    );
  }
);

workflowRouter.get('/workflows/delegations', async (request, response) => {
  response.json({
    items: await workflowEngine.listDelegations({
      status: request.query.status,
      delegator: request.query.delegator,
    }),
  });
});

workflowRouter.post(
  '/workflows/delegations',
  validate({ body: workflowDelegationBodySchema }),
  async (request, response) => {
    response.status(201).json(await workflowEngine.createDelegation(request.body, actorFromRequest(request)));
  }
);

workflowRouter.get('/workflows/escalations', async (request, response) => {
  response.json({
    items: await workflowEngine.listEscalations({
      status: request.query.status,
      workflowInstanceId: request.query.workflowInstanceId,
    }),
  });
});

workflowRouter.post(
  '/workflows/escalations',
  validate({ body: workflowEscalationBodySchema }),
  async (request, response) => {
    response.status(201).json(await workflowEngine.createEscalation(request.body));
  }
);

workflowRouter.get('/workflows/sla', async (request, response) => {
  response.json({
    events: await workflowEngine.listSlaEvents({
      workflowInstanceId: request.query.workflowInstanceId,
      eventType: request.query.eventType,
    }),
  });
});

workflowRouter.post('/workflows/sla/check', async (_request, response) => {
  response.json(await workflowEngine.checkSla());
});

workflowRouter.get('/workflows/evaluation', async (_request, response) => {
  response.json(await workflowEngine.getEvaluationMetrics());
});

workflowRouter.get('/workflows/versioning/:id', validate({ params: idParamsSchema }), async (request, response) => {
  response.json({ items: await workflowEngine.listDefinitionVersions(request.params.id) });
});

workflowRouter.get(
  '/workflows/versioning/:id/compare',
  validate({ params: idParamsSchema, query: workflowCompareQuerySchema }),
  async (request, response) => {
    response.json(
      await workflowEngine.compareDefinitionVersions(
        request.params.id,
        request.query.left,
        request.query.right
      )
    );
  }
);

workflowRouter.post(
  '/workflows/versioning/:id/rollback/:version',
  validate({ params: workflowVersionParamsSchema }),
  async (request, response) => {
    response.json(
      await workflowEngine.rollbackDefinition(
        request.params.id,
        request.params.version,
        actorFromRequest(request)
      )
    );
  }
);

workflowRouter.get('/workflows/:id', validate({ params: idParamsSchema }), async (request, response) => {
  const workflow = await workflowEngine.getDefinition(request.params.id);
  if (!workflow) {
    response.status(404).json({ message: 'Workflow definition not found.' });
    return;
  }
  response.json(workflow);
});

workflowRouter.put(
  '/workflows/:id',
  validate({ params: idParamsSchema, body: workflowDefinitionPatchSchema }),
  async (request, response) => {
    try {
      response.json(await workflowEngine.updateDefinition(request.params.id, request.body, actorFromRequest(request)));
    } catch (error) {
      sendError(response, error, 'Unable to update workflow definition.');
    }
  }
);

workflowRouter.post('/workflows/:id/publish', validate({ params: idParamsSchema }), async (request, response) => {
  response.json(await workflowEngine.publishDefinition(request.params.id, actorFromRequest(request)));
});

workflowRouter.post('/workflows/:id/archive', validate({ params: idParamsSchema }), async (request, response) => {
  response.json(await workflowEngine.archiveDefinition(request.params.id, actorFromRequest(request)));
});

workflowRouter.post('/workflows/:id/deprecate', validate({ params: idParamsSchema }), async (request, response) => {
  response.json(await workflowEngine.deprecateDefinition(request.params.id, actorFromRequest(request)));
});

workflowRouter.post('/workflows/:id/clone', validate({ params: idParamsSchema }), async (request, response) => {
  response.status(201).json(await workflowEngine.cloneDefinition(request.params.id, actorFromRequest(request)));
});

workflowRouter.get('/workflows/:id/export', validate({ params: idParamsSchema }), async (request, response) => {
  response.json(await workflowEngine.exportDefinition(request.params.id));
});

workflowRouter.post(
  '/workflows/:id/simulation',
  validate({ params: idParamsSchema, body: workflowSimulationBodySchema.partial() }),
  async (request, response) => {
    response.json(
      await workflowEngine.simulateWorkflow({
        ...request.body,
        workflowDefinitionId: request.params.id,
      })
    );
  }
);

workflowRouter.post(
  '/conversations/:id/generated-documents/:documentId/workflow/transition',
  validate({ params: conversationDocumentParamsSchema, body: workflowTransitionBodySchema }),
  async (request, response) => {
    try {
      const workflow = await workflowEngine.transition({
        documentId: request.params.documentId,
        actor: request.body.actor || 'Administrator',
        nextState: request.body.nextState,
        comment: request.body.comment || '',
      });

      response.json(workflow);
    } catch (error) {
      response.status(400).json({
        message: error instanceof Error ? error.message : 'Unable to transition workflow.',
      });
    }
  }
);

export default workflowRouter;
