import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { persistenceService } from '../runtime/assistant-runtime.js';
import { documentExporters, documentGenerationService } from '../runtime/document-runtime.js';
import { workflowEngine } from '../runtime/workflow-runtime.js';
import { workflowStates } from '../services/workflows/WorkflowRules.js';
import {
  approveGeneratedDocumentBodySchema,
  conversationDocumentParamsSchema,
  conversationIdParamsSchema,
  createGeneratedDocumentBodySchema,
  exportDocumentQuerySchema,
  updateGeneratedDocumentBodySchema,
} from '../validation/schemas.js';

const generatedDocumentsRouter = Router();

function serializeDocument(document) {
  return {
    id: document.id,
    agentCode: document.agent_code,
    approved: document.approved,
    structuredDocument: document.structured_document,
    resolvedVariables: document.resolved_variables,
    renderedPreview: document.rendered_preview,
    validationWarnings: document.validation_warnings,
    availableExportFormats: document.available_export_formats,
  };
}

generatedDocumentsRouter.post(
  '/conversations/:id/generated-documents',
  validate({ params: conversationIdParamsSchema, body: createGeneratedDocumentBodySchema }),
  async (request, response) => {
  const session = await persistenceService.sessionRepository.getSessionById(request.params.id);

  if (!session) {
    response.status(404).json({ message: 'Conversation session not found' });
    return;
  }

  const existingReferences = (session.generatedDocuments || []).map(
    (document) => document.structuredDocument.reference
  );

  const generatedDocument = documentGenerationService.generateDocument({
    assistantResponse: request.body.assistantResponse,
    documentType: request.body.documentType,
    variables: request.body.variables || {},
    companyProfile: request.body.companyProfile,
    customerProfile: request.body.customerProfile,
    language: request.body.language || 'English',
    existingReferences,
  });

  const record = {
    id: generatedDocument.structuredDocument.id,
    agentCode: session.agentCode,
    approved: false,
    conversationId: request.params.id,
    documentType: request.body.documentType,
    reference: generatedDocument.structuredDocument.reference,
    version: 1,
    status: 'draft',
    createdBy: 'system',
    input: {
      assistantResponse: request.body.assistantResponse,
      documentType: request.body.documentType,
      variables: request.body.variables || {},
      companyProfile: request.body.companyProfile,
      customerProfile: request.body.customerProfile,
      language: request.body.language || 'English',
    },
    ...generatedDocument,
  };

  const createdDocument = await persistenceService.generatedDocumentRepository.create(record);
  await workflowEngine.createWorkflow({
    conversationId: request.params.id,
    documentId: createdDocument.id,
    reviewers: ['Administrator'],
  });
  response.status(201).json(serializeDocument(createdDocument));
  }
);

generatedDocumentsRouter.put(
  '/conversations/:id/generated-documents/:documentId',
  validate({ params: conversationDocumentParamsSchema, body: updateGeneratedDocumentBodySchema }),
  async (request, response) => {
  const session = await persistenceService.sessionRepository.getSessionById(request.params.id);

  if (!session) {
    response.status(404).json({ message: 'Conversation session not found' });
    return;
  }

  const existingDocument = await persistenceService.generatedDocumentRepository.getById(
    request.params.documentId
  );

  if (!existingDocument || existingDocument.conversation_id !== request.params.id) {
    response.status(404).json({ message: 'Generated document not found' });
    return;
  }

  const regenerated = documentGenerationService.generateDocument({
    assistantResponse: existingDocument.input.assistantResponse,
    documentType: existingDocument.input.documentType,
    variables: request.body.variables || existingDocument.input.variables,
    companyProfile: request.body.companyProfile || existingDocument.input.companyProfile,
    customerProfile: request.body.customerProfile || existingDocument.input.customerProfile,
    language: request.body.language || existingDocument.input.language,
    existingReferences: (session.generatedDocuments || [])
      .filter((document) => document.id !== request.params.documentId)
      .map((document) => document.structuredDocument.reference),
  });

  const updatedDocument = await persistenceService.generatedDocumentRepository.update(
    request.params.documentId,
    {
      conversationId: request.params.id,
      agentCode: session.agentCode,
      structuredDocument: {
        ...regenerated.structuredDocument,
        id: existingDocument.structured_document.id,
      },
      resolvedVariables: regenerated.resolvedVariables,
      renderedPreview: regenerated.renderedPreview,
      validationWarnings: regenerated.validationWarnings,
      availableExportFormats: regenerated.availableExportFormats,
      approved: false,
      status: 'draft',
      version: existingDocument.version + 1,
      input: {
        ...existingDocument.input,
        variables: request.body.variables || existingDocument.input.variables,
        companyProfile: request.body.companyProfile || existingDocument.input.companyProfile,
        customerProfile: request.body.customerProfile || existingDocument.input.customerProfile,
        language: request.body.language || existingDocument.input.language,
      },
      metadata: existingDocument.metadata || {},
    }
  );

  response.json(serializeDocument(updatedDocument));
  }
);

generatedDocumentsRouter.post(
  '/conversations/:id/generated-documents/:documentId/approve',
  validate({ params: conversationDocumentParamsSchema, body: approveGeneratedDocumentBodySchema }),
  async (request, response) => {
    const existingDocument = await persistenceService.generatedDocumentRepository.getById(
      request.params.documentId
    );

    if (!existingDocument || existingDocument.conversation_id !== request.params.id) {
      response.status(404).json({ message: 'Conversation session not found' });
      return;
    }

    const currentWorkflow = await workflowEngine.getWorkflowByDocumentId(request.params.documentId);

    if (currentWorkflow?.currentState === workflowStates.draft) {
      await workflowEngine.transition({
        documentId: request.params.documentId,
        actor: request.body.actor || 'Administrator',
        nextState: workflowStates.pendingReview,
        comment: 'Submitted for review.',
      });
    }

    await workflowEngine.transition({
      documentId: request.params.documentId,
      actor: request.body.actor || 'Administrator',
      nextState: workflowStates.approved,
      comment: request.body.comment || 'Document approved by reviewer.',
    });

    const updatedDocument = await persistenceService.generatedDocumentRepository.update(
      request.params.documentId,
      {
        agentCode: existingDocument.agent_code,
        structuredDocument: existingDocument.structured_document,
        resolvedVariables: existingDocument.resolved_variables,
        renderedPreview: existingDocument.rendered_preview,
        validationWarnings: existingDocument.validation_warnings,
        availableExportFormats: existingDocument.available_export_formats,
        approved: true,
        status: 'approved',
        version: existingDocument.version,
        approvedBy: 'system',
        approvedAt: new Date().toISOString(),
        input: existingDocument.input,
        metadata: existingDocument.metadata,
      }
    );

    response.json(serializeDocument(updatedDocument));
  }
);

generatedDocumentsRouter.get(
  '/conversations/:id/generated-documents/:documentId/export',
  validate({ params: conversationDocumentParamsSchema, query: exportDocumentQuerySchema }),
  async (request, response) => {
    const existingDocument = await persistenceService.generatedDocumentRepository.getById(
      request.params.documentId
    );

    if (!existingDocument || existingDocument.conversation_id !== request.params.id) {
      response.status(404).json({ message: 'Generated document not found' });
      return;
    }

    if (!existingDocument.approved) {
      response.status(400).json({ message: 'Document approval is required before export.' });
      return;
    }

    const workflow = await workflowEngine.getWorkflowByDocumentId(request.params.documentId);

    if (
      !workflow ||
      ![workflowStates.approved, workflowStates.exported].includes(workflow.currentState)
    ) {
      response.status(400).json({ message: 'Workflow state must be Approved before export.' });
      return;
    }

    const format = request.query.format;
    const exporter = documentExporters[format];

    if (!exporter) {
      response.status(400).json({ message: 'Unsupported export format.' });
      return;
    }

    const exported = await exporter.export({
      id: existingDocument.id,
      approved: existingDocument.approved,
      structuredDocument: existingDocument.structured_document,
      resolvedVariables: existingDocument.resolved_variables,
      renderedPreview: existingDocument.rendered_preview,
      validationWarnings: existingDocument.validation_warnings,
      availableExportFormats: existingDocument.available_export_formats,
    });

    response.setHeader('Content-Type', exported.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
    if (workflow.currentState === workflowStates.approved) {
      await workflowEngine.transition({
        documentId: request.params.documentId,
        actor: 'system',
        nextState: workflowStates.exported,
        comment: `Document exported as ${format}.`,
      });
    }
    response.send(exported.content);
  }
);

export default generatedDocumentsRouter;
