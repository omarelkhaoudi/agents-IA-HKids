ALTER TABLE knowledge_documents ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE knowledge_documents ADD COLUMN processing_error TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN indexed_at TIMESTAMPTZ;
ALTER TABLE knowledge_documents ADD COLUMN index_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN embedding_status TEXT NOT NULL DEFAULT 'missing';
ALTER TABLE knowledge_documents ADD COLUMN embedding_provider TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN embedding_model TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN average_chunk_tokens NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN summary TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN keywords JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE knowledge_documents ADD COLUMN detected_language TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN duplicate_of TEXT;
ALTER TABLE knowledge_documents ADD COLUMN last_index_error TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN retrieval_success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE knowledge_documents ADD COLUMN retrieval_failure_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS knowledge_vector_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  section_title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  char_count INTEGER NOT NULL DEFAULT 0,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  ai_visibility BOOLEAN NOT NULL DEFAULT TRUE,
  quality_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
  freshness_score NUMERIC(6, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_vector_chunks_status_check CHECK (
    status IN ('pending', 'indexed', 'stale', 'failed')
  ),
  CONSTRAINT knowledge_vector_chunks_unique UNIQUE (document_id, chunk_number)
);

CREATE TABLE IF NOT EXISTS knowledge_vector_embeddings (
  chunk_id TEXT PRIMARY KEY REFERENCES knowledge_vector_chunks(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  dimensions INTEGER NOT NULL DEFAULT 0,
  embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_vector_embeddings_status_check CHECK (
    status IN ('ready', 'missing', 'failed', 'stale')
  )
);

CREATE TABLE IF NOT EXISTS knowledge_index_jobs (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  total_documents INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER NOT NULL DEFAULT 0,
  processed_documents INTEGER NOT NULL DEFAULT 0,
  processed_chunks INTEGER NOT NULL DEFAULT 0,
  failed_documents INTEGER NOT NULL DEFAULT 0,
  failed_chunks INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_index_jobs_scope_check CHECK (
    scope IN ('document', 'collection', 'all', 'cache')
  ),
  CONSTRAINT knowledge_index_jobs_status_check CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS knowledge_retrieval_events (
  id TEXT PRIMARY KEY,
  question_hash TEXT NOT NULL DEFAULT '',
  agent_code TEXT NOT NULL DEFAULT '',
  prompt_id TEXT,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'success',
  top_k INTEGER NOT NULL DEFAULT 0,
  retrieved_chunk_count INTEGER NOT NULL DEFAULT 0,
  semantic_top_score NUMERIC(8, 6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_retrieval_events_status_check CHECK (
    status IN ('success', 'fallback', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_processing_status ON knowledge_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding_status ON knowledge_documents(embedding_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_content_hash ON knowledge_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_vector_chunks_document_id ON knowledge_vector_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_vector_chunks_status ON knowledge_vector_chunks(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_vector_embeddings_provider_model ON knowledge_vector_embeddings(provider, model);
CREATE INDEX IF NOT EXISTS idx_knowledge_index_jobs_status ON knowledge_index_jobs(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_index_jobs_scope ON knowledge_index_jobs(scope, target_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_retrieval_events_created_at ON knowledge_retrieval_events(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_retrieval_events_agent ON knowledge_retrieval_events(agent_code);
