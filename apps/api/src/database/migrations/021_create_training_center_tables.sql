CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_hours NUMERIC(6, 2) NOT NULL DEFAULT 0,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_courses_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  )
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  instructor TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
  organization_id TEXT NOT NULL DEFAULT 'default-organization',
  owner_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_sessions_status_check CHECK (
    status IN ('scheduled', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_training_courses_status ON training_courses(status);
CREATE INDEX IF NOT EXISTS idx_training_courses_category ON training_courses(category);
CREATE INDEX IF NOT EXISTS idx_training_sessions_course_id ON training_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
