# Creating a New Agent

## Prerequisites

- Role: Administrator or Super Admin
- Existing prompts and knowledge documents (or create them first)
- Optional workflow codes to link: `document-review`, `export-approval`, `archive-flow`

## Via Administration UI

1. Open **Administration → Gestion des Agents**.
2. Create an agent with a unique `code` (stable identifier used on conversations and usage).
3. Fill name, description, and set `status` to `active` when ready.
4. Configure AI defaults:
   - `defaultProvider` (typically `anthropic`)
   - `defaultModel` (e.g. `claude-3-5-sonnet-latest`)
   - `temperature`, `maxTokens`, `timeout`, `retryCount`
5. Link resources:
   - Prompt IDs (from Prompt Builder / `/api/prompts`)
   - Document IDs (from Knowledge Base / `/api/documents`)
   - Workflow codes relevant to the agent’s risk profile
6. Save, then open `/assistant`, select the agent, and send a test message.
7. Generate a draft document, run approval, and confirm export is blocked until approved.

## Via API

`POST /api/admin/agents` (Administrator+)

Example body fields (aligned with `createAgentBodySchema` / repository defaults):

```json
{
  "code": "facilities-agent",
  "name": "Agent facilities IA",
  "description": "Drafts facilities and maintenance notes",
  "status": "active",
  "defaultProvider": "anthropic",
  "defaultModel": "claude-3-5-sonnet-latest",
  "temperature": 0.3,
  "maxTokens": 1500,
  "timeout": 30000,
  "retryCount": 2,
  "promptIds": ["prompt-001"],
  "documentIds": ["doc-001", "doc-003"],
  "workflowCodes": ["document-review", "export-approval"]
}
```

Update: `PUT /api/admin/agents/:id`  
Delete: `DELETE /api/admin/agents/:id`  
List + available resources: `GET /api/admin/agents`

Create defaults in code if omitted: `status: active`, Anthropic + `claude-3-5-sonnet-latest`, temperature `0.3`, maxTokens `1500`, timeout `30000`, retryCount `2`.

## Seeded reference agents

| Code | Typical workflow links |
|------|------------------------|
| `community-manager` | `document-review` |
| `administrative-assistant` | `document-review`, `export-approval` |
| `sales-agent` | `document-review` |
| `hr-agent` | `document-review`, `archive-flow` |

Runtime seed attaches `prompt-001` and `doc-001` / `doc-002` when creating missing blueprints.

## Checklist before go-live

- [ ] Unique `code`
- [ ] Active prompt with clear constraints and validation checklist
- [ ] Relevant knowledge documents linked and `active`
- [ ] Workflows preserve human validation before export
- [ ] Test draft quality in the shared workspace
- [ ] Approve → export path verified
- [ ] Usage appears under AI usage / admin statistics for that `agent_code`
- [ ] Deactivate (`status`) rather than delete if retiring

## Related docs

- [Prompt-System.md](./Prompt-System.md)
- [Knowledge-Base.md](./Knowledge-Base.md)
- [Workflow.md](./Workflow.md)
- [Administration.md](./Administration.md)
