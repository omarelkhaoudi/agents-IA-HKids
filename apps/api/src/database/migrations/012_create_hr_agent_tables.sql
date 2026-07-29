CREATE TABLE IF NOT EXISTS hr_employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  manager_name TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_employees_type_check CHECK (
    employment_type IN ('full_time', 'part_time', 'internship', 'freelance', 'temporary')
  ),
  CONSTRAINT hr_employees_status_check CHECK (
    status IN ('active', 'onboarding', 'on_leave', 'offboarding', 'inactive')
  )
);

CREATE TABLE IF NOT EXISTS hr_candidates (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  position_applied TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'applied',
  source TEXT NOT NULL DEFAULT '',
  evaluation_score INTEGER,
  shortlisted BOOLEAN NOT NULL DEFAULT FALSE,
  interview_notes TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_candidates_stage_check CHECK (
    stage IN (
      'applied',
      'screening',
      'interview',
      'shortlist',
      'offer',
      'hired',
      'rejected',
      'withdrawn'
    )
  ),
  CONSTRAINT hr_candidates_score_check CHECK (
    evaluation_score IS NULL OR (evaluation_score >= 0 AND evaluation_score <= 100)
  )
);

CREATE TABLE IF NOT EXISTS hr_job_descriptions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  contract_type TEXT NOT NULL DEFAULT 'full_time',
  mission TEXT NOT NULL DEFAULT '',
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  soft_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  languages JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  body TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  CONSTRAINT hr_job_descriptions_approval_check CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')
  )
);

CREATE TABLE IF NOT EXISTS hr_leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES hr_employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  leave_type TEXT NOT NULL DEFAULT 'annual',
  start_date DATE,
  end_date DATE,
  days INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  ai_recommendation TEXT NOT NULL DEFAULT '',
  manager_decision TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_leave_type_check CHECK (
    leave_type IN (
      'annual',
      'paid',
      'unpaid',
      'medical',
      'remote',
      'exceptional',
      'parental'
    )
  ),
  CONSTRAINT hr_leave_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS hr_absences (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES hr_employees(id) ON DELETE SET NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  start_date DATE,
  end_date DATE,
  duration_days INTEGER NOT NULL DEFAULT 1,
  supporting_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'recorded',
  alert_flag BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hr_absences_status_check CHECK (
    status IN ('recorded', 'under_review', 'closed')
  )
);

CREATE TABLE IF NOT EXISTS hr_documents (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES hr_employees(id) ON DELETE SET NULL,
  candidate_id TEXT REFERENCES hr_candidates(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  source_prompt TEXT NOT NULL DEFAULT '',
  conversation_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  CONSTRAINT hr_documents_type_check CHECK (
    document_type IN (
      'job_description',
      'employment_contract',
      'internship_agreement',
      'freelance_contract',
      'probation_confirmation',
      'contract_amendment',
      'employment_certificate',
      'salary_certificate',
      'administrative_letter',
      'warning_letter',
      'explanation_request',
      'meeting_invitation',
      'disciplinary_report',
      'administrative_notice',
      'performance_review',
      'training_plan',
      'onboarding_plan',
      'offboarding_plan',
      'offer_letter',
      'rejection_letter',
      'interview_summary',
      'recruitment_summary',
      'hr_report',
      'internal_communication',
      'other'
    )
  ),
  CONSTRAINT hr_documents_approval_check CHECK (
    approval_status IN ('draft', 'pending_review', 'approved', 'rejected', 'exported')
  )
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON hr_employees(status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_department ON hr_employees(department);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_stage ON hr_candidates(stage);
CREATE INDEX IF NOT EXISTS idx_hr_leave_status ON hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_documents_type ON hr_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_hr_documents_approval ON hr_documents(approval_status);
