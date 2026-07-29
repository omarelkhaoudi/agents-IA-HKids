CREATE TABLE IF NOT EXISTS prompt_libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  language TEXT NOT NULL DEFAULT 'fr',
  priority INTEGER NOT NULL DEFAULT 2,
  version INTEGER NOT NULL DEFAULT 1,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prompt_libraries_status_check CHECK (
    status IN ('active', 'archived', 'draft')
  )
);

CREATE TABLE IF NOT EXISTS prompt_definition_versions (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prompt_definition_versions_unique UNIQUE (prompt_id, version)
);

CREATE TABLE IF NOT EXISTS prompt_definition_links (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  linked_type TEXT NOT NULL,
  linked_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prompt_definition_links_type_check CHECK (
    linked_type IN ('document', 'collection', 'template', 'workflow', 'agent', 'analytics')
  )
);

CREATE TABLE IF NOT EXISTS prompt_definition_events (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompt_test_runs (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  assembled_prompt TEXT NOT NULL DEFAULT '',
  output_text TEXT NOT NULL DEFAULT '',
  retrieved_knowledge TEXT NOT NULL DEFAULT '',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prompt_definitions ADD COLUMN library_id TEXT;
ALTER TABLE prompt_definitions ADD COLUMN category TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE prompt_definitions ADD COLUMN language TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE prompt_definitions ADD COLUMN owner TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN author TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN priority INTEGER NOT NULL DEFAULT 2;
ALTER TABLE prompt_definitions ADD COLUMN agent_code TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN target_model TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN temperature NUMERIC(4, 2);
ALTER TABLE prompt_definitions ADD COLUMN max_tokens INTEGER;
ALTER TABLE prompt_definitions ADD COLUMN knowledge_collection_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE prompt_definitions ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN approval_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN rejection_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN feedback_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN completeness_score NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE prompt_definitions ADD COLUMN last_reviewed_at TIMESTAMPTZ;
ALTER TABLE prompt_definitions ADD COLUMN last_reviewed_by TEXT NOT NULL DEFAULT '';
ALTER TABLE prompt_definitions ADD COLUMN published_at TIMESTAMPTZ;
ALTER TABLE prompt_definitions ADD COLUMN average_latency_ms NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE prompt_definitions DROP CONSTRAINT prompt_definitions_status_check;
ALTER TABLE prompt_definitions
  ADD CONSTRAINT prompt_definitions_status_check
  CHECK (status IN ('draft', 'review', 'approved', 'active', 'archived', 'deprecated'));

CREATE INDEX IF NOT EXISTS idx_prompt_definitions_library ON prompt_definitions(library_id);
CREATE INDEX IF NOT EXISTS idx_prompt_definitions_agent ON prompt_definitions(agent_code);
CREATE INDEX IF NOT EXISTS idx_prompt_definitions_language ON prompt_definitions(language);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_definition_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_links_prompt ON prompt_definition_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_events_prompt ON prompt_definition_events(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_test_runs_prompt ON prompt_test_runs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_libraries_status ON prompt_libraries(status);
