CREATE TABLE IF NOT EXISTS sales_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_prospects (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES sales_companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new_lead',
  source TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  assigned_user TEXT NOT NULL DEFAULT '',
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_prospects_status_check CHECK (
    status IN ('new_lead', 'qualified', 'meeting', 'proposal', 'negotiation', 'won', 'lost', 'nurturing')
  )
);

CREATE TABLE IF NOT EXISTS sales_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'service',
  description TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  availability TEXT NOT NULL DEFAULT 'available',
  internal_notes TEXT NOT NULL DEFAULT '',
  knowledge_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_products_availability_check CHECK (
    availability IN ('available', 'limited', 'unavailable')
  )
);

CREATE TABLE IF NOT EXISTS sales_deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company_id TEXT REFERENCES sales_companies(id) ON DELETE SET NULL,
  prospect_id TEXT REFERENCES sales_prospects(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'new_lead',
  probability INTEGER NOT NULL DEFAULT 10,
  expected_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  expected_close_date DATE,
  currency TEXT NOT NULL DEFAULT 'MAD',
  assigned_user TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_deals_stage_check CHECK (
    stage IN ('new_lead', 'qualified', 'meeting', 'proposal', 'negotiation', 'won', 'lost')
  ),
  CONSTRAINT sales_deals_approval_check CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')
  ),
  CONSTRAINT sales_deals_probability_check CHECK (probability >= 0 AND probability <= 100)
);

CREATE TABLE IF NOT EXISTS sales_quotations (
  id TEXT PRIMARY KEY,
  deal_id TEXT REFERENCES sales_deals(id) ON DELETE SET NULL,
  company_id TEXT REFERENCES sales_companies(id) ON DELETE SET NULL,
  prospect_id TEXT REFERENCES sales_prospects(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'MAD',
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  discount_suggestion NUMERIC(5, 2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5, 2) NOT NULL DEFAULT 20,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  terms TEXT NOT NULL DEFAULT '',
  validity_days INTEGER NOT NULL DEFAULT 30,
  notes TEXT NOT NULL DEFAULT '',
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  body TEXT NOT NULL DEFAULT '',
  source_prompt TEXT NOT NULL DEFAULT '',
  conversation_id TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sales_quotations_status_check CHECK (
    status IN ('draft', 'sent_manual', 'accepted', 'rejected', 'archived')
  ),
  CONSTRAINT sales_quotations_approval_check CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')
  )
);

CREATE TABLE IF NOT EXISTS sales_documents (
  id TEXT PRIMARY KEY,
  deal_id TEXT REFERENCES sales_deals(id) ON DELETE SET NULL,
  quotation_id TEXT REFERENCES sales_quotations(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  CONSTRAINT sales_documents_type_check CHECK (
    document_type IN (
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
      'other'
    )
  ),
  CONSTRAINT sales_documents_approval_check CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_prospects_status ON sales_prospects(status);
CREATE INDEX IF NOT EXISTS idx_sales_prospects_company_id ON sales_prospects(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_deals_stage ON sales_deals(stage);
CREATE INDEX IF NOT EXISTS idx_sales_deals_company_id ON sales_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_approval ON sales_quotations(approval_status);
CREATE INDEX IF NOT EXISTS idx_sales_products_category ON sales_products(category);
CREATE INDEX IF NOT EXISTS idx_sales_documents_type ON sales_documents(document_type);
