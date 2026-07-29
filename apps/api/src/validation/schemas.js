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

const cmPlatformSchema = z.enum([
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'story',
  'newsletter',
  'other',
]);

export const cmCampaignBodySchema = z.object({
  name: shortText,
  objective: mediumText.optional(),
  targetAudience: mediumText.optional(),
  platforms: z.array(cmPlatformSchema).max(10).optional(),
  startDate: z.string().trim().max(40).optional().nullable(),
  endDate: z.string().trim().max(40).optional().nullable(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  approvalStatus: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  performanceNotes: mediumText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cmPostBodySchema = z.object({
  campaignId: idSchema.optional().nullable(),
  title: shortText,
  objective: mediumText.optional(),
  audience: shortText.optional(),
  platform: cmPlatformSchema.optional(),
  theme: shortText.optional(),
  contentType: shortText.optional(),
  tone: shortText.optional(),
  status: z.enum(['draft', 'scheduled', 'published_manual', 'archived']).optional(),
  approvalStatus: z
    .enum(['draft', 'pending_review', 'approved', 'rejected', 'exported'])
    .optional(),
  scheduledFor: z.string().trim().max(60).optional().nullable(),
  colorLabel: shortText.optional(),
  headline: mediumText.optional(),
  body: longText.optional(),
  cta: mediumText.optional(),
  hashtags: z.array(z.string().max(80)).max(40).optional(),
  keywords: z.array(z.string().max(80)).max(40).optional(),
  emojiSuggestions: z.array(z.string().max(16)).max(20).optional(),
  imageIdeas: z.array(z.string().max(200)).max(20).optional(),
  timingSuggestion: mediumText.optional(),
  alternatives: z.array(z.string().max(5000)).max(10).optional(),
  sourcePrompt: longText.optional(),
  conversationId: idSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const cmGenerateBodySchema = z.object({
  instruction: longText.min(1),
  title: shortText.optional(),
  objective: mediumText.optional(),
  audience: shortText.optional(),
  platform: cmPlatformSchema.optional(),
  theme: shortText.optional(),
  contentType: shortText.optional(),
  tone: shortText.optional(),
  campaignId: idSchema.optional().nullable(),
  scheduledFor: z.string().trim().max(60).optional().nullable(),
  colorLabel: shortText.optional(),
  promptId: idSchema.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const cmGuidelinesBodySchema = z.object({
  brandTone: longText.optional(),
  vocabulary: z.array(z.string().max(120)).max(100).optional(),
  forbiddenExpressions: z.array(z.string().max(200)).max(100).optional(),
  preferredExpressions: z.array(z.string().max(200)).max(100).optional(),
  targetAudiences: z.array(z.string().max(120)).max(50).optional(),
  communicationPrinciples: z.array(z.string().max(500)).max(50).optional(),
  writingExamples: z.array(z.string().max(2000)).max(30).optional(),
});

export const cmLibraryBodySchema = z.object({
  category: z.enum([
    'template',
    'approved_post',
    'rejected_post',
    'reusable_paragraph',
    'cta',
    'hashtag',
    'campaign',
  ]),
  title: shortText,
  content: longText.optional(),
  tags: z.array(z.string().max(80)).max(40).optional(),
  platform: cmPlatformSchema.optional().nullable(),
  campaignId: idSchema.optional().nullable(),
  postId: idSchema.optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cmExportQuerySchema = z.object({
  format: z.enum(['markdown', 'html', 'json']).default('markdown'),
});

const salesStageSchema = z.enum([
  'new_lead',
  'qualified',
  'meeting',
  'proposal',
  'negotiation',
  'won',
  'lost',
]);

const salesApprovalSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'exported',
]);

const salesDocumentTypeSchema = z.enum([
  'proposal',
  'quotation_summary',
  'follow_up_email',
  'meeting_summary',
  'negotiation_strategy',
  'sales_argument',
  'faq',
  'objection_handling',
  'cross_sell',
  'upsell',
  'other',
]);

export const salesCompanyBodySchema = z.object({
  name: shortText,
  industry: shortText.optional(),
  website: shortText.optional(),
  phone: shortText.optional(),
  email: z.string().trim().max(255).optional(),
  address: mediumText.optional(),
  tags: z.array(z.string().max(80)).max(40).optional(),
  notes: longText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesProspectBodySchema = z.object({
  companyId: idSchema.optional().nullable(),
  fullName: shortText,
  contactName: shortText.optional(),
  phone: shortText.optional(),
  email: z.string().trim().max(255).optional(),
  status: z
    .enum([
      'new_lead',
      'qualified',
      'meeting',
      'proposal',
      'negotiation',
      'won',
      'lost',
      'nurturing',
    ])
    .optional(),
  source: shortText.optional(),
  tags: z.array(z.string().max(80)).max(40).optional(),
  notes: longText.optional(),
  assignedUser: shortText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesProductBodySchema = z.object({
  name: shortText,
  category: shortText.optional(),
  description: longText.optional(),
  features: z.array(z.string().max(300)).max(50).optional(),
  unitPrice: z.number().min(0).max(1_000_000_000).optional(),
  currency: z.string().trim().max(8).optional(),
  availability: z.enum(['available', 'limited', 'unavailable']).optional(),
  internalNotes: longText.optional(),
  knowledgeRefs: z.array(z.string().max(120)).max(40).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesDealBodySchema = z.object({
  title: shortText,
  companyId: idSchema.optional().nullable(),
  prospectId: idSchema.optional().nullable(),
  stage: salesStageSchema.optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedRevenue: z.number().min(0).max(1_000_000_000).optional(),
  expectedCloseDate: z.string().trim().max(40).optional().nullable(),
  currency: z.string().trim().max(8).optional(),
  assignedUser: shortText.optional(),
  notes: longText.optional(),
  approvalStatus: salesApprovalSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesMoveDealBodySchema = z.object({
  stage: salesStageSchema,
});

const salesLineSchema = z.object({
  productId: idSchema.optional().nullable(),
  name: shortText.optional(),
  quantity: z.number().min(0).max(1_000_000).optional(),
  unitPrice: z.number().min(0).max(1_000_000_000).optional(),
  notes: mediumText.optional(),
});

export const salesQuotationBodySchema = z.object({
  dealId: idSchema.optional().nullable(),
  companyId: idSchema.optional().nullable(),
  prospectId: idSchema.optional().nullable(),
  customerName: shortText,
  title: shortText,
  status: z.enum(['draft', 'sent_manual', 'accepted', 'rejected', 'archived']).optional(),
  approvalStatus: salesApprovalSchema.optional(),
  currency: z.string().trim().max(8).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountSuggestion: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  subtotal: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  terms: longText.optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  notes: longText.optional(),
  lines: z.array(salesLineSchema).max(100).optional(),
  body: longText.optional(),
  sourcePrompt: longText.optional(),
  conversationId: idSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesDocumentBodySchema = z.object({
  dealId: idSchema.optional().nullable(),
  quotationId: idSchema.optional().nullable(),
  documentType: salesDocumentTypeSchema,
  title: shortText,
  body: longText.optional(),
  approvalStatus: salesApprovalSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const salesGenerateBodySchema = z.object({
  instruction: longText.min(1),
  title: shortText.optional(),
  documentType: salesDocumentTypeSchema.optional(),
  customerName: shortText.optional(),
  dealTitle: shortText.optional(),
  context: mediumText.optional(),
  dealId: idSchema.optional().nullable(),
  quotationId: idSchema.optional().nullable(),
  promptId: idSchema.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const salesGenerateQuotationBodySchema = z.object({
  instruction: longText.optional(),
  customerName: shortText.optional(),
  title: shortText.optional(),
  dealId: idSchema.optional().nullable(),
  companyId: idSchema.optional().nullable(),
  prospectId: idSchema.optional().nullable(),
  currency: z.string().trim().max(8).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountSuggestion: z.number().min(0).max(100).optional(),
  taxPercent: z.number().min(0).max(100).optional(),
  terms: longText.optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  notes: longText.optional(),
  lines: z.array(salesLineSchema).max(100).optional(),
  promptId: idSchema.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const salesExportQuerySchema = z.object({
  format: z.enum(['markdown', 'html', 'pdf', 'docx']).default('markdown'),
});
