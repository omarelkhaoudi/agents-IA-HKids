CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  language TEXT NOT NULL,
  current_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  reference TEXT NOT NULL,
  structured_document JSONB NOT NULL,
  resolved_variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_preview TEXT NOT NULL,
  validation_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  available_export_formats JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_documents (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  generated_document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, generated_document_id)
);

CREATE TABLE IF NOT EXISTS conversation_knowledge (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, document_id)
);

CREATE TABLE IF NOT EXISTS conversation_prompts (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_generated_documents_conversation_id ON generated_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at ON generated_documents(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_documents_updated_at ON generated_documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_generated_documents_document_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON generated_documents(status);
