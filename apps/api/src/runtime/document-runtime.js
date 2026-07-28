import { DocxExporter } from '../services/documents/DocxExporter.js';
import { DocumentGenerationService } from '../services/documents/DocumentGenerationService.js';
import { DocumentRenderer } from '../services/documents/DocumentRenderer.js';
import { DocumentValidator } from '../services/documents/DocumentValidator.js';
import { HtmlExporter } from '../services/documents/HtmlExporter.js';
import { PdfExporter } from '../services/documents/PdfExporter.js';
import { TemplateEngine } from '../services/documents/TemplateEngine.js';
import { VariableResolver } from '../services/documents/VariableResolver.js';

const templateEngine = new TemplateEngine();
const variableResolver = new VariableResolver();
const documentValidator = new DocumentValidator();
const documentRenderer = new DocumentRenderer();

export const documentGenerationService = new DocumentGenerationService({
  templateEngine,
  variableResolver,
  documentValidator,
  documentRenderer,
});

export const documentExporters = {
  pdf: new PdfExporter(),
  docx: new DocxExporter(),
  html: new HtmlExporter(),
};
