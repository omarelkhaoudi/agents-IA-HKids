export class DocumentGenerationService {
  constructor({ templateEngine, variableResolver, documentValidator, documentRenderer }) {
    this.templateEngine = templateEngine;
    this.variableResolver = variableResolver;
    this.documentValidator = documentValidator;
    this.documentRenderer = documentRenderer;
  }

  generateDocument({
    assistantResponse,
    documentType,
    variables,
    companyProfile,
    customerProfile,
    language,
    existingReferences = [],
  }) {
    const template = this.templateEngine.loadTemplate(documentType);
    const { resolvedVariables, resolvedSections, missingVariables } = this.variableResolver.resolve({
      template,
      assistantResponse,
      variables,
      companyProfile,
      customerProfile,
      language,
    });

    const structuredDocument = {
      id: `generated-${Date.now()}`,
      type: documentType,
      title: template.title,
      language,
      reference: resolvedVariables.reference,
      sections: resolvedSections,
      variables: resolvedVariables,
      companyProfile,
      customerProfile,
      assistantResponse,
      approved: false,
      createdAt: new Date().toISOString(),
    };

    const validationWarnings = this.documentValidator.validate({
      structuredDocument,
      missingVariables,
      existingReferences,
    });

    const renderedPreview = this.documentRenderer.render({
      structuredDocument,
      companyProfile,
    });

    return {
      structuredDocument,
      resolvedVariables,
      renderedPreview,
      validationWarnings,
      availableExportFormats: ['pdf', 'docx', 'html'],
    };
  }
}
