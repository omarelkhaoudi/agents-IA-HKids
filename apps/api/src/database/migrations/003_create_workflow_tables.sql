CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL,
  approver_mode TEXT NOT NULL DEFAULT 'single',
  required_approvals INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_history (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_comments (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_assignments (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_document_id ON workflow_instances(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_instance_id ON workflow_history(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_comments_instance_id ON workflow_comments(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assignments_instance_id ON workflow_assignments(workflow_instance_id);
