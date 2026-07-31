CREATE TABLE IF NOT EXISTS observability_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL DEFAULT 'api',
  actor TEXT NOT NULL DEFAULT '',
  subject_type TEXT NOT NULL DEFAULT '',
  subject_id TEXT,
  agent_code TEXT,
  conversation_id TEXT,
  request_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT observability_events_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE TABLE IF NOT EXISTS observability_alerts (
  id TEXT PRIMARY KEY,
  alert_key TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  observed_value NUMERIC(18,6) NOT NULL DEFAULT 0,
  threshold_value NUMERIC(18,6) NOT NULL DEFAULT 0,
  occurrences INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT observability_alerts_status_check CHECK (
    status IN ('open', 'acknowledged', 'resolved')
  ),
  CONSTRAINT observability_alerts_severity_check CHECK (
    severity IN ('info', 'warning', 'critical')
  )
);

CREATE TABLE IF NOT EXISTS observability_metric_snapshots (
  id TEXT PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_minutes INTEGER NOT NULL DEFAULT 60,
  requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  active_requests INTEGER NOT NULL DEFAULT 0,
  queued_requests INTEGER NOT NULL DEFAULT 0,
  average_latency_ms INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  heap_used_bytes BIGINT NOT NULL DEFAULT 0,
  cpu_usage_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  uptime_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_observability_events_created_at ON observability_events(created_at);
CREATE INDEX IF NOT EXISTS idx_observability_events_category ON observability_events(category);
CREATE INDEX IF NOT EXISTS idx_observability_events_severity ON observability_events(severity);
CREATE INDEX IF NOT EXISTS idx_observability_events_type ON observability_events(event_type);
CREATE INDEX IF NOT EXISTS idx_observability_events_subject ON observability_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_observability_alerts_key ON observability_alerts(alert_key);
CREATE INDEX IF NOT EXISTS idx_observability_alerts_status ON observability_alerts(status);
CREATE INDEX IF NOT EXISTS idx_observability_snapshots_captured_at ON observability_metric_snapshots(captured_at);
