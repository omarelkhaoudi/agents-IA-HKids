import type {
  AssistantVariable,
  ContextSnapshot,
  ConversationMessage,
  ConversationSummary,
  DocumentKind,
  GeneratedDocumentSummary,
  QuickAction,
  TemplateDefinition,
} from '../types/assistant';

export const quickActions: QuickAction[] = [
  {
    id: 'quotation',
    label: 'Create quotation',
    prompt: 'Prepare a quotation for school transportation support and after-school coordination.',
    summary: 'Draft a client-facing quotation with pricing and validity period.',
  },
  {
    id: 'invoice',
    label: 'Create invoice',
    prompt: 'Create an invoice for June administrative support and procurement assistance.',
    summary: 'Generate a billing-ready invoice layout with due date and totals.',
  },
  {
    id: 'purchase-order',
    label: 'Create purchase order',
    prompt: 'Build a purchase order for educational materials and classroom supplies.',
    summary: 'Prepare a supplier-ready purchase order with line items and delivery details.',
  },
  {
    id: 'delivery-note',
    label: 'Create delivery note',
    prompt: 'Create a delivery note for distributed welcome kits and printed materials.',
    summary: 'Track delivered items and acknowledgement details.',
  },
  {
    id: 'letter',
    label: 'Create administrative letter',
    prompt: 'Draft an administrative letter confirming enrollment support and next steps.',
    summary: 'Produce a formal administrative letter with signature block.',
  },
  {
    id: 'email',
    label: 'Create email',
    prompt: 'Write a follow-up email to a parent about registration documents and deadlines.',
    summary: 'Prepare a professional email draft with subject and action items.',
  },
];

export const sidebarSections = [
  'New Conversation',
  'Conversation History',
  'Templates',
  'Knowledge Base',
  'Generated Documents',
  'Settings',
];

export const conversationHistory: ConversationSummary[] = [
  {
    id: 'conv-001',
    title: 'Transportation quotation draft',
    lastUpdated: '5 min ago',
    category: 'finance',
  },
  {
    id: 'conv-002',
    title: 'Supplier invoice review',
    lastUpdated: '18 min ago',
    category: 'finance',
  },
  {
    id: 'conv-003',
    title: 'Enrollment letter revision',
    lastUpdated: '42 min ago',
    category: 'drafting',
  },
  {
    id: 'conv-004',
    title: 'Stationery purchase order',
    lastUpdated: 'Today',
    category: 'operations',
  },
];

export const templates: TemplateDefinition[] = [
  {
    id: 'tpl-quote-standard',
    name: 'Standard Service Quotation',
    description: 'For operational support, consulting, and school administration services.',
    audience: 'External clients',
  },
  {
    id: 'tpl-letter-parent',
    name: 'Parent Communication Letter',
    description: 'For official family communications with a formal signature section.',
    audience: 'Parents and guardians',
  },
  {
    id: 'tpl-email-followup',
    name: 'Follow-up Email',
    description: 'For reminders, document requests, and polite follow-up communication.',
    audience: 'Partners and families',
  },
];

export const recentDocuments: GeneratedDocumentSummary[] = [
  {
    id: 'doc-001',
    name: 'Quotation - Greenfield Nursery',
    type: 'quotation',
    status: 'ready',
    updatedAt: '09:15',
  },
  {
    id: 'doc-002',
    name: 'Invoice - June Support Services',
    type: 'invoice',
    status: 'review',
    updatedAt: 'Yesterday',
  },
  {
    id: 'doc-003',
    name: 'Letter - Enrollment Confirmation',
    type: 'letter',
    status: 'draft',
    updatedAt: 'Yesterday',
  },
];

export const contextSnapshot: ContextSnapshot = {
  department: 'Administration',
  language: 'English',
  companyName: 'H-Kids',
  companyAddress: '14 Avenue des Orangers, Casablanca, Morocco',
  contactName: 'Sara El Idrissi',
};

export const templateByAction: Record<DocumentKind, TemplateDefinition> = {
  quotation: templates[0],
  invoice: {
    id: 'tpl-invoice-standard',
    name: 'Standard Invoice',
    description: 'For recurring administrative services, school coordination, and support fees.',
    audience: 'External clients',
  },
  'purchase-order': {
    id: 'tpl-po-supplier',
    name: 'Supplier Purchase Order',
    description: 'For approved supply orders with shipping and billing details.',
    audience: 'Suppliers',
  },
  'delivery-note': {
    id: 'tpl-delivery-ops',
    name: 'Operations Delivery Note',
    description: 'For item handover confirmation and delivery traceability.',
    audience: 'Operations partners',
  },
  letter: templates[1],
  email: templates[2],
};

export const variablesByAction: Record<DocumentKind, AssistantVariable[]> = {
  quotation: [
    { key: 'clientName', label: 'Client', value: 'Greenfield Nursery' },
    { key: 'servicePeriod', label: 'Service Period', value: 'September 2026 - December 2026' },
    { key: 'budget', label: 'Estimated Budget', value: 'MAD 48,000' },
  ],
  invoice: [
    { key: 'invoiceNumber', label: 'Invoice Number', value: 'INV-2026-071' },
    { key: 'dueDate', label: 'Due Date', value: '12 Aug 2026' },
    { key: 'billingContact', label: 'Billing Contact', value: 'Mina Rahal' },
  ],
  'purchase-order': [
    { key: 'supplier', label: 'Supplier', value: 'Atlas Education Supplies' },
    { key: 'deliverySite', label: 'Delivery Site', value: 'H-Kids Operations Hub' },
    { key: 'requestedBy', label: 'Requested By', value: 'Youssef Benali' },
  ],
  'delivery-note': [
    { key: 'deliveryRef', label: 'Delivery Ref', value: 'DN-2026-118' },
    { key: 'receiver', label: 'Received By', value: 'Nadia Karim' },
    { key: 'dispatchDate', label: 'Dispatch Date', value: '28 Jul 2026' },
  ],
  letter: [
    { key: 'recipient', label: 'Recipient', value: 'Mrs. Sofia El Amrani' },
    { key: 'subject', label: 'Subject', value: 'Enrollment Administrative Confirmation' },
    { key: 'signatory', label: 'Signatory', value: 'Operations Director' },
  ],
  email: [
    { key: 'recipient', label: 'Recipient', value: 'parent.support@familymail.com' },
    { key: 'subject', label: 'Subject', value: 'Missing registration documents follow-up' },
    { key: 'tone', label: 'Tone', value: 'Professional and warm' },
  ],
};

export const generatedStatusByAction: Record<DocumentKind, string> = {
  quotation: 'Quotation preview is ready for internal review.',
  invoice: 'Invoice draft is pending finance validation.',
  'purchase-order': 'Purchase order is aligned with supplier delivery requirements.',
  'delivery-note': 'Delivery note is ready for dispatch confirmation.',
  letter: 'Administrative letter is ready for signature review.',
  email: 'Email draft is prepared for manager approval.',
};

const sampleUserInputByAction: Record<DocumentKind, string> = {
  quotation: 'Please prepare a quotation for transport coordination and after-school administrative support.',
  invoice: 'Create the monthly invoice for June support services with payment terms included.',
  'purchase-order': 'I need a purchase order for classroom materials and onboarding kits.',
  'delivery-note': 'Draft a delivery note for printed materials sent to the learning center.',
  letter: 'Write an administrative letter confirming the next enrollment steps.',
  email: 'Draft a polite reminder email requesting the missing registration documents.',
};

const sampleAssistantOutputByAction: Record<DocumentKind, string> = {
  quotation: 'I have structured a professional quotation with scope, pricing, validity, and approval fields.',
  invoice: 'I prepared an invoice layout with line items, due date, payment instructions, and totals.',
  'purchase-order':
    'I organized the purchase order with supplier details, delivery address, and ordered quantities.',
  'delivery-note':
    'I drafted a delivery note highlighting shipped items, dispatch details, and receiver acknowledgment.',
  letter:
    'I prepared a formal administrative letter with a clear subject, body, and signature section.',
  email:
    'I drafted a concise professional email with a clear subject line and a friendly action-oriented tone.',
};

export function buildMessages(action: DocumentKind): ConversationMessage[] {
  return [
    {
      id: `${action}-sys`,
      role: 'system',
      content: 'Workspace ready. No AI provider connected. UI simulation mode is active.',
      createdAt: '09:02',
    },
    {
      id: `${action}-user`,
      role: 'user',
      content: sampleUserInputByAction[action],
      createdAt: '09:03',
    },
    {
      id: `${action}-assistant`,
      role: 'assistant',
      content: sampleAssistantOutputByAction[action],
      createdAt: '09:04',
    },
  ];
}
