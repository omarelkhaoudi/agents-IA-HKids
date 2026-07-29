import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(120);
const shortText = z.string().trim().min(1).max(500);
const mediumText = z.string().trim().max(5000);
const longText = z.string().trim().max(50000);
const recordOfStrings = z.record(z.string().max(2000)).optional();

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().trim().min(20).max(512),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().trim().min(20).max(512).optional(),
});

const profileSchema = z.object({
  companyName: z.string().trim().max(255).optional(),
  companyAddress: z.string().trim().max(1000).optional(),
  contactName: z.string().trim().max(255).optional(),
  clientName: z.string().trim().max(255).optional(),
  address: z.string().trim().max(1000).optional(),
});

const documentTypeSchema = z.enum([
  'quotation',
  'invoice',
  'purchase-order',
  'delivery-note',
  'administrative-letter',
  'commercial-letter',
  'internal-memo',
  'meeting-report',
  'certificate',
  'email',
]);

export const createConversationBodySchema = z.object({
  title: shortText,
  agentCode: shortText,
  selectedPromptId: idSchema,
  selectedDocumentIds: z.array(idSchema).max(100).default([]),
  currentContext: z.record(z.unknown()).optional(),
  model: shortText,
  provider: shortText,
});

export const sendMessageBodySchema = z.object({
  provider: shortText,
  model: shortText,
  agentCode: shortText,
  selectedPromptId: idSchema,
  selectedDocumentIds: z.array(idSchema).max(100).default([]),
  currentContext: z.record(z.unknown()).optional(),
  message: longText.min(1),
});

export const conversationIdParamsSchema = z.object({
  id: idSchema,
});

export const conversationDocumentParamsSchema = z.object({
  id: idSchema,
  documentId: idSchema,
});

export const createGeneratedDocumentBodySchema = z.object({
  assistantResponse: longText.min(1),
  documentType: documentTypeSchema,
  variables: recordOfStrings,
  companyProfile: profileSchema.optional(),
  customerProfile: profileSchema.optional(),
  language: z.string().trim().max(50).optional(),
});

export const updateGeneratedDocumentBodySchema = z.object({
  variables: recordOfStrings,
  companyProfile: profileSchema.optional(),
  customerProfile: profileSchema.optional(),
  language: z.string().trim().max(50).optional(),
});

export const approveGeneratedDocumentBodySchema = z.object({
  actor: z.string().trim().max(255).optional(),
  comment: mediumText.optional(),
});

export const exportDocumentQuerySchema = z.object({
  format: z.enum(['pdf', 'docx', 'html']),
});

export const workflowTransitionBodySchema = z.object({
  nextState: z.enum([
    'Draft',
    'Pending Review',
    'Needs Changes',
    'Approved',
    'Rejected',
    'Exported',
    'Archived',
  ]),
  actor: z.string().trim().max(255).optional(),
  comment: mediumText.optional(),
});

export const feedbackBodySchema = z.object({
  conversationId: idSchema,
  messageId: idSchema.optional(),
  documentId: idSchema,
  agentCode: shortText,
  originalText: longText,
  correctedText: longText,
  feedbackType: z.enum(['Accept', 'Minor Edit', 'Major Edit', 'Rejected', 'Manual Rewrite']),
  rating: z.number().int().min(1).max(5),
  comment: mediumText.optional(),
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const documentBodySchema = z.object({
  title: shortText,
  category: shortText,
  description: mediumText.optional(),
  tags: z.array(z.string().trim().max(80)).max(30).default([]),
  size: z.string().trim().max(50).optional(),
  status: z.enum(['active', 'review', 'archived']).optional(),
  author: z.string().trim().max(255).optional(),
  fileType: z.enum(['PDF', 'DOCX', 'XLSX', 'TXT', 'CSV']).optional(),
  sourceFileName: z.string().trim().max(255).optional(),
});

export const promptBodySchema = z.object({
  promptGroupId: shortText,
  version: z.number().int().min(1).max(9999),
  status: z.enum(['active', 'draft', 'archived']),
  name: shortText,
  description: mediumText.optional(),
  role: mediumText,
  objective: mediumText,
  systemPrompt: longText,
  instructions: z.array(mediumText).max(50),
  constraints: z.array(mediumText).max(50),
  validationChecklist: z.array(mediumText).max(50),
  outputStyle: mediumText,
});

export const retrievalSearchBodySchema = z.object({
  question: longText.min(1).max(5000),
});

export const createAgentBodySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  name: shortText,
  description: mediumText.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  defaultProvider: shortText.optional(),
  defaultModel: shortText.optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(100).max(200000).optional(),
  timeout: z.number().int().min(1000).max(300000).optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  promptIds: z.array(idSchema).max(200).optional(),
  documentIds: z.array(idSchema).max(200).optional(),
  workflowCodes: z.array(shortText).max(50).optional(),
});

export const updateAgentBodySchema = createAgentBodySchema.partial();

export const updateSettingsBodySchema = z.object({
  settings: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
}).or(z.record(z.union([z.string(), z.number(), z.boolean()])));

export const setupBodySchema = z.object({
  companyName: shortText,
  companyAddress: mediumText.optional(),
  companyEmail: z.union([z.literal(''), z.string().trim().email().max(255)]).optional(),
  companyPhone: z.string().trim().max(50).optional(),
  administratorName: shortText,
  administratorEmail: z.string().trim().email().max(255),
  administratorPassword: z.string().min(8).max(128),
  anthropicApiKey: z.string().trim().max(500).optional(),
  defaultProvider: shortText.default('anthropic'),
  defaultModel: shortText.default('claude-3-5-sonnet-latest'),
  language: shortText.default('French'),
  timezone: shortText.default('Africa/Casablanca'),
  currency: z.string().trim().min(1).max(10).default('MAD'),
});

export const exportTypeParamsSchema = z.object({
  type: z.enum(['ai-usage', 'feedback', 'statistics', 'generated-documents']),
});

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});
