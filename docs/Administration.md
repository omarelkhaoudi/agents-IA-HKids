# Administration

## Access

- UI: `/administration` (Manager+). Writes to agents/settings need Administrator+.
- Setup (first install only): `/setup` → `GET/POST /api/setup`.

Roles: `super_admin`, `administrator`, `manager`, `employee`, `read_only`.

## Console pages

| Path | Purpose |
|------|---------|
| `/administration` | Dashboard metrics |
| `/administration/system-status` | Health, Claude, DB, migrations, pending work |
| `/administration/exports` | CSV/JSON exports |
| `/administration/agents` | Agent CRUD and resource links |
| `/administration/settings` | System settings (company, provider, model, locale) |
| `/administration/statistics` | Usage / platform statistics |
| `/ai-administration` | AI providers, models, usage views |

Also available in the workspace (not under `/administration`): Knowledge Base, Prompt Builder, Feedback Dashboard, Assistant.

## System status

`GET /api/admin/system-status` (Manager+) returns:

- System version, uptime, `nodeEnv`
- Database, Claude API, storage, AI usage summaries
- Current provider/model
- Latest migration version (`schema_migrations`)
- Environment validation issues
- Pending workflows, approvals, feedback
- Component checks aligned with `/api/health`

Use this page after deploy, restore, or Anthropic key changes.

## Exports

`GET /api/admin/exports/:type?format=json|csv`

| `type` | Content |
|--------|---------|
| `ai-usage` | Rows from `ai_usage` (cap 5000) |
| `feedback` | Feedback records |
| `generated-documents` | Generated document metadata |
| `statistics` | Dashboard metrics as metric/value pairs |

UI: Administration → Exports. Response is a downloadable attachment.

## Agent management

1. Open **Administration → Gestion des Agents**.
2. Create or edit: unique `code`, name, description, status (`active` / inactive).
3. Set provider, model, temperature, max tokens, timeout, retries.
4. Link prompts (`promptIds`), documents (`documentIds`), workflow codes.
5. Save; test in `/assistant` with that agent.

Default blueprints seed four agents if missing. See [Creating-New-Agent.md](./Creating-New-Agent.md).

## Settings

- Read: `GET /api/admin/settings`
- Write: `PUT /api/admin/settings` (Administrator+)

Typical keys include company name, default provider/model, language, timezone, currency (persisted via `SystemSettingsRepository`). Anthropic key can also be set at setup time into `runtime-secrets.json`.

## Configure Claude (admin path)

1. Ensure `ANTHROPIC_API_KEY` is set in the environment **or** provided during setup.
2. In Admin Settings, set `default_provider` / `default_model` (or rely on env defaults).
3. Confirm System status shows Claude as reachable.
4. Per-agent overrides: edit the agent’s `defaultProvider` / `defaultModel`.

## Update prompts

1. Open **Prompt Builder** (`/prompt-builder`) or use `PUT /api/prompts/:id` (Administrator+).
2. Edit `systemPrompt`, `instructions`, `constraints`, `validationChecklist`, `status` (`active` \| `draft` \| `archived`).
3. Link the prompt ID on the agent under Administration → Agents.
4. Start a conversation and select that prompt.

Details: [Prompt-System.md](./Prompt-System.md).

## Upload / manage knowledge documents

1. Open **Knowledge Base** (`/knowledge-base`).
2. Create/update via UI or `POST/PUT /api/documents` (Employee+ write).
3. Provide title, category, description, tags, author, `fileType`, status — content is synthesized for indexing (JSON metadata API, not multipart binary upload).
4. Index refresh is scheduled automatically after catalog changes.

Details: [Knowledge-Base.md](./Knowledge-Base.md).

## Workflows and approvals

- Review generated documents in the assistant conversation.
- Approve via generated-document approve endpoint / UI; export only when Approved (or already Exported).
- Transition history via workflow endpoints.

Details: [Workflow.md](./Workflow.md).

## Feedback governance

- Users submit feedback on outputs (`POST /api/feedback`).
- Approve patterns/improvements from the feedback dashboard.
- Approved pattern text is injected as guidance on later agent runs (does not auto-rewrite prompt definitions).

## Governance rules (product)

- Every output starts as a draft
- No automatic publication, email send, commercial commitment, or sensitive HR decision
- Export only after human approval

## Related docs

- [Creating-New-Agent.md](./Creating-New-Agent.md)
- [API.md](./API.md)
- [DELIVERY_CHECKLIST.md](./DELIVERY_CHECKLIST.md)
