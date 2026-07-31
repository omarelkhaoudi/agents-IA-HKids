CREATE TABLE IF NOT EXISTS evaluation_runs (
  id TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL DEFAULT 'conversation',
  subject_id TEXT,
  agent_code TEXT NOT NULL DEFAULT 'administrative-assistant',
  conversation_id TEXT,
  message_id TEXT,
  prompt_id TEXT,
  prompt_version INTEGER NOT NULL DEFAULT 0,
  knowledge_version INTEGER NOT NULL DEFAULT 0,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  workflow_id TEXT,
  workflow_state TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'automatic',
  reviewer TEXT NOT NULL DEFAULT '',
  latency_ms INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(12,6) NOT NULL DEFAULT 0,
  overall_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  groundedness_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  hallucination_risk NUMERIC(6,2) NOT NULL DEFAULT 0,
  knowledge_coverage NUMERIC(6,2) NOT NULL DEFAULT 0,
  feedback_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  approval_state TEXT NOT NULL DEFAULT 'unknown',
  verdict TEXT NOT NULL DEFAULT 'pass',
  response_characters INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_runs_verdict_check CHECK (verdict IN ('pass', 'warn', 'fail'))
);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  criterion TEXT NOT NULL,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  passed BOOLEAN NOT NULL DEFAULT TRUE,
  rationale TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_suites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  agent_code TEXT NOT NULL DEFAULT 'administrative-assistant',
  status TEXT NOT NULL DEFAULT 'active',
  acceptance_threshold NUMERIC(6,2) NOT NULL DEFAULT 70,
  owner TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_suites_status_check CHECK (status IN ('active', 'draft', 'archived'))
);

CREATE TABLE IF NOT EXISTS evaluation_cases (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL,
  name TEXT NOT NULL,
  input_text TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_suite_runs (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'passed',
  total_cases INTEGER NOT NULL DEFAULT 0,
  passed_cases INTEGER NOT NULL DEFAULT 0,
  failed_cases INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  acceptance_threshold NUMERIC(6,2) NOT NULL DEFAULT 70,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  actor TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_suite_runs_status_check CHECK (status IN ('passed', 'failed'))
);

CREATE TABLE IF NOT EXISTS evaluation_case_results (
  id TEXT PRIMARY KEY,
  suite_run_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  run_id TEXT,
  passed BOOLEAN NOT NULL DEFAULT TRUE,
  score NUMERIC(6,2) NOT NULL DEFAULT 0,
  output_text TEXT NOT NULL DEFAULT '',
  failure_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_suggestions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'prompt',
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT,
  title TEXT NOT NULL,
  suggestion TEXT NOT NULL DEFAULT '',
  rationale TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_suggestions_status_check CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT evaluation_suggestions_impact_check CHECK (
    impact IN ('low', 'medium', 'high')
  )
);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_created_at ON evaluation_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_agent_code ON evaluation_runs(agent_code);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_prompt_id ON evaluation_runs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_conversation_id ON evaluation_runs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_subject ON evaluation_runs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_run_id ON evaluation_scores(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criterion ON evaluation_scores(criterion);
CREATE INDEX IF NOT EXISTS idx_evaluation_cases_suite_id ON evaluation_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_suite_runs_suite_id ON evaluation_suite_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_case_results_suite_run_id ON evaluation_case_results(suite_run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_suggestions_status ON evaluation_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_evaluation_suggestions_category ON evaluation_suggestions(category);
