CREATE TABLE IF NOT EXISTS knowledge_collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'folder',
  color TEXT NOT NULL DEFAULT 'cyan',
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 2,
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_collections_status_check CHECK (
    status IN ('active', 'archived', 'draft')
  )
);

CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  author TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_document_versions_unique UNIQUE (document_id, version)
);

CREATE TABLE IF NOT EXISTS knowledge_document_links (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  linked_type TEXT NOT NULL,
  linked_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_document_links_type_check CHECK (
    linked_type IN ('prompt', 'workflow', 'agent', 'template', 'document')
  )
);

CREATE TABLE IF NOT EXISTS knowledge_document_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'slate',
  parent_id TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE knowledge_documents ADD COLUMN collection_id TEXT;
ALTER TABLE knowledge_documents ADD COLUMN language TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE knowledge_documents ADD COLUMN owner TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE knowledge_documents ADD COLUMN review_date TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN expiration_date TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN ai_usage_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN approval_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN rejection_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN feedback_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN completeness_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN last_reviewed_at TIMESTAMPTZ;
ALTER TABLE knowledge_documents ADD COLUMN last_reviewed_by TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN deleted_at TIMESTAMPTZ;

ALTER TABLE knowledge_documents DROP CONSTRAINT knowledge_documents_status_check;
ALTER TABLE knowledge_documents
  ADD CONSTRAINT knowledge_documents_status_check
  CHECK (status IN ('draft', 'review', 'active', 'archived', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_collection ON knowledge_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_language ON knowledge_documents(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_owner ON knowledge_documents(owner);
CREATE INDEX IF NOT EXISTS idx_knowledge_versions_document ON knowledge_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_links_document ON knowledge_document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_events_document ON knowledge_document_events(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags_name ON knowledge_tags(name);
