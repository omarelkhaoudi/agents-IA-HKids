CREATE TABLE IF NOT EXISTS document_folders (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_folders_status_check CHECK (
    status IN ('active', 'archived', 'deleted')
  )
);

CREATE TABLE IF NOT EXISTS knowledge_document_files (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  extension TEXT NOT NULL DEFAULT '',
  byte_size BIGINT NOT NULL DEFAULT 0,
  checksum TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  ocr_status TEXT NOT NULL DEFAULT 'pending',
  virus_scan_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_document_files_ocr_check CHECK (
    ocr_status IN ('pending', 'skipped', 'ready', 'failed', 'unsupported')
  ),
  CONSTRAINT knowledge_document_files_virus_check CHECK (
    virus_scan_status IN ('pending', 'skipped', 'clean', 'infected', 'failed')
  )
);

CREATE TABLE IF NOT EXISTS dms_audit_events (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  folder_id TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dms_upload_sessions (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL DEFAULT '',
  total_chunks INTEGER NOT NULL DEFAULT 1,
  received_chunks INTEGER NOT NULL DEFAULT 0,
  byte_size BIGINT NOT NULL DEFAULT 0,
  checksum TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  actor TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dms_upload_sessions_status_check CHECK (
    status IN ('open', 'completed', 'cancelled', 'failed')
  )
);

ALTER TABLE knowledge_documents ADD COLUMN folder_id TEXT;
ALTER TABLE knowledge_documents ADD COLUMN ai_visibility BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE knowledge_documents ADD COLUMN security_classification TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE knowledge_documents ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE knowledge_documents ADD COLUMN mime_type TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN checksum TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN byte_size BIGINT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN storage_key TEXT NOT NULL DEFAULT '';

ALTER TABLE knowledge_documents DROP CONSTRAINT knowledge_documents_status_check;
ALTER TABLE knowledge_documents
  ADD CONSTRAINT knowledge_documents_status_check
  CHECK (status IN ('draft', 'review', 'approved', 'active', 'archived', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_folder ON knowledge_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_files_document ON knowledge_document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_dms_audit_document ON dms_audit_events(document_id);
CREATE INDEX IF NOT EXISTS idx_dms_audit_folder ON dms_audit_events(folder_id);
