ALTER TABLE workflow_instances ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE workflow_instances ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE workflow_instances ADD COLUMN subject_type TEXT NOT NULL DEFAULT 'generated_document';
ALTER TABLE workflow_instances ADD COLUMN subject_id TEXT NOT NULL DEFAULT '';
ALTER TABLE workflow_instances ADD COLUMN workflow_definition_id TEXT;
ALTER TABLE workflow_instances ADD COLUMN workflow_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workflow_instances ADD COLUMN policy_id TEXT;
ALTER TABLE workflow_instances ADD COLUMN agent_code TEXT NOT NULL DEFAULT '';
ALTER TABLE workflow_instances ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE workflow_instances ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'sequential';
ALTER TABLE workflow_instances ADD COLUMN approval_strategy TEXT NOT NULL DEFAULT 'all_required';
ALTER TABLE workflow_instances ADD COLUMN expected_duration_minutes INTEGER NOT NULL DEFAULT 1440;
ALTER TABLE workflow_instances ADD COLUMN maximum_duration_minutes INTEGER NOT NULL DEFAULT 2880;
ALTER TABLE workflow_instances ADD COLUMN deadline_at TIMESTAMPTZ;
ALTER TABLE workflow_instances ADD COLUMN paused_at TIMESTAMPTZ;
ALTER TABLE workflow_instances ADD COLUMN resumed_at TIMESTAMPTZ;
ALTER TABLE workflow_instances ADD COLUMN escalated_at TIMESTAMPTZ;
ALTER TABLE workflow_instances ADD COLUMN completed_at TIMESTAMPTZ;
ALTER TABLE workflow_instances ADD COLUMN breach_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflow_instances ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
UPDATE workflow_instances SET subject_id = document_id WHERE subject_id = '' AND document_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS workflow_policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  policy_type TEXT NOT NULL DEFAULT 'generic',
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback_approvers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner TEXT NOT NULL DEFAULT '',
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'normal',
  policy_id TEXT REFERENCES workflow_policies(id) ON DELETE SET NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER,
  execution_mode TEXT NOT NULL DEFAULT 'sequential',
  approval_strategy TEXT NOT NULL DEFAULT 'all_required',
  approval_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  sla JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_definition_versions (
  id TEXT PRIMARY KEY,
  workflow_definition_id TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  change_summary TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workflow_definition_id, version)
);

CREATE TABLE IF NOT EXISTS workflow_approval_tasks (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  level_index INTEGER NOT NULL DEFAULT 1,
  level_name TEXT NOT NULL DEFAULT '',
  reviewer TEXT NOT NULL DEFAULT '',
  reviewer_role TEXT NOT NULL DEFAULT '',
  reviewer_department TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  vote_weight INTEGER NOT NULL DEFAULT 1,
  delegated_from TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decision TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_delegations (
  id TEXT PRIMARY KEY,
  delegator TEXT NOT NULL,
  delegate TEXT NOT NULL,
  delegation_type TEXT NOT NULL DEFAULT 'temporary',
  scope TEXT NOT NULL DEFAULT 'all',
  reason TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_escalations (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT REFERENCES workflow_instances(id) ON DELETE CASCADE,
  approval_task_id TEXT REFERENCES workflow_approval_tasks(id) ON DELETE SET NULL,
  escalation_type TEXT NOT NULL DEFAULT 'timeout',
  from_reviewer TEXT NOT NULL DEFAULT '',
  to_reviewer TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workflow_sla_events (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id TEXT PRIMARY KEY,
  workflow_instance_id TEXT,
  channel TEXT NOT NULL DEFAULT 'in_app',
  recipient TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_subject ON workflow_instances(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_governance ON workflow_instances(workflow_definition_id, current_state, priority);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON workflow_definitions(status, category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_status ON workflow_templates(status, category);
CREATE INDEX IF NOT EXISTS idx_workflow_approval_tasks_instance ON workflow_approval_tasks(workflow_instance_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_approval_tasks_reviewer ON workflow_approval_tasks(reviewer, status);
CREATE INDEX IF NOT EXISTS idx_workflow_delegations_active ON workflow_delegations(delegator, delegate, status);
CREATE INDEX IF NOT EXISTS idx_workflow_escalations_instance ON workflow_escalations(workflow_instance_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_sla_events_instance ON workflow_sla_events(workflow_instance_id, event_type);
