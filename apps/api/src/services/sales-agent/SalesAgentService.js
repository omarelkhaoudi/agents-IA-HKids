import { documentExporters } from '../../runtime/document-runtime.js';
import { DocumentRenderer } from '../documents/DocumentRenderer.js';

const PIPELINE_STAGES = [
  'new_lead',
  'qualified',
  'meeting',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

const STAGE_PROBABILITY = {
  new_lead: 10,
  qualified: 25,
  meeting: 40,
  proposal: 60,
  negotiation: 75,
  won: 100,
  lost: 0,
};

const DOCUMENT_TYPES = [
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
];

const DEFAULT_PRODUCTS = [
  {
    name: 'Accompagnement scolaire H-Kids',
    category: 'service',
    description: 'Accompagnement personnalisé des enfants après l’école.',
    features: ['Suivi pédagogique', 'Communication parents', 'Proximité locale'],
    unitPrice: 1200,
    availability: 'available',
    internalNotes: 'Tarif indicatif — validation commerciale obligatoire.',
    knowledgeRefs: ['pricing', 'services'],
  },
  {
    name: 'Pack familles partenaires',
    category: 'service',
    description: 'Offre multi-enfants pour familles partenaires.',
    features: ['Remise suggérée uniquement', 'Suivi dédié'],
    unitPrice: 2100,
    availability: 'available',
    internalNotes: 'Ne jamais appliquer de remise sans validation manager.',
    knowledgeRefs: ['pricing', 'policies'],
  },
  {
    name: 'Atelier découverte écoles',
    category: 'product',
    description: 'Atelier de présentation H-Kids pour établissements scolaires.',
    features: ['Animation', 'Support pédagogique'],
    unitPrice: 850,
    availability: 'limited',
    knowledgeRefs: ['schools', 'procedures'],
  },
];

function safeParseJson(text, fallback) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return fallback;
  }
}

function computeTotals(lines = [], discountPercent = 0, taxPercent = 20) {
  const normalized = (lines || []).map((line) => {
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(line.unitPrice || 0);
    const lineTotal = Number((quantity * unitPrice).toFixed(2));
    return {
      productId: line.productId || null,
      name: line.name || 'Item',
      quantity,
      unitPrice,
      lineTotal,
      notes: line.notes || '',
    };
  });
  const subtotal = Number(normalized.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
  const discount = Number(((subtotal * Number(discountPercent || 0)) / 100).toFixed(2));
  const taxable = Number((subtotal - discount).toFixed(2));
  const taxAmount = Number(((taxable * Number(taxPercent || 0)) / 100).toFixed(2));
  const total = Number((taxable + taxAmount).toFixed(2));
  return { lines: normalized, subtotal, taxAmount, total };
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugify(value) {
  return String(value || 'sales-document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export class SalesAgentService {
  constructor({ repository, aiGateway, retrievalService, listDocuments, listPrompts }) {
    this.repository = repository;
    this.aiGateway = aiGateway;
    this.retrievalService = retrievalService;
    this.listDocuments = listDocuments;
    this.listPrompts = listPrompts;
    this.documentRenderer = new DocumentRenderer();
  }

  async initialize() {
    const products = await this.repository.listProducts();
    if (!products.length) {
      for (const product of DEFAULT_PRODUCTS) {
        await this.repository.createProduct(product);
      }
    }

    const companies = await this.repository.listCompanies();
    if (!companies.length) {
      await this.repository.createCompany({
        name: 'École Partenaire Exemple',
        industry: 'Éducation',
        email: 'contact@ecole-exemple.ma',
        phone: '+212 5 22 00 00 00',
        tags: ['school', 'pipeline'],
        notes: 'Compte de démonstration — ne pas contacter automatiquement.',
      });
    }
  }

  buildSystemPrompt() {
    return [
      'You are the Sales Agent AI for H-Kids.',
      'You ONLY prepare commercial drafts for human validation.',
      'Never send emails. Never contact clients. Never approve discounts.',
      'Never validate quotations. Never commit final pricing. Never send documents.',
      'Always search and use provided knowledge context before answering.',
      'Discount values are suggestions only and require manager approval.',
      'Respond ONLY with valid JSON.',
    ].join('\n');
  }

  filterSalesPrompts(prompts = []) {
    return prompts.filter(
      (prompt) =>
        prompt.promptGroupId?.startsWith('sales-') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('sales') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('commercial') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('quotation') ||
        String(prompt.name || '')
          .toLowerCase()
          .includes('negotiation')
    );
  }

  filterSalesKnowledge(documents = []) {
    return documents.filter((document) => {
      const category = String(document.category || '').toLowerCase();
      const tags = (document.tags || []).map((tag) => String(tag).toLowerCase());
      return (
        category.includes('sales') ||
        category.includes('commercial') ||
        category.includes('pricing') ||
        category.includes('product') ||
        tags.some((tag) =>
          ['sales', 'commercial', 'pricing', 'product', 'contract', 'policy'].includes(tag)
        )
      );
    });
  }

  async generateCommercialDocument(payload = {}, userId) {
    const documentType = DOCUMENT_TYPES.includes(payload.documentType)
      ? payload.documentType
      : 'proposal';
    const instruction =
      payload.instruction ||
      payload.title ||
      `Prepare a ${documentType.replaceAll('_', ' ')} draft for H-Kids.`;
    const retrieval = this.retrievalService.retrieveRelevantContext(instruction);
    const prompts = this.filterSalesPrompts(this.listPrompts());
    const selectedPrompt = prompts.find((prompt) => prompt.id === payload.promptId) || prompts[0];
    const products = await this.repository.listProducts();

    const userMessage = [
      `Document type: ${documentType}`,
      `Customer: ${payload.customerName || 'Prospect H-Kids'}`,
      `Deal context: ${payload.dealTitle || payload.context || 'Commercial opportunity'}`,
      `Instruction: ${instruction}`,
      selectedPrompt
        ? `Prompt template: ${selectedPrompt.name} — ${selectedPrompt.objective}`
        : '',
      `Catalog:\n${products
        .slice(0, 12)
        .map((product) => `- ${product.name} (${product.unitPrice} ${product.currency})`)
        .join('\n')}`,
      `Knowledge context:\n${retrieval.contextText || retrieval.context || 'None'}`,
      'Return JSON keys: title, body, summary, arguments, objections, crossSell, upsell, discountSuggestionPercent, nextSteps, faq.',
    ]
      .filter(Boolean)
      .join('\n');

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(),
      messages: [{ role: 'user', content: userMessage }],
      userId,
      agentCode: 'sales-agent',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseJson(generation.text, {
      title: payload.title || `Draft ${documentType}`,
      body: generation.text || 'Commercial draft ready for human review.',
      summary: '',
      arguments: [],
      objections: [],
      crossSell: [],
      upsell: [],
      discountSuggestionPercent: 0,
      nextSteps: ['Submit for human review'],
      faq: [],
    });

    const document = await this.repository.createDocument({
      dealId: payload.dealId || null,
      quotationId: payload.quotationId || null,
      documentType,
      title: parsed.title || payload.title || `Draft ${documentType}`,
      body: parsed.body || '',
      approvalStatus: 'draft',
      metadata: {
        summary: parsed.summary || '',
        arguments: parsed.arguments || [],
        objections: parsed.objections || [],
        crossSell: parsed.crossSell || [],
        upsell: parsed.upsell || [],
        discountSuggestionPercent: Number(parsed.discountSuggestionPercent || 0),
        nextSteps: parsed.nextSteps || [],
        faq: parsed.faq || [],
        usageId: generation.usage?.id,
        model: generation.model || generation.usage?.model,
        retrievalChunks: retrieval.rankedChunks?.length || 0,
        sourcePrompt: selectedPrompt?.name || '',
        governance: {
          neverSend: true,
          neverContactClient: true,
          neverApproveDiscount: true,
          requiresHumanApproval: true,
        },
      },
    });

    return { document, retrieval, generation, parsed };
  }

  async generateQuotation(payload = {}, userId) {
    const products = await this.repository.listProducts();
    const productById = new Map(products.map((product) => [product.id, product]));
    let lines = payload.lines || [];

    if (!lines.length && products[0]) {
      lines = [
        {
          productId: products[0].id,
          name: products[0].name,
          quantity: 1,
          unitPrice: products[0].unitPrice,
        },
      ];
    }

    lines = lines.map((line) => {
      const catalog = line.productId ? productById.get(line.productId) : null;
      return {
        ...line,
        name: line.name || catalog?.name || 'Item',
        unitPrice: line.unitPrice ?? catalog?.unitPrice ?? 0,
      };
    });

    const totals = computeTotals(lines, payload.discountPercent || 0, payload.taxPercent ?? 20);
    const instruction =
      payload.instruction ||
      `Prepare quotation draft for ${payload.customerName || 'customer'} with suggested commercial wording.`;
    const retrieval = this.retrievalService.retrieveRelevantContext(instruction);
    const prompts = this.filterSalesPrompts(this.listPrompts());
    const selectedPrompt =
      prompts.find((prompt) => prompt.promptGroupId === 'sales-quotation') ||
      prompts.find((prompt) => prompt.id === payload.promptId) ||
      prompts[0];

    const generation = await this.aiGateway.generate({
      provider: payload.provider,
      model: payload.model,
      systemPrompt: this.buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: [
            `Create quotation narrative for ${payload.customerName || 'Prospect'}.`,
            `Title: ${payload.title || 'Devis H-Kids'}`,
            `Lines: ${JSON.stringify(totals.lines)}`,
            `Subtotal: ${totals.subtotal}, Tax: ${totals.taxAmount}, Total: ${totals.total}`,
            `Instruction: ${instruction}`,
            selectedPrompt
              ? `Prompt template: ${selectedPrompt.name} — ${selectedPrompt.objective}`
              : '',
            `Knowledge:\n${retrieval.contextText || retrieval.context || 'None'}`,
            'Return JSON keys: title, body, terms, notes, discountSuggestionPercent.',
            'discountSuggestionPercent is a SUGGESTION only — never an approved discount.',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
      userId,
      agentCode: 'sales-agent',
      conversationId: payload.conversationId,
    });

    const parsed = safeParseJson(generation.text, {
      title: payload.title || 'Devis H-Kids',
      body: generation.text || 'Quotation draft for human validation.',
      terms: 'Offre valable 30 jours. Remises et conditions soumises à validation humaine.',
      notes: 'Brouillon commercial — ne pas envoyer au client.',
      discountSuggestionPercent: 0,
    });

    const quotation = await this.repository.createQuotation({
      dealId: payload.dealId || null,
      companyId: payload.companyId || null,
      prospectId: payload.prospectId || null,
      customerName: payload.customerName || 'Prospect',
      title: parsed.title || payload.title || 'Devis H-Kids',
      status: 'draft',
      approvalStatus: 'draft',
      currency: payload.currency || 'MAD',
      discountPercent: payload.discountPercent || 0,
      discountSuggestion: Number(
        parsed.discountSuggestionPercent ?? payload.discountSuggestion ?? 0
      ),
      taxPercent: payload.taxPercent ?? 20,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
      terms:
        parsed.terms ||
        payload.terms ||
        'Offre indicative. Remises, prix et envoi soumis à validation humaine.',
      validityDays: payload.validityDays ?? 30,
      notes: parsed.notes || payload.notes || '',
      lines: totals.lines,
      body: parsed.body || '',
      sourcePrompt: selectedPrompt?.name || instruction,
      conversationId: payload.conversationId || null,
      metadata: {
        usageId: generation.usage?.id,
        model: generation.model || generation.usage?.model,
        retrievalChunks: retrieval.rankedChunks?.length || 0,
        neverSendAutomatically: true,
      },
    });

    return { quotation, retrieval, generation, parsed };
  }

  async submitQuotationReview(id) {
    return this.repository.updateQuotation(id, { approvalStatus: 'pending_review' });
  }

  async approveQuotation(id, actor = 'reviewer') {
    return this.repository.updateQuotation(id, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actor,
    });
  }

  async rejectQuotation(id, actor = 'reviewer') {
    return this.repository.updateQuotation(id, {
      approvalStatus: 'rejected',
      approvedBy: actor,
    });
  }

  async submitDocumentReview(id) {
    return this.repository.updateDocument(id, { approvalStatus: 'pending_review' });
  }

  async approveDocument(id, actor = 'reviewer') {
    return this.repository.updateDocument(id, {
      approvalStatus: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: actor,
    });
  }

  async rejectDocument(id, actor = 'reviewer') {
    return this.repository.updateDocument(id, {
      approvalStatus: 'rejected',
      approvedBy: actor,
    });
  }

  buildQuotationRecord(quotation) {
    const lineSections = (quotation.lines || []).map((line, index) => ({
      heading: `Ligne ${index + 1}`,
      content: `${line.name} — qty ${line.quantity} × ${line.unitPrice} ${quotation.currency} = ${line.lineTotal} ${quotation.currency}`,
    }));

    const structuredDocument = {
      id: quotation.id,
      type: 'quotation',
      title: quotation.title,
      language: 'fr',
      reference: `QT-${quotation.id.slice(0, 8).toUpperCase()}`,
      sections: [
        {
          heading: 'Client',
          content: quotation.customerName,
        },
        {
          heading: 'Proposition',
          content: quotation.body || 'Devis préparé pour validation humaine.',
        },
        ...lineSections,
        {
          heading: 'Totaux',
          content: `Sous-total: ${quotation.subtotal} ${quotation.currency}\nTVA (${quotation.taxPercent}%): ${quotation.taxAmount} ${quotation.currency}\nTotal: ${quotation.total} ${quotation.currency}\nRemise appliquée: ${quotation.discountPercent}% (suggestion IA: ${quotation.discountSuggestion}% — non validée automatiquement)`,
        },
        {
          heading: 'Conditions',
          content: quotation.terms || '',
        },
        {
          heading: 'Notes',
          content: `${quotation.notes || ''}\n\nDocument préparé par Sales Agent AI. Aucun envoi automatique. Validation humaine obligatoire.`,
        },
      ],
      variables: {
        subtotal: String(quotation.subtotal),
        tax: String(quotation.taxAmount),
        total: String(quotation.total),
        signature: 'Pending human approval',
      },
    };

    const renderedPreview = this.documentRenderer.render({
      structuredDocument,
      companyProfile: { companyName: 'H-Kids', companyAddress: '' },
    });

    return { structuredDocument, renderedPreview };
  }

  async exportQuotation(id, format = 'markdown') {
    const quotation = await this.repository.getQuotation(id);
    if (!quotation) {
      throw Object.assign(new Error('Quotation not found.'), { statusCode: 404 });
    }

    if (!['approved', 'exported'].includes(quotation.approvalStatus)) {
      throw Object.assign(
        new Error('Quotation must be approved before export. Never send automatically.'),
        { statusCode: 409 }
      );
    }

    const markdown = [
      `# ${quotation.title}`,
      '',
      `Client: ${quotation.customerName}`,
      `Validity: ${quotation.validityDays} days`,
      '',
      quotation.body,
      '',
      '## Lines',
      ...(quotation.lines || []).map(
        (line) =>
          `- ${line.name}: ${line.quantity} × ${line.unitPrice} ${quotation.currency} = ${line.lineTotal}`
      ),
      '',
      `Subtotal: ${quotation.subtotal} ${quotation.currency}`,
      `Tax: ${quotation.taxAmount} ${quotation.currency}`,
      `Total: ${quotation.total} ${quotation.currency}`,
      `Discount applied: ${quotation.discountPercent}% (AI suggestion only: ${quotation.discountSuggestion}%)`,
      '',
      quotation.terms,
      '',
      '_Prepared by Sales Agent AI — human validation required. Never sent automatically._',
    ].join('\n');

    if (format === 'markdown') {
      await this.repository.updateQuotation(id, { approvalStatus: 'exported' });
      return {
        contentType: 'text/markdown; charset=utf-8',
        filename: `${slugify(quotation.title)}.md`,
        body: markdown,
      };
    }

    if (format === 'html') {
      const html = `<article><h1>${escapeHtml(quotation.title)}</h1><p><strong>Client:</strong> ${escapeHtml(quotation.customerName)}</p><p>${escapeHtml(quotation.body).replace(/\n/g, '<br/>')}</p><p><strong>Total:</strong> ${quotation.total} ${escapeHtml(quotation.currency)}</p><p><em>Draft prepared for human validation. Never sent automatically.</em></p></article>`;
      await this.repository.updateQuotation(id, { approvalStatus: 'exported' });
      return {
        contentType: 'text/html; charset=utf-8',
        filename: `${slugify(quotation.title)}.html`,
        body: html,
      };
    }

    const exporter = documentExporters[format];
    if (!exporter) {
      throw Object.assign(new Error('Unsupported export format.'), { statusCode: 400 });
    }

    const record = this.buildQuotationRecord(quotation);
    const exported = await exporter.export({
      structuredDocument: record.structuredDocument,
      renderedPreview: record.renderedPreview,
    });

    await this.repository.updateQuotation(id, { approvalStatus: 'exported' });

    return {
      contentType: exported.contentType || exported.mimeType || 'application/octet-stream',
      filename: exported.fileName || `${slugify(quotation.title)}.${format}`,
      body: exported.buffer || exported.content || exported.body,
    };
  }

  async exportDocument(id, format = 'markdown') {
    const documents = await this.repository.listDocuments();
    const document = documents.find((item) => item.id === id);
    if (!document) {
      throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
    }

    if (!['approved', 'exported'].includes(document.approvalStatus)) {
      throw Object.assign(
        new Error('Document must be approved before export. Never send automatically.'),
        { statusCode: 409 }
      );
    }

    const markdown = [
      `# ${document.title}`,
      '',
      `Type: ${document.documentType}`,
      '',
      document.body,
      '',
      '_Prepared by Sales Agent AI — human validation required. Never contacted clients automatically._',
    ].join('\n');

    await this.repository.updateDocument(id, { approvalStatus: 'exported' });

    if (format === 'html') {
      return {
        contentType: 'text/html; charset=utf-8',
        filename: `${slugify(document.title)}.html`,
        body: `<article><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.body).replace(/\n/g, '<br/>')}</p></article>`,
      };
    }

    return {
      contentType: 'text/markdown; charset=utf-8',
      filename: `${slugify(document.title)}.md`,
      body: markdown,
    };
  }

  async moveDealStage(dealId, stage) {
    if (!PIPELINE_STAGES.includes(stage)) {
      throw Object.assign(new Error('Invalid pipeline stage.'), { statusCode: 400 });
    }
    return this.repository.updateDeal(dealId, {
      stage,
      probability: STAGE_PROBABILITY[stage] ?? 10,
    });
  }

  getAnalytics({ deals = [], quotations = [], documents = [], products = [] } = {}) {
    const stageCounts = PIPELINE_STAGES.map((stage) => ({
      stage,
      total: deals.filter((deal) => deal.stage === stage).length,
      value: deals
        .filter((deal) => deal.stage === stage)
        .reduce((sum, deal) => sum + Number(deal.expectedRevenue || 0), 0),
    }));

    const productDemand = {};
    for (const quotation of quotations) {
      for (const line of quotation.lines || []) {
        const key = line.name || 'Unknown';
        productDemand[key] = (productDemand[key] || 0) + Number(line.quantity || 0);
      }
    }

    const objections = {};
    for (const document of documents) {
      for (const item of document.metadata?.objections || []) {
        const key = String(item).slice(0, 120);
        objections[key] = (objections[key] || 0) + 1;
      }
    }

    const approvedQuotations = quotations.filter((item) =>
      ['approved', 'exported'].includes(item.approvalStatus)
    ).length;
    const proposalDocs = documents.filter((item) => item.documentType === 'proposal');
    const acceptedProposals = proposalDocs.filter((item) =>
      ['approved', 'exported'].includes(item.approvalStatus)
    ).length;

    return {
      pipeline: stageCounts,
      salesFunnel: stageCounts,
      proposalAcceptance:
        proposalDocs.length > 0
          ? Number(((acceptedProposals / proposalDocs.length) * 100).toFixed(1))
          : 0,
      quotationApprovalRate:
        quotations.length > 0
          ? Number(((approvedQuotations / quotations.length) * 100).toFixed(1))
          : 0,
      mostRequestedProducts: Object.entries(productDemand)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
      mostCommonObjections: Object.entries(objections)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      knowledgeUsage: documents.reduce(
        (sum, document) => sum + Number(document.metadata?.retrievalChunks || 0),
        0
      ),
      promptUsage: documents.filter((document) => document.metadata?.sourcePrompt).length,
      catalogSize: products.length,
      averageResponseHint: 'Human approval required before any customer contact',
    };
  }

  async getWorkspaceBootstrap() {
    const [companies, prospects, products, deals, quotations, documents, stats, allDocuments, prompts] =
      await Promise.all([
        this.repository.listCompanies(),
        this.repository.listProspects(),
        this.repository.listProducts(),
        this.repository.listDeals(),
        this.repository.listQuotations(),
        this.repository.listDocuments(),
        this.repository.getDashboardStats(),
        Promise.resolve(this.listDocuments()),
        Promise.resolve(this.listPrompts()),
      ]);

    return {
      agentCode: 'sales-agent',
      companies,
      prospects,
      products,
      deals,
      quotations,
      documents,
      stats,
      analytics: this.getAnalytics({ deals, quotations, documents, products }),
      knowledgeDocuments: this.filterSalesKnowledge(allDocuments),
      prompts: this.filterSalesPrompts(prompts),
      pipelineStages: PIPELINE_STAGES,
      documentTypes: DOCUMENT_TYPES,
      governance: {
        autoSend: false,
        autoContact: false,
        autoDiscountApproval: false,
        autoQuotationValidation: false,
        requiresHumanApproval: true,
      },
    };
  }
}

export { PIPELINE_STAGES, STAGE_PROBABILITY, DOCUMENT_TYPES, computeTotals };
