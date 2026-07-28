import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentGenerationService } from '../src/services/documents/DocumentGenerationService.js';
import { DocumentRenderer } from '../src/services/documents/DocumentRenderer.js';
import { DocumentValidator } from '../src/services/documents/DocumentValidator.js';
import { TemplateEngine } from '../src/services/documents/TemplateEngine.js';
import { VariableResolver } from '../src/services/documents/VariableResolver.js';

const service = new DocumentGenerationService({
  templateEngine: new TemplateEngine(),
  variableResolver: new VariableResolver(),
  documentValidator: new DocumentValidator(),
  documentRenderer: new DocumentRenderer(),
});

const baseInput = {
  assistantResponse: 'Prepare a professional quotation for transport support and onboarding assistance.',
  documentType: 'quotation',
  variables: {
    reference: 'QT-2026-101',
    subtotal: '100',
    tax: '20',
    total: '120',
    signature: 'Sara El Idrissi',
  },
  companyProfile: {
    companyName: 'H-Kids',
    companyAddress: 'Casablanca',
    contactName: 'Sara El Idrissi',
  },
  customerProfile: {
    clientName: 'Greenfield Nursery',
    address: 'Casablanca',
  },
  language: 'English',
};

test('TemplateEngine loads reusable templates', () => {
  const template = new TemplateEngine().loadTemplate('quotation');
  assert.equal(template.title, 'Quotation');
  assert.ok(template.sections.length > 0);
});

test('VariableResolver resolves placeholders', () => {
  const template = new TemplateEngine().loadTemplate('quotation');
  const result = new VariableResolver().resolve({
    template,
    assistantResponse: baseInput.assistantResponse,
    variables: baseInput.variables,
    companyProfile: baseInput.companyProfile,
    customerProfile: baseInput.customerProfile,
    language: baseInput.language,
  });

  assert.equal(result.resolvedVariables.company_name, 'H-Kids');
  assert.ok(result.resolvedSections[0].content.includes('H-Kids'));
});

test('DocumentValidator detects invalid totals', () => {
  const generated = service.generateDocument({
    ...baseInput,
    variables: {
      ...baseInput.variables,
      subtotal: '100',
      tax: '10',
      total: '500',
    },
  });

  assert.ok(generated.validationWarnings.some((warning) => warning.includes('totals')));
});

test('DocumentGenerationService returns structured document and preview', () => {
  const generated = service.generateDocument(baseInput);

  assert.equal(generated.structuredDocument.type, 'quotation');
  assert.ok(generated.renderedPreview.includes('<html>'));
  assert.deepEqual(generated.availableExportFormats, ['pdf', 'docx', 'html']);
});
