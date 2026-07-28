CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  default_provider TEXT NOT NULL DEFAULT 'anthropic',
  default_model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-latest',
  temperature NUMERIC(4, 2) NOT NULL DEFAULT 0.3,
  max_tokens INTEGER NOT NULL DEFAULT 1500,
  timeout INTEGER NOT NULL DEFAULT 30000,
  retry_count INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_prompt_links (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL,
  PRIMARY KEY (agent_id, prompt_id)
);

CREATE TABLE IF NOT EXISTS agent_document_links (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  PRIMARY KEY (agent_id, document_id)
);

CREATE TABLE IF NOT EXISTS agent_workflow_links (
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  workflow_code TEXT NOT NULL,
  PRIMARY KEY (agent_id, workflow_code)
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(code);
