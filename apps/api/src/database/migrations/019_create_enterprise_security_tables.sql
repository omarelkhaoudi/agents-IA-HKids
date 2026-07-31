ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN last_login_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN last_login_user_agent TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN force_password_reset BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE users ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE users ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

UPDATE users SET owner_id = id WHERE owner_id = '';

ALTER TABLE refresh_tokens ADD COLUMN device_id TEXT NOT NULL DEFAULT '';
ALTER TABLE refresh_tokens ADD COLUMN ip_address TEXT NOT NULL DEFAULT '';
ALTER TABLE refresh_tokens ADD COLUMN user_agent TEXT NOT NULL DEFAULT '';
ALTER TABLE refresh_tokens ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE refresh_tokens ADD COLUMN rotated_from_token_id TEXT;
ALTER TABLE refresh_tokens ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE refresh_tokens ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_id TEXT REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT auth_sessions_status_check CHECK (
    status IN ('active', 'revoked', 'expired')
  )
);

ALTER TABLE conversations ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE conversations ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE conversations ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE messages ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE messages ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE messages ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE generated_documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE generated_documents ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE generated_documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE generated_documents SET owner_id = COALESCE(created_by, '') WHERE owner_id = '';

ALTER TABLE workflow_instances ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE workflow_instances ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE workflow_instances ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE workflow_history ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE workflow_history ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE workflow_history ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE workflow_history SET owner_id = actor WHERE owner_id = '';

ALTER TABLE workflow_comments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE workflow_comments ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE workflow_comments ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE workflow_comments SET owner_id = actor WHERE owner_id = '';

ALTER TABLE workflow_assignments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE workflow_assignments ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE workflow_assignments ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE workflow_assignments SET owner_id = reviewer WHERE owner_id = '';

ALTER TABLE feedback ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE feedback ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE feedback ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE feedback_patterns ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE feedback_patterns ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE feedback_patterns ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE prompt_improvements ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_improvements ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_improvements ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE document_corrections ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE document_corrections ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE document_corrections ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE knowledge_collections ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_collections ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_collections ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE knowledge_collections SET owner_id = owner WHERE owner_id = '';

ALTER TABLE knowledge_documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_documents ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_documents ADD COLUMN acl_visibility TEXT NOT NULL DEFAULT 'organization';
ALTER TABLE knowledge_documents ADD COLUMN acl_inherits BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE knowledge_documents SET owner_id = owner WHERE owner_id = '' AND owner <> '';
UPDATE knowledge_documents SET owner_id = author WHERE owner_id = '' AND author <> '';

ALTER TABLE knowledge_document_versions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_document_versions ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_document_versions ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE knowledge_document_links ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_document_links ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_document_links ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE knowledge_document_events ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_document_events ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_document_events ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE knowledge_document_events SET owner_id = actor WHERE owner_id = '';

ALTER TABLE document_folders ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE document_folders ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE document_folders ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE document_folders ADD COLUMN acl_visibility TEXT NOT NULL DEFAULT 'organization';
ALTER TABLE document_folders ADD COLUMN acl_inherits BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE document_folders SET owner_id = owner WHERE owner_id = '';

ALTER TABLE knowledge_document_files ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE knowledge_document_files ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE knowledge_document_files ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE dms_audit_events ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE dms_audit_events ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE dms_audit_events ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE dms_audit_events SET owner_id = actor WHERE owner_id = '';

ALTER TABLE dms_upload_sessions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE dms_upload_sessions ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE dms_upload_sessions ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE dms_upload_sessions SET owner_id = actor WHERE owner_id = '';

ALTER TABLE prompt_libraries ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_libraries ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_libraries ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE prompt_libraries SET owner_id = owner WHERE owner_id = '';

ALTER TABLE prompt_definitions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_definitions ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_definitions ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE prompt_definitions SET owner_id = owner WHERE owner_id = '' AND owner <> '';
UPDATE prompt_definitions SET owner_id = author WHERE owner_id = '' AND author <> '';

ALTER TABLE prompt_definition_versions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_definition_versions ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_definition_versions ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE prompt_definition_links ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_definition_links ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_definition_links ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE prompt_definition_events ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_definition_events ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_definition_events ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE prompt_definition_events SET owner_id = actor WHERE owner_id = '';

ALTER TABLE prompt_test_runs ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE prompt_test_runs ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE prompt_test_runs ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE prompt_test_runs SET owner_id = actor WHERE owner_id = '';

ALTER TABLE cm_campaigns ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE cm_campaigns ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE cm_campaigns ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE cm_posts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE cm_posts ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE cm_posts ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE cm_brand_guidelines ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE cm_brand_guidelines ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE cm_brand_guidelines ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE cm_library_items ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE cm_library_items ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE cm_library_items ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE sales_companies ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_companies ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_companies ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_prospects ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_prospects ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_prospects ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE sales_prospects SET owner_id = assigned_user WHERE owner_id = '';
ALTER TABLE sales_products ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_products ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_products ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_deals ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_deals ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_deals ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE sales_deals SET owner_id = assigned_user WHERE owner_id = '';
ALTER TABLE sales_quotations ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_quotations ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_quotations ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE sales_documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE sales_documents ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE sales_documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

ALTER TABLE hr_employees ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_employees ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_employees ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE hr_employees SET owner_id = email WHERE owner_id = '';
ALTER TABLE hr_candidates ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_candidates ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_candidates ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
UPDATE hr_candidates SET owner_id = email WHERE owner_id = '';
ALTER TABLE hr_job_descriptions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_job_descriptions ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_job_descriptions ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE hr_leave_requests ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_leave_requests ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_leave_requests ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE hr_absences ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_absences ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_absences ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE hr_documents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE hr_documents ADD COLUMN organization_id TEXT NOT NULL DEFAULT 'default-organization';
ALTER TABLE hr_documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  actor_user_id TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  subject_type TEXT NOT NULL DEFAULT '',
  subject_id TEXT,
  action TEXT NOT NULL DEFAULT '',
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT security_events_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE TABLE IF NOT EXISTS document_acl_entries (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  folder_id TEXT,
  principal_type TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'read',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  inherited BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_acl_entries_principal_check CHECK (
    principal_type IN ('user', 'role', 'team', 'organization')
  ),
  CONSTRAINT document_acl_entries_access_check CHECK (
    access_level IN ('read', 'write', 'approve', 'export', 'delete', 'owner')
  )
);

CREATE TABLE IF NOT EXISTS secret_inventory (
  secret_name TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'environment',
  status TEXT NOT NULL DEFAULT 'unknown',
  source TEXT NOT NULL DEFAULT '',
  last_validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT secret_inventory_status_check CHECK (
    status IN ('healthy', 'missing', 'expired', 'rotating', 'unknown')
  )
);

CREATE TABLE IF NOT EXISTS encryption_key_records (
  key_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT encryption_key_records_status_check CHECK (
    status IN ('active', 'retired', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session ON refresh_tokens(user_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant ON auth_sessions(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_subject ON security_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_document_acl_document ON document_acl_entries(document_id);
CREATE INDEX IF NOT EXISTS idx_document_acl_folder ON document_acl_entries(folder_id);
CREATE INDEX IF NOT EXISTS idx_document_acl_principal ON document_acl_entries(principal_type, principal_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant ON knowledge_documents(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_owner_id ON knowledge_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_tenant ON document_folders(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_tenant ON generated_documents(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_prompt_definitions_tenant ON prompt_definitions(tenant_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_tenant ON workflow_instances(tenant_id, organization_id);
