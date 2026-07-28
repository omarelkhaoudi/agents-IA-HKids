# Operations Guide

## H-Kids Ownership Checklist
- Anthropic account and API key
- hosting project
- PostgreSQL database
- storage bucket or document storage
- source repository
- administrator email inboxes
- monitoring and backup access

## Backup and Recovery Procedure
1. Restore the latest PostgreSQL snapshot.
2. Re-apply environment variables.
3. Restore document storage.
4. Deploy the current codebase.
5. Run migrations on startup.
6. Verify `agents`, `conversations`, `generated_documents`, `feedback`, `workflow_instances`, and `ai_usage`.
7. Validate administrator access before reopening usage.

## Agent Administration
1. Open `Administration > Agents`.
2. Create or update an agent.
3. Adjust provider, model, temperature, tokens, timeout, and retries.
4. Link prompts, documents, and workflows.
5. Activate or deactivate the agent.
6. Test the agent in the shared workspace.

## Add or Modify an Agent
1. Create the agent with a unique `code`.
2. Prepare prompt versions.
3. Attach relevant documents.
4. Link workflows that preserve human validation.
5. Test the draft quality and approval flow.
6. Verify usage and cost reporting by agent.

## Governance Rules
- every output starts as a draft
- no automatic publication
- no automatic sending of documents or emails
- no automatic commercial commitment
- no automatic sensitive HR decision or communication
- export only after approval

## Administrator Training Checklist
- switch between the 4 prototype agents
- update prompts and instructions
- attach or remove documents per agent
- read dashboard statistics and AI usage
- approve or reject generated documents
- review workflow history and feedback patterns
- handle backups and recovery access