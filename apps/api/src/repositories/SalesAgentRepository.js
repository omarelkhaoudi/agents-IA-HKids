import { randomUUID } from 'node:crypto';

function asJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function mapCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    website: row.website,
    phone: row.phone,
    email: row.email,
    address: row.address,
    tags: asJson(row.tags, []),
    notes: row.notes,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProspect(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    fullName: row.full_name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    status: row.status,
    source: row.source,
    tags: asJson(row.tags, []),
    notes: row.notes,
    assignedUser: row.assigned_user,
    lastActivityAt: row.last_activity_at,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    features: asJson(row.features, []),
    unitPrice: Number(row.unit_price || 0),
    currency: row.currency,
    availability: row.availability,
    internalNotes: row.internal_notes,
    knowledgeRefs: asJson(row.knowledge_refs, []),
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeal(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    companyId: row.company_id,
    prospectId: row.prospect_id,
    stage: row.stage,
    probability: row.probability,
    expectedRevenue: Number(row.expected_revenue || 0),
    expectedCloseDate: row.expected_close_date,
    currency: row.currency,
    assignedUser: row.assigned_user,
    notes: row.notes,
    approvalStatus: row.approval_status,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuotation(row) {
  if (!row) return null;
  return {
    id: row.id,
    dealId: row.deal_id,
    companyId: row.company_id,
    prospectId: row.prospect_id,
    customerName: row.customer_name,
    title: row.title,
    status: row.status,
    approvalStatus: row.approval_status,
    currency: row.currency,
    discountPercent: Number(row.discount_percent || 0),
    discountSuggestion: Number(row.discount_suggestion || 0),
    taxPercent: Number(row.tax_percent || 0),
    subtotal: Number(row.subtotal || 0),
    taxAmount: Number(row.tax_amount || 0),
    total: Number(row.total || 0),
    terms: row.terms,
    validityDays: row.validity_days,
    notes: row.notes,
    lines: asJson(row.lines, []),
    body: row.body,
    sourcePrompt: row.source_prompt,
    conversationId: row.conversation_id,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row) {
  if (!row) return null;
  return {
    id: row.id,
    dealId: row.deal_id,
    quotationId: row.quotation_id,
    documentType: row.document_type,
    title: row.title,
    body: row.body,
    approvalStatus: row.approval_status,
    metadata: asJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

export class SalesAgentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async listCompanies() {
    const result = await this.pool.query('SELECT * FROM sales_companies ORDER BY updated_at DESC');
    return result.rows.map(mapCompany);
  }

  async createCompany(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_companies (id, name, industry, website, phone, email, address, tags, notes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10::jsonb)`,
      [
        id,
        payload.name,
        payload.industry || '',
        payload.website || '',
        payload.phone || '',
        payload.email || '',
        payload.address || '',
        JSON.stringify(payload.tags || []),
        payload.notes || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_companies WHERE id = $1', [id]);
    return mapCompany(result.rows[0]);
  }

  async listProspects(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${String(filters.search).toLowerCase()}%`);
      clauses.push(
        `(LOWER(full_name) LIKE $${values.length} OR LOWER(email) LIKE $${values.length} OR LOWER(notes) LIKE $${values.length})`
      );
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM sales_prospects ${where} ORDER BY last_activity_at DESC`,
      values
    );
    return result.rows.map(mapProspect);
  }

  async createProspect(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_prospects (
        id, company_id, full_name, contact_name, phone, email, status, source, tags, notes, assigned_user, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb)`,
      [
        id,
        payload.companyId || null,
        payload.fullName,
        payload.contactName || payload.fullName,
        payload.phone || '',
        payload.email || '',
        payload.status || 'new_lead',
        payload.source || '',
        JSON.stringify(payload.tags || []),
        payload.notes || '',
        payload.assignedUser || '',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_prospects WHERE id = $1', [id]);
    return mapProspect(result.rows[0]);
  }

  async updateProspect(id, payload) {
    const existing = (await this.listProspects()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Prospect not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE sales_prospects SET
        company_id=$2, full_name=$3, contact_name=$4, phone=$5, email=$6, status=$7, source=$8,
        tags=$9::jsonb, notes=$10, assigned_user=$11, metadata=$12::jsonb,
        last_activity_at=NOW(), updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.companyId || null,
        next.fullName,
        next.contactName || next.fullName,
        next.phone || '',
        next.email || '',
        next.status || 'new_lead',
        next.source || '',
        JSON.stringify(next.tags || []),
        next.notes || '',
        next.assignedUser || '',
        JSON.stringify(next.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_prospects WHERE id = $1', [id]);
    return mapProspect(result.rows[0]);
  }

  async listProducts() {
    const result = await this.pool.query('SELECT * FROM sales_products ORDER BY name ASC');
    return result.rows.map(mapProduct);
  }

  async createProduct(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_products (
        id, name, category, description, features, unit_price, currency, availability, internal_notes, knowledge_refs, metadata
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`,
      [
        id,
        payload.name,
        payload.category || 'service',
        payload.description || '',
        JSON.stringify(payload.features || []),
        payload.unitPrice || 0,
        payload.currency || 'MAD',
        payload.availability || 'available',
        payload.internalNotes || '',
        JSON.stringify(payload.knowledgeRefs || []),
        JSON.stringify(payload.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_products WHERE id = $1', [id]);
    return mapProduct(result.rows[0]);
  }

  async listDeals() {
    const result = await this.pool.query('SELECT * FROM sales_deals ORDER BY updated_at DESC');
    return result.rows.map(mapDeal);
  }

  async createDeal(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_deals (
        id, title, company_id, prospect_id, stage, probability, expected_revenue, expected_close_date,
        currency, assigned_user, notes, approval_status, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)`,
      [
        id,
        payload.title,
        payload.companyId || null,
        payload.prospectId || null,
        payload.stage || 'new_lead',
        payload.probability ?? 10,
        payload.expectedRevenue || 0,
        payload.expectedCloseDate || null,
        payload.currency || 'MAD',
        payload.assignedUser || '',
        payload.notes || '',
        payload.approvalStatus || 'draft',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_deals WHERE id = $1', [id]);
    return mapDeal(result.rows[0]);
  }

  async updateDeal(id, payload) {
    const existing = (await this.listDeals()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Deal not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE sales_deals SET
        title=$2, company_id=$3, prospect_id=$4, stage=$5, probability=$6, expected_revenue=$7,
        expected_close_date=$8, currency=$9, assigned_user=$10, notes=$11, approval_status=$12,
        metadata=$13::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.title,
        next.companyId || null,
        next.prospectId || null,
        next.stage || 'new_lead',
        next.probability ?? 10,
        next.expectedRevenue || 0,
        next.expectedCloseDate || null,
        next.currency || 'MAD',
        next.assignedUser || '',
        next.notes || '',
        next.approvalStatus || 'draft',
        JSON.stringify(next.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_deals WHERE id = $1', [id]);
    return mapDeal(result.rows[0]);
  }

  async listQuotations(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.approvalStatus) {
      values.push(filters.approvalStatus);
      clauses.push(`approval_status = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM sales_quotations ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapQuotation);
  }

  async getQuotation(id) {
    const result = await this.pool.query('SELECT * FROM sales_quotations WHERE id = $1', [id]);
    return mapQuotation(result.rows[0]);
  }

  async createQuotation(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_quotations (
        id, deal_id, company_id, prospect_id, customer_name, title, status, approval_status, currency,
        discount_percent, discount_suggestion, tax_percent, subtotal, tax_amount, total, terms,
        validity_days, notes, lines, body, source_prompt, conversation_id, metadata
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22,$23::jsonb
      )`,
      [
        id,
        payload.dealId || null,
        payload.companyId || null,
        payload.prospectId || null,
        payload.customerName,
        payload.title,
        payload.status || 'draft',
        payload.approvalStatus || 'draft',
        payload.currency || 'MAD',
        payload.discountPercent || 0,
        payload.discountSuggestion || 0,
        payload.taxPercent ?? 20,
        payload.subtotal || 0,
        payload.taxAmount || 0,
        payload.total || 0,
        payload.terms || '',
        payload.validityDays ?? 30,
        payload.notes || '',
        JSON.stringify(payload.lines || []),
        payload.body || '',
        payload.sourcePrompt || '',
        payload.conversationId || null,
        JSON.stringify(payload.metadata || {}),
      ]
    );
    return this.getQuotation(id);
  }

  async updateQuotation(id, payload) {
    const existing = await this.getQuotation(id);
    if (!existing) throw Object.assign(new Error('Quotation not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE sales_quotations SET
        deal_id=$2, company_id=$3, prospect_id=$4, customer_name=$5, title=$6, status=$7, approval_status=$8,
        currency=$9, discount_percent=$10, discount_suggestion=$11, tax_percent=$12, subtotal=$13,
        tax_amount=$14, total=$15, terms=$16, validity_days=$17, notes=$18, lines=$19::jsonb, body=$20,
        source_prompt=$21, conversation_id=$22, approved_at=$23, approved_by=$24, metadata=$25::jsonb,
        updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.dealId || null,
        next.companyId || null,
        next.prospectId || null,
        next.customerName,
        next.title,
        next.status || 'draft',
        next.approvalStatus || 'draft',
        next.currency || 'MAD',
        next.discountPercent || 0,
        next.discountSuggestion || 0,
        next.taxPercent ?? 20,
        next.subtotal || 0,
        next.taxAmount || 0,
        next.total || 0,
        next.terms || '',
        next.validityDays ?? 30,
        next.notes || '',
        JSON.stringify(next.lines || []),
        next.body || '',
        next.sourcePrompt || '',
        next.conversationId || null,
        next.approvedAt || null,
        next.approvedBy || null,
        JSON.stringify(next.metadata || {}),
      ]
    );
    return this.getQuotation(id);
  }

  async listDocuments(filters = {}) {
    const clauses = [];
    const values = [];
    if (filters.approvalStatus) {
      values.push(filters.approvalStatus);
      clauses.push(`approval_status = $${values.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM sales_documents ${where} ORDER BY updated_at DESC`,
      values
    );
    return result.rows.map(mapDocument);
  }

  async createDocument(payload) {
    const id = payload.id || randomUUID();
    await this.pool.query(
      `INSERT INTO sales_documents (
        id, deal_id, quotation_id, document_type, title, body, approval_status, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        id,
        payload.dealId || null,
        payload.quotationId || null,
        payload.documentType || 'other',
        payload.title,
        payload.body || '',
        payload.approvalStatus || 'draft',
        JSON.stringify(payload.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_documents WHERE id = $1', [id]);
    return mapDocument(result.rows[0]);
  }

  async updateDocument(id, payload) {
    const existing = (await this.listDocuments()).find((item) => item.id === id);
    if (!existing) throw Object.assign(new Error('Document not found.'), { statusCode: 404 });
    const next = { ...existing, ...payload };
    await this.pool.query(
      `UPDATE sales_documents SET
        deal_id=$2, quotation_id=$3, document_type=$4, title=$5, body=$6, approval_status=$7,
        approved_at=$8, approved_by=$9, metadata=$10::jsonb, updated_at=NOW()
       WHERE id=$1`,
      [
        id,
        next.dealId || null,
        next.quotationId || null,
        next.documentType,
        next.title,
        next.body || '',
        next.approvalStatus || 'draft',
        next.approvedAt || null,
        next.approvedBy || null,
        JSON.stringify(next.metadata || {}),
      ]
    );
    const result = await this.pool.query('SELECT * FROM sales_documents WHERE id = $1', [id]);
    return mapDocument(result.rows[0]);
  }

  async getDashboardStats() {
    const [prospects, deals, quotations, products] = await Promise.all([
      this.listProspects(),
      this.listDeals(),
      this.listQuotations(),
      this.listProducts(),
    ]);

    const activeProspects = prospects.filter(
      (prospect) => !['won', 'lost'].includes(prospect.status)
    ).length;
    const won = deals.filter((deal) => deal.stage === 'won');
    const lost = deals.filter((deal) => deal.stage === 'lost');
    const openDeals = deals.filter((deal) => !['won', 'lost'].includes(deal.stage));
    const pipelineValue = openDeals.reduce(
      (sum, deal) => sum + Number(deal.expectedRevenue || 0),
      0
    );
    const averageDealSize =
      won.length > 0
        ? won.reduce((sum, deal) => sum + Number(deal.expectedRevenue || 0), 0) / won.length
        : 0;
    const conversionRate =
      deals.length > 0 ? Number(((won.length / deals.length) * 100).toFixed(1)) : 0;
    const pendingApprovals = quotations.filter(
      (quotation) => quotation.approvalStatus === 'pending_review'
    ).length;
    const approvedQuotations = quotations.filter((quotation) =>
      ['approved', 'exported'].includes(quotation.approvalStatus)
    ).length;

    return {
      activeProspects,
      openDeals: openDeals.length,
      pipelineValue: Number(pipelineValue.toFixed(2)),
      wonOpportunities: won.length,
      lostOpportunities: lost.length,
      averageDealSize: Number(averageDealSize.toFixed(2)),
      conversionRate,
      pendingApprovals,
      approvedQuotations,
      products: products.length,
      quotations: quotations.length,
    };
  }

  async searchAll(query) {
    const q = `%${String(query || '').toLowerCase()}%`;
    const [prospects, companies, deals, products, quotations] = await Promise.all([
      this.pool.query(
        `SELECT id, full_name AS title, 'prospect' AS type FROM sales_prospects WHERE LOWER(full_name) LIKE $1 OR LOWER(email) LIKE $1 LIMIT 15`,
        [q]
      ),
      this.pool.query(
        `SELECT id, name AS title, 'company' AS type FROM sales_companies WHERE LOWER(name) LIKE $1 LIMIT 15`,
        [q]
      ),
      this.pool.query(
        `SELECT id, title, 'deal' AS type FROM sales_deals WHERE LOWER(title) LIKE $1 LIMIT 15`,
        [q]
      ),
      this.pool.query(
        `SELECT id, name AS title, 'product' AS type FROM sales_products WHERE LOWER(name) LIKE $1 LIMIT 15`,
        [q]
      ),
      this.pool.query(
        `SELECT id, title, 'quotation' AS type FROM sales_quotations WHERE LOWER(title) LIKE $1 OR LOWER(customer_name) LIKE $1 LIMIT 15`,
        [q]
      ),
    ]);
    return [
      ...prospects.rows,
      ...companies.rows,
      ...deals.rows,
      ...products.rows,
      ...quotations.rows,
    ];
  }
}
