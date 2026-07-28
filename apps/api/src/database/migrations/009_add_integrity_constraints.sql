INSERT INTO agents (id, code, name, description, status, default_provider, default_model, temperature, max_tokens, timeout, retry_count)
VALUES
  ('agent-community-manager', 'community-manager', 'Community Manager IA', 'Community content preparation agent.', 'active', 'anthropic', 'claude-3-5-sonnet-latest', 0.30, 1500, 30000, 2),
  ('agent-administrative-assistant', 'administrative-assistant', 'Assistant administratif IA', 'Administrative document preparation agent.', 'active', 'anthropic', 'claude-3-5-sonnet-latest', 0.30, 1500, 30000, 2),
  ('agent-sales-agent', 'sales-agent', 'Agent commercial IA', 'Commercial preparation agent.', 'active', 'anthropic', 'claude-3-5-sonnet-latest', 0.30, 1500, 30000, 2),
  ('agent-hr-agent', 'hr-agent', 'Agent RH IA', 'HR document preparation agent.', 'active', 'anthropic', 'claude-3-5-sonnet-latest', 0.30, 1500, 30000, 2)
ON CONFLICT (code) DO NOTHING;

UPDATE conversations
SET agent_code = 'administrative-assistant'
WHERE agent_code IS NULL OR agent_code NOT IN (SELECT code FROM agents);

UPDATE generated_documents
SET agent_code = 'administrative-assistant'
WHERE agent_code IS NULL OR agent_code NOT IN (SELECT code FROM agents);

UPDATE feedback
SET agent_code = 'administrative-assistant'
WHERE agent_code IS NULL OR agent_code NOT IN (SELECT code FROM agents);

UPDATE ai_usage
SET agent_code = 'administrative-assistant'
WHERE agent_code IS NULL OR agent_code NOT IN (SELECT code FROM agents);

DELETE FROM conversation_knowledge
WHERE document_id NOT IN (SELECT id FROM knowledge_documents);

DELETE FROM conversation_prompts
WHERE prompt_id NOT IN (SELECT id FROM prompt_definitions);

DELETE FROM agent_prompt_links
WHERE prompt_id NOT IN (SELECT id FROM prompt_definitions);

DELETE FROM agent_document_links
WHERE document_id NOT IN (SELECT id FROM knowledge_documents);

ALTER TABLE conversations
  ADD CONSTRAINT fk_conversations_agent_code
  FOREIGN KEY (agent_code) REFERENCES agents(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE generated_documents
  ADD CONSTRAINT fk_generated_documents_agent_code
  FOREIGN KEY (agent_code) REFERENCES agents(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE feedback
  ADD CONSTRAINT fk_feedback_agent_code
  FOREIGN KEY (agent_code) REFERENCES agents(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ai_usage
  ADD CONSTRAINT fk_ai_usage_agent_code
  FOREIGN KEY (agent_code) REFERENCES agents(code) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE conversation_knowledge
  ADD CONSTRAINT fk_conversation_knowledge_document_id
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE conversation_prompts
  ADD CONSTRAINT fk_conversation_prompts_prompt_id
  FOREIGN KEY (prompt_id) REFERENCES prompt_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE agent_prompt_links
  ADD CONSTRAINT fk_agent_prompt_links_prompt_id
  FOREIGN KEY (prompt_id) REFERENCES prompt_definitions(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE agent_document_links
  ADD CONSTRAINT fk_agent_document_links_document_id
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversation_knowledge_conversation_id ON conversation_knowledge(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_knowledge_document_id ON conversation_knowledge(document_id);
CREATE INDEX IF NOT EXISTS idx_conversation_prompts_conversation_id ON conversation_prompts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_prompts_prompt_id ON conversation_prompts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_agent_prompt_links_prompt_id ON agent_prompt_links(prompt_id);
CREATE INDEX IF NOT EXISTS idx_agent_document_links_document_id ON agent_document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_conversation_id ON workflow_instances(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_code_updated_at ON conversations(agent_code, updated_at DESC);
