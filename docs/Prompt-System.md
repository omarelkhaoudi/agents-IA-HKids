# Prompt System

## Purpose

Prompts define how each agent behaves: role, objectives, system instructions, constraints, and validation checklists. Definitions are stored in PostgreSQL (`prompt_definitions`) and linked to agents via `agent_prompt_links`.

## Data model

| Field | Notes |
|-------|-------|
| `id` | Stable prompt id (e.g. `prompt-001`) |
| `promptGroupId` | Groups versions (e.g. `admin-assistant-core`) |
| `version` | Integer version label |
| `status` | `active` \| `draft` \| `archived` |
| `name`, `description` | Catalog metadata |
| `role`, `objective` | Behavioral framing |
| `systemPrompt` | Core system text |
| `instructions[]` | Ordered guidance |
| `constraints[]` | Hard limits |
| `validationChecklist[]` | Human/AI self-check items |
| `outputStyle` | Tone / format hints |
| `updatedDate` | Last update |

Updates are **in-place** (`PUT /api/prompts/:id`). Creating a new version is done by inserting a new row (new `id` / higher `version` under the same `promptGroupId`), not by automatic versioning.

## Seeded prompts

From `default-prompt-definitions.js` (seeded when empty):

| ID | Group | Status |
|----|-------|--------|
| `prompt-001` | `admin-assistant-core` | active (v1) |
| `prompt-002` | `admin-assistant-core` | draft (v2) |
| `prompt-003` | `email-drafting-agent` | archived |

## How to update prompts

### UI

1. Open **Prompt Builder** (`/prompt-builder`).
2. Select or create a definition.
3. Edit system prompt, instructions, constraints, checklist, status.
4. Save (Administrator+ for writes).
5. Link the prompt on the agent (Administration → Agents → `promptIds`).
6. In a conversation, ensure the selected prompt id is the one you activated.

### API

| Method | Path | Role |
|--------|------|------|
| GET | `/api/prompts` | Authenticated |
| POST | `/api/prompts` | Administrator+ |
| PUT | `/api/prompts/:id` | Administrator+ |
| DELETE | `/api/prompts/:id` | Administrator+ |

## Runtime assembly

1. Conversation requires a `selectedPromptId`.
2. `PromptAssembler.assemble` builds the system prompt from the definition.
3. Retrieval context and approved feedback guidance are appended by `ConversationService`.
4. AI Gateway sends the assembled system + messages to Claude (default).

## Feedback vs prompts

Approving feedback **improvements** marks suggestions; it does **not** automatically rewrite `prompt_definitions`. Operators apply changes manually in Prompt Builder. Approved **patterns** can still be injected as “Approved Feedback Guidance” at generation time.

## Related docs

- [Creating-New-Agent.md](./Creating-New-Agent.md)
- [Knowledge-Base.md](./Knowledge-Base.md)
- [Workflow.md](./Workflow.md)
