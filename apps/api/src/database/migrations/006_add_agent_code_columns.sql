ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS agent_code TEXT NOT NULL DEFAULT 'administrative-assistant';

ALTER TABLE generated_documents
  ADD COLUMN IF NOT EXISTS agent_code TEXT NOT NULL DEFAULT 'administrative-assistant';

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS agent_code TEXT NOT NULL DEFAULT 'administrative-assistant';

ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS agent_code TEXT NOT NULL DEFAULT 'administrative-assistant';

CREATE INDEX IF NOT EXISTS idx_conversations_agent_code ON conversations(agent_code);
CREATE INDEX IF NOT EXISTS idx_generated_documents_agent_code ON generated_documents(agent_code);
CREATE INDEX IF NOT EXISTS idx_feedback_agent_code ON feedback(agent_code);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent_code ON ai_usage(agent_code);
