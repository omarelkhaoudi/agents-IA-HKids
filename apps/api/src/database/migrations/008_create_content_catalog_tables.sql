CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT 'PDF',
  source_file_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_documents_status_check CHECK (status IN ('active', 'review', 'archived'))
);

CREATE TABLE IF NOT EXISTS prompt_definitions (
  id TEXT PRIMARY KEY,
  prompt_group_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  objective TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_style TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prompt_definitions_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_prompt_definitions_status ON prompt_definitions(status);
CREATE INDEX IF NOT EXISTS idx_prompt_definitions_group ON prompt_definitions(prompt_group_id);
