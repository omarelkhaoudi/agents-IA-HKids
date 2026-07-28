CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  document_id TEXT,
  original_text TEXT NOT NULL,
  corrected_text TEXT,
  feedback_type TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_patterns (
  id TEXT PRIMARY KEY,
  pattern_type TEXT NOT NULL,
  pattern_text TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prompt_improvements (
  id TEXT PRIMARY KEY,
  prompt_id TEXT,
  suggestion_text TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_corrections (
  id TEXT PRIMARY KEY,
  feedback_id TEXT NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  correction_type TEXT NOT NULL,
  original_fragment TEXT,
  corrected_fragment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_conversation_id ON feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_document_id ON feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_feedback_patterns_status ON feedback_patterns(status);
CREATE INDEX IF NOT EXISTS idx_prompt_improvements_status ON prompt_improvements(status);
