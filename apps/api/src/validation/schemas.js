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

const workflowApprovalLevelSchema = z.object({
  levelIndex: z.number().int().min(1).max(50).optional(),
  levelName: z.string().trim().max(255).optional(),
  name: z.string().trim().max(255).optional(),
  approverType: z
    .enum([
      'role',
      'department',
      'manager_hierarchy',
      'owner',
      'fallback',
      'agent_specific',
      'knowledge_approver',
      'prompt_approver',
      'document_approver',
      'user',
    ])
    .optional(),
  approvers: z.array(z.string().trim().min(1).max(255)).max(50).default([]),
  required: z.boolean().optional(),
  strategy: z.enum(['all_required', 'majority', 'first_responder']).optional(),
  timeoutMinutes: z.number().int().min(1).max(525600).optional(),
});

const workflowSlaSchema = z.object({
  expectedDurationMinutes: z.number().int().min(1).max(525600).optional(),
  maximumDurationMinutes: z.number().int().min(1).max(525600).optional(),
  businessHours: z.boolean().optional(),
  escalationMinutes: z.number().int().min(1).max(525600).optional(),
  pauseAllowed: z.boolean().optional(),
});

export const workflowDefinitionBodySchema = z.object({
  name: shortText,
  code: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i),
  category: z.string().trim().max(120).default('general'),
  description: mediumText.optional(),
  tags: z.array(z.string().trim().max(80)).max(30).default([]),
  owner: z.string().trim().max(255).optional(),
  status: z.enum(['draft', 'published', 'archived', 'deprecated']).default('draft'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  policyId: idSchema.nullable().optional(),
  executionMode: z.enum(['sequential', 'parallel', 'mixed']).default('sequential'),
  approvalStrategy: z.enum(['all_required', 'majority', 'first_responder']).default('all_required'),
  approvalChain: z.array(workflowApprovalLevelSchema).min(1).max(50),
  conditions: z.array(z.record(z.unknown())).max(100).default([]),
  sla: workflowSlaSchema.default({}),
  escalationRules: z.array(z.record(z.unknown())).max(100).default([]),
  metadata: z.record(z.unknown()).default({}),
  changeSummary: mediumText.optional(),
});

export const workflowDefinitionPatchSchema = workflowDefinitionBodySchema.partial().extend({
  changeSummary: mediumText.optional(),
});

export const workflowSimulationBodySchema = z.object({
  workflowDefinitionId: idSchema.optional(),
  workflowDefinitionCode: z.string().trim().max(120).optional(),
  policyCode: z.string().trim().max(120).optional(),
  reviewers: z.array(z.string().trim().min(1).max(255)).max(50).default([]),
  definition: workflowDefinitionBodySchema.partial().optional(),
  conditions: z.array(z.record(z.unknown())).max(100).default([]),
  sla: workflowSlaSchema.default({}),
});

export const workflowApprovalDecisionBodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  actor: z.string().trim().max(255).optional(),
  comment: mediumText.optional(),
});

export const workflowDelegationBodySchema = z.object({
  delegator: z.string().trim().min(1).max(255),
  delegate: z.string().trim().min(1).max(255),
  delegationType: z.enum(['temporary', 'permanent', 'vacation']).default('temporary'),
  scope: z.string().trim().max(255).default('all'),
  reason: mediumText.optional(),
  startsAt: z.string().trim().max(80).optional(),
  expiresAt: z.string().trim().max(80).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const workflowEscalationBodySchema = z.object({
  workflowInstanceId: idSchema.optional(),
  approvalTaskId: idSchema.optional(),
  escalationType: z
    .enum([
      'approval_timeout',
      'reviewer_unavailable',
      'multiple_rejections',
      'workflow_blocked',
      'high_priority',
      'critical_incident',
      'manual',
    ])
    .default('manual'),
  fromReviewer: z.string().trim().max(255).optional(),
  toReviewer: z.string().trim().max(255).optional(),
  reason: mediumText.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const workflowImportBodySchema = z.object({
  definition: workflowDefinitionBodySchema.partial(),
  versions: z.array(z.record(z.unknown())).optional(),
});

export const workflowVersionParamsSchema = z.object({
  id: idSchema,
  version: z.coerce.number().int().min(1),
});

export const workflowCompareQuerySchema = z.object({
  left: z.coerce.number().int().min(1),
  right: z.coerce.number().int().min(1),
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
  status: z.enum(['draft', 'review', 'approved', 'active', 'archived', 'deleted']).optional(),
  author: z.string().trim().max(255).optional(),
  owner: z.string().trim().max(255).optional(),
  language: z.string().trim().max(20).optional(),
  collectionId: idSchema.nullable().optional(),
  folderId: idSchema.nullable().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  reviewDate: z.string().trim().max(80).optional(),
  expirationDate: z.string().trim().max(80).optional(),
  notes: mediumText.optional(),
  content: longText.optional(),
  fileType: z
    .enum(['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'CSV', 'MD', 'HTML', 'PNG', 'JPEG', 'SVG', 'ZIP'])
    .optional(),
  sourceFileName: z.string().trim().max(255).optional(),
  aiVisibility: z.boolean().optional(),
  securityClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  isFavorite: z.boolean().optional(),
});

export const knowledgeCollectionBodySchema = z.object({
  name: shortText,
  description: mediumText.optional(),
  icon: z.string().trim().max(80).optional(),
  color: z.string().trim().max(40).optional(),
  owner: z.string().trim().max(255).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  language: z.string().trim().max(20).optional(),
});

export const knowledgeReviewBodySchema = z.object({
  comment: mediumText.optional(),
  actor: z.string().trim().max(255).optional(),
});

export const knowledgeLinkBodySchema = z.object({
  linkedType: z.enum(['prompt', 'workflow', 'agent', 'template', 'document']),
  linkedId: idSchema,
  label: z.string().trim().max(255).optional(),
});

export const knowledgeTagBodySchema = z.object({
  name: shortText,
  color: z.string().trim().max(40).optional(),
  parentId: idSchema.nullable().optional(),
  usageCount: z.number().int().min(0).optional(),
});

export const knowledgeMergeTagsBodySchema = z.object({
  sourceName: shortText,
  targetName: shortText,
});

export const knowledgeBulkBodySchema = z.object({
  action: z.enum(['archive', 'delete', 'move', 'tag', 'duplicate', 'merge']),
  documentIds: z.array(idSchema).min(1).max(200),
  collectionId: idSchema.optional(),
  tags: z.array(z.string().trim().max(80)).max(30).optional(),
});

export const knowledgeImportBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: idSchema.optional(),
        title: shortText,
        category: shortText,
        description: mediumText.optional(),
        tags: z.array(z.string().trim().max(80)).max(30).optional(),
        collectionId: idSchema.nullable().optional(),
        owner: z.string().trim().max(255).optional(),
        author: z.string().trim().max(255).optional(),
        language: z.string().trim().max(20).optional(),
        status: z.enum(['draft', 'active', 'review', 'archived']).optional(),
        priority: z.number().int().min(0).max(10).optional(),
        reviewDate: z.string().trim().max(80).optional(),
        expirationDate: z.string().trim().max(80).optional(),
        notes: mediumText.optional(),
        fileType: z.enum(['PDF', 'DOCX', 'XLSX', 'TXT', 'CSV', 'MD', 'HTML']).optional(),
        size: z.string().trim().max(50).optional(),
        sourceFileName: z.string().trim().max(255).optional(),
      })
    )
    .max(500),
});

export const knowledgeVersionParamsSchema = z.object({
  id: idSchema,
  version: z.coerce.number().int().min(1).max(99999),
});

export const knowledgeLinkParamsSchema = z.object({
  id: idSchema,
  linkId: idSchema,
});

export const knowledgeCompareQuerySchema = z.object({
  left: z.coerce.number().int().min(1),
  right: z.coerce.number().int().min(1),
});

export const promptBodySchema = z.object({
  promptGroupId: shortText,
  version: z.number().int().min(1).max(9999),
  status: z.enum(['draft', 'review', 'approved', 'active', 'archived', 'deprecated']).optional(),
  name: shortText,
  description: mediumText.optional(),
  role: mediumText,
  objective: mediumText,
  systemPrompt: longText,
  instructions: z.array(mediumText).max(50),
  constraints: z.array(mediumText).max(50),
  validationChecklist: z.array(mediumText).max(50),
  outputStyle: mediumText,
  libraryId: idSchema.nullable().optional(),
  category: z.string().trim().max(255).optional(),
  tags: z.array(z.string().trim().max(80)).max(30).optional(),
  language: z.string().trim().max(20).optional(),
  owner: z.string().trim().max(255).optional(),
  author: z.string().trim().max(255).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  agentCode: z.string().trim().max(120).optional(),
  targetModel: z.string().trim().max(120).optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  maxTokens: z.number().int().min(1).max(200000).nullable().optional(),
  knowledgeCollectionIds: z.array(idSchema).max(50).optional(),
  notes: mediumText.optional(),
});

export const promptLibraryBodySchema = z.object({
  name: shortText,
  description: mediumText.optional(),
  owner: z.string().trim().max(255).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  language: z.string().trim().max(20).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  version: z.number().int().min(1).max(9999).optional(),
  tags: z.array(z.string().trim().max(80)).max(30).optional(),
});

export const promptReviewBodySchema = z.object({
  comment: mediumText.optional(),
  actor: z.string().trim().max(255).optional(),
});

export const promptLinkBodySchema = z.object({
  linkedType: z.enum(['document', 'collection', 'template', 'workflow', 'agent', 'analytics']),
  linkedId: idSchema,
  label: z.string().trim().max(255).optional(),
});

export const promptLinkParamsSchema = z.object({
  id: idSchema,
  linkId: idSchema,
});

export const promptVersionParamsSchema = z.object({
  id: idSchema,
  version: z.coerce.number().int().min(1).max(99999),
});

export const promptCompareQuerySchema = z.object({
  left: z.coerce.number().int().min(1),
  right: z.coerce.number().int().min(1),
});

export const promptPlaygroundBodySchema = z.object({
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  userMessage: mediumText.optional(),
  question: mediumText.optional(),
  includeKnowledge: z.boolean().optional(),
  documentIds: z.array(idSchema).max(50).optional(),
  dryRun: z.boolean().optional(),
  recordUsage: z.boolean().optional(),
  actor: z.string().trim().max(255).optional(),
});

export const promptFeedbackSuggestionBodySchema = z.object({
  suggestion: mediumText,
  actor: z.string().trim().max(255).optional(),
});

export const dmsFolderBodySchema = z.object({
  name: shortText,
  description: mediumText.optional(),
  parentId: idSchema.nullable().optional(),
  owner: z.string().trim().max(255).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
  isFavorite: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const dmsUploadBodySchema = z.object({
  filename: shortText,
  contentBase64: z.string().min(1),
  mimeType: z.string().trim().max(120).optional(),
  title: shortText.optional(),
  description: mediumText.optional(),
  category: shortText.optional(),
  tags: z.array(z.string().trim().max(80)).max(30).optional(),
  folderId: idSchema.nullable().optional(),
  collectionId: idSchema.nullable().optional(),
  language: z.string().trim().max(20).optional(),
  owner: z.string().trim().max(255).optional(),
  author: z.string().trim().max(255).optional(),
  status: z.enum(['draft', 'review', 'approved', 'active', 'archived']).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  aiVisibility: z.boolean().optional(),
  securityClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
  notes: mediumText.optional(),
  overwriteDocumentId: idSchema.optional(),
  allowDuplicate: z.boolean().optional(),
  uploadSessionId: idSchema.optional(),
});

export const dmsUploadSessionBodySchema = z.object({
  filename: shortText,
  mimeType: z.string().trim().max(120).optional(),
  byteSize: z.number().int().min(0).optional(),
  totalChunks: z.number().int().min(1).max(10000).optional(),
  folderId: idSchema.nullable().optional(),
  collectionId: idSchema.nullable().optional(),
  overwriteDocumentId: idSchema.optional(),
});

export const dmsChunkBodySchema = z.object({
  chunkIndex: z.number().int().min(0).optional(),
  checksum: z.string().trim().max(128).optional(),
});

export const dmsMoveBodySchema = z.object({
  documentIds: z.array(idSchema).min(1).max(200),
  folderId: idSchema.nullable().optional(),
});

export const dmsWorkflowBodySchema = z.object({
  comment: mediumText.optional(),
  actor: z.string().trim().max(255).optional(),
});

export const dmsAclBodySchema = z.object({
  principalType: z.enum(['user', 'role', 'team', 'organization']),
  principalId: z.string().trim().min(1).max(255),
  accessLevel: z.enum(['read', 'write', 'approve', 'export', 'delete', 'owner']).default('read'),
  permissions: z
    .array(z.enum(['read', 'write', 'approve', 'export', 'delete', 'owner']))
    .max(6)
    .optional(),
  expiresAt: z.string().trim().max(80).optional().nullable(),
  actor: z.string().trim().max(255).optional(),
});

export const dmsAclVisibilityBodySchema = z.object({
  aclVisibility: z.enum(['private', 'team', 'organization', 'restricted']),
  aclInherits: z.boolean().optional(),
  actor: z.string().trim().max(255).optional(),
});

export const dmsImportBodySchema = z.object({
  items: z
    .array(
      z.object({
        id: idSchema.optional(),
        title: shortText,
        category: shortText,
        description: mediumText.optional(),
        tags: z.array(z.string().trim().max(80)).max(30).optional(),
        folderId: idSchema.nullable().optional(),
        collectionId: idSchema.nullable().optional(),
        status: z.enum(['draft', 'review', 'approved', 'active', 'archived']).optional(),
        language: z.string().trim().max(20).optional(),
        owner: z.string().trim().max(255).optional(),
        author: z.string().trim().max(255).optional(),
        fileType: z
          .enum(['PDF', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'CSV', 'MD', 'HTML', 'PNG', 'JPEG', 'SVG', 'ZIP'])
          .optional(),
      })
    )
    .max(500),
});

export const retrievalSearchBodySchema = z.object({
  question: longText.min(1).max(5000),
  topK: z.coerce.number().int().min(1).max(30).optional(),
  agentCode: shortText.optional(),
  promptId: idSchema.optional(),
  documentIds: z.array(idSchema).max(200).optional(),
  collectionIds: z.array(idSchema).max(50).optional(),
  tags: z.array(z.string().trim().max(80)).max(30).optional(),
  category: shortText.optional(),
  language: z.string().trim().max(20).optional(),
  securityClassifications: z.array(shortText).max(10).optional(),
  promptAwareText: mediumText.optional(),
  promptContext: mediumText.optional(),
  promptName: shortText.optional(),
  promptObjective: mediumText.optional(),
});

export const vectorIndexActionBodySchema = z.object({
  scope: z.enum(['document', 'collection', 'all', 'cache']).optional(),
  targetId: idSchema.nullable().optional(),
  force: z.boolean().optional(),
  background: z.boolean().optional(),
  actor: z.string().trim().max(255).optional(),
});

export const vectorIndexJobsQuerySchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
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

export const secretRotationBodySchema = z.object({
  value: z.string().min(1).max(5000),
  expiresAt: z.string().trim().max(80).optional().nullable(),
  actor: z.string().trim().max(255).optional(),
});

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

export const observabilityUsageQuerySchema = z.object({
  granularity: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const observabilityLogsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  agentCode: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const observabilityTimelineQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  days: z.coerce.number().int().min(1).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const observabilityAlertsQuerySchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const observabilityAnalyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const observabilitySnapshotsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const observabilityExportQuerySchema = z.object({
  dataset: z
    .enum(['usage', 'agents', 'models', 'alerts', 'timeline', 'conversations', 'vector'])
    .default('usage'),
  format: z.enum(['json', 'csv']).default('json'),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const observabilityEventBodySchema = z.object({
  eventType: z.string().trim().min(1).max(120),
  category: z.string().trim().max(60).default('system'),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  source: z.string().trim().max(60).default('api'),
  subjectType: z.string().trim().max(60).optional(),
  subjectId: z.string().trim().max(200).optional(),
  agentCode: z.string().trim().max(120).optional(),
  conversationId: z.string().trim().max(200).optional(),
  summary: z.string().trim().max(500).default(''),
  durationMs: z.coerce.number().int().min(0).max(3_600_000).optional(),
  metadata: z.record(z.any()).default({}),
});

export const observabilityAlertActionBodySchema = z.object({
  actor: z.string().trim().max(160).optional(),
});

export const evaluationWindowQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const evaluationTrendQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const evaluationAnalyticsQuerySchema = z.object({
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const evaluationHistoryQuerySchema = z.object({
  agentCode: z.string().trim().max(120).optional(),
  promptId: z.string().trim().max(200).optional(),
  conversationId: z.string().trim().max(200).optional(),
  subjectType: z.enum(['conversation', 'suite_case', 'prompt', 'document', 'workflow']).optional(),
  verdict: z.enum(['pass', 'warn', 'fail']).optional(),
  source: z.enum(['automatic', 'suite', 'manual']).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const evaluationPromptsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const evaluationComparisonQuerySchema = z.object({
  left: z.coerce.number().int().min(1).optional(),
  right: z.coerce.number().int().min(1).optional(),
});

export const evaluationSuitesQuerySchema = z.object({
  agentCode: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
});

export const evaluationAlertsQuerySchema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const evaluationSuggestionsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  category: z.enum(['prompt', 'knowledge', 'workflow', 'agent']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const evaluationExportQuerySchema = z.object({
  dataset: z
    .enum(['runs', 'agents', 'prompts', 'criteria', 'trend', 'suggestions'])
    .default('runs'),
  format: z.enum(['json', 'csv']).default('json'),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const evaluationActionBodySchema = z.object({
  actor: z.string().trim().max(160).optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const evaluationSuggestionActionBodySchema = z.object({
  actor: z.string().trim().max(160).optional(),
  status: z.enum(['approved', 'rejected']),
});

export const evaluationRunBodySchema = z.object({
  subjectType: z
    .enum(['conversation', 'suite_case', 'prompt', 'document', 'workflow'])
    .default('conversation'),
  subjectId: z.string().trim().max(200).optional(),
  agentCode: z.string().trim().max(120).optional(),
  conversationId: z.string().trim().max(200).optional(),
  messageId: z.string().trim().max(200).optional(),
  promptId: z.string().trim().max(200).optional(),
  promptVersion: z.coerce.number().int().min(0).optional(),
  documentIds: z.array(z.string().trim().max(200)).max(50).optional(),
  provider: z.string().trim().max(60).optional(),
  model: z.string().trim().max(120).optional(),
  question: z.string().trim().max(8000).optional(),
  outputText: z.string().max(60_000),
  knowledgeText: z.string().max(60_000).optional(),
  expectedOutput: z.string().max(20_000).optional(),
  instructions: z.array(z.string().trim().max(1000)).max(50).optional(),
  approvalState: z.enum(['approved', 'rejected', 'pending', 'unknown']).default('unknown'),
  feedbackRating: z.coerce.number().min(1).max(5).optional(),
  latencyMs: z.coerce.number().int().min(0).max(3_600_000).optional(),
  promptTokens: z.coerce.number().int().min(0).optional(),
  completionTokens: z.coerce.number().int().min(0).optional(),
  totalTokens: z.coerce.number().int().min(0).optional(),
  estimatedCost: z.coerce.number().min(0).optional(),
  metadata: z.record(z.any()).default({}),
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

const hrApprovalSchema = z.enum([
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'exported',
]);

const hrDocumentTypeSchema = z.enum([
  'job_description',
  'employment_contract',
  'internship_agreement',
  'freelance_contract',
  'probation_confirmation',
  'contract_amendment',
  'employment_certificate',
  'salary_certificate',
  'administrative_letter',
  'warning_letter',
  'explanation_request',
  'meeting_invitation',
  'disciplinary_report',
  'administrative_notice',
  'performance_review',
  'training_plan',
  'onboarding_plan',
  'offboarding_plan',
  'offer_letter',
  'rejection_letter',
  'interview_summary',
  'recruitment_summary',
  'hr_report',
  'internal_communication',
  'other',
]);

export const hrEmployeeBodySchema = z.object({
  fullName: shortText,
  email: z.string().trim().max(255).optional(),
  phone: shortText.optional(),
  department: shortText.optional(),
  position: shortText.optional(),
  managerName: shortText.optional(),
  employmentType: z
    .enum(['full_time', 'part_time', 'internship', 'freelance', 'temporary'])
    .optional(),
  startDate: z.string().trim().max(40).optional().nullable(),
  status: z.enum(['active', 'onboarding', 'on_leave', 'offboarding', 'inactive']).optional(),
  tags: z.array(z.string().max(80)).max(40).optional(),
  notes: longText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrCandidateBodySchema = z.object({
  fullName: shortText,
  email: z.string().trim().max(255).optional(),
  phone: shortText.optional(),
  positionApplied: shortText.optional(),
  stage: z
    .enum([
      'applied',
      'screening',
      'interview',
      'shortlist',
      'offer',
      'hired',
      'rejected',
      'withdrawn',
    ])
    .optional(),
  source: shortText.optional(),
  evaluationScore: z.number().int().min(0).max(100).optional().nullable(),
  shortlisted: z.boolean().optional(),
  interviewNotes: longText.optional(),
  tags: z.array(z.string().max(80)).max(40).optional(),
  notes: longText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrJobDescriptionBodySchema = z.object({
  title: shortText,
  department: shortText.optional(),
  location: shortText.optional(),
  contractType: shortText.optional(),
  mission: longText.optional(),
  responsibilities: z.array(z.string().max(500)).max(50).optional(),
  dailyTasks: z.array(z.string().max(500)).max(50).optional(),
  requiredSkills: z.array(z.string().max(200)).max(50).optional(),
  preferredSkills: z.array(z.string().max(200)).max(50).optional(),
  experience: mediumText.optional(),
  education: mediumText.optional(),
  softSkills: z.array(z.string().max(200)).max(50).optional(),
  languages: z.array(z.string().max(120)).max(30).optional(),
  benefits: z.array(z.string().max(300)).max(40).optional(),
  body: longText.optional(),
  approvalStatus: hrApprovalSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrLeaveBodySchema = z.object({
  employeeId: idSchema.optional().nullable(),
  employeeName: shortText.optional(),
  leaveType: z
    .enum(['annual', 'paid', 'unpaid', 'medical', 'remote', 'exceptional', 'parental'])
    .optional(),
  startDate: z.string().trim().max(40).optional().nullable(),
  endDate: z.string().trim().max(40).optional().nullable(),
  days: z.number().int().min(1).max(365).optional(),
  reason: mediumText.optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  aiRecommendation: longText.optional(),
  managerDecision: mediumText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrLeaveRecommendBodySchema = z.object({
  employeeId: idSchema.optional().nullable(),
  employeeName: shortText.optional(),
  leaveType: z
    .enum(['annual', 'paid', 'unpaid', 'medical', 'remote', 'exceptional', 'parental'])
    .optional(),
  startDate: z.string().trim().max(40).optional().nullable(),
  endDate: z.string().trim().max(40).optional().nullable(),
  days: z.number().int().min(1).max(365).optional(),
  reason: mediumText.optional(),
  instruction: longText.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const hrDecideLeaveBodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});

export const hrAbsenceBodySchema = z.object({
  employeeId: idSchema.optional().nullable(),
  employeeName: shortText.optional(),
  reason: mediumText.optional(),
  startDate: z.string().trim().max(40).optional().nullable(),
  endDate: z.string().trim().max(40).optional().nullable(),
  durationDays: z.number().int().min(1).max(365).optional(),
  supportingDocs: z.array(z.string().max(300)).max(40).optional(),
  status: z.enum(['recorded', 'under_review', 'closed']).optional(),
  alertFlag: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrDocumentBodySchema = z.object({
  employeeId: idSchema.optional().nullable(),
  candidateId: idSchema.optional().nullable(),
  documentType: hrDocumentTypeSchema,
  title: shortText,
  body: longText.optional(),
  approvalStatus: hrApprovalSchema.optional(),
  version: z.number().int().min(1).max(1000).optional(),
  sourcePrompt: longText.optional(),
  conversationId: idSchema.optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrGenerateBodySchema = z.object({
  instruction: longText.min(1),
  title: shortText.optional(),
  documentType: hrDocumentTypeSchema.optional(),
  employeeId: idSchema.optional().nullable(),
  candidateId: idSchema.optional().nullable(),
  employeeName: shortText.optional(),
  candidateName: shortText.optional(),
  department: shortText.optional(),
  promptId: idSchema.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const trainingCourseBodySchema = z.object({
  title: shortText,
  description: longText.optional(),
  category: shortText.optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string().trim().max(120)).max(40).optional(),
  durationHours: z.number().min(0).max(999).optional(),
  prerequisites: z.array(z.string().trim().max(120)).max(40).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const trainingSessionBodySchema = z.object({
  courseId: idSchema,
  title: shortText,
  description: longText.optional(),
  scheduledAt: z.string().trim().max(50).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  instructor: shortText.optional(),
  location: shortText.optional(),
  capacity: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const hrGenerateJobBodySchema = z.object({
  instruction: longText.optional(),
  title: shortText.optional(),
  department: shortText.optional(),
  location: shortText.optional(),
  contractType: shortText.optional(),
  promptId: idSchema.optional(),
  provider: shortText.optional(),
  model: shortText.optional(),
  conversationId: idSchema.optional().nullable(),
});

export const hrExportQuerySchema = z.object({
  format: z.enum(['markdown', 'html', 'csv']).default('markdown'),
});
