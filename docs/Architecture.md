# Architecture

## Overview

H-Kids Administrative AI Assistant is a multi-agent administrative platform. Agents draft conversations and documents; humans approve before export. The monorepo has two workspaces:

| Workspace | Stack | Role |
|-----------|-------|------|
| `@hkids/api` | Node.js, Express 5, PostgreSQL (`pg`) | REST API, AI gateway, RAG, workflows, auth |
| `@hkids/web` | React, Vite, Tailwind | Workspace UI + admin governance console |

There is no shared `packages/` library; apps are linked via npm workspaces (`apps/*`).

## High-level diagram

```
┌─────────────────┐     JWT / CORS      ┌──────────────────────────┐
│  apps/web       │ ◄─────────────────► │  apps/api (Express)      │
│  Vite + React   │   CLIENT_URL        │  /api/*                  │
└─────────────────┘                     └───────────┬──────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    ▼                               ▼                               ▼
             PostgreSQL                    AI Gateway                         Retrieval
          (migrations 001–009)           (Claude live;                  (hybrid keyword +
           schema_migrations            OpenAI/Gemini/Ollama              semantic, mock
                                         stubs reserved)                    embeddings)
```

## Runtime layers (API)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routes | `apps/api/src/routes/` | HTTP endpoints under `/api` |
| Middleware | `authenticate`, `authorizeAccess`, rate limit, Helmet, Zod `validate` | Security and input checks |
| Services | `services/` | Conversation, admin, setup, health, feedback, workflows |
| AI Gateway | `services/ai-gateway/` | Provider abstraction, retries, usage, cost |
| Retrieval | `services/retrieval/` | Index, chunk, hybrid search, context ranking |
| Repositories | `repositories/` | PostgreSQL persistence |
| Runtimes | `runtime/*.js` | Wire services at startup |
| Migrations | `database/migrations/` | Schema `001`–`009`, tracked in `schema_migrations` |

Startup order (`apps/api/src/index.js`): auth + migrations → content catalog seed → workflows → admin agents/settings → setup state.

## Multi-agent model

Four seeded agents (migration `009` + admin runtime blueprints):

| Code | Name |
|------|------|
| `community-manager` | Community Manager IA |
| `administrative-assistant` | Assistant administratif IA |
| `sales-agent` | Agent commercial IA |
| `hr-agent` | Agent RH IA |

Each agent stores: `code`, `name`, `description`, `status`, provider/model, temperature, max tokens, timeout, retries, plus links:

- `agent_prompt_links` → prompt IDs
- `agent_document_links` → knowledge document IDs
- `agent_workflow_links` → workflow codes (`document-review`, `export-approval`, `archive-flow`)

Conversations, generated documents, feedback, and AI usage are scoped by `agent_code`.

## AI provider abstraction

- Default provider: **Anthropic Claude** (`DEFAULT_PROVIDER=anthropic`, `DEFAULT_MODEL=claude-3-5-sonnet-latest`)
- Live implementation: `ClaudeProvider` (`@anthropic-ai/sdk`)
- Reserved stubs (not callable): OpenAI, Gemini, Ollama
- Gateway: `AIGateway` + `ProviderManager`, `ModelManager`, retry/timeout/usage helpers

## Prompt + knowledge + RAG

- Prompts and knowledge documents live in PostgreSQL (`prompt_definitions`, `knowledge_documents`)
- Catalog CRUD via `/api/prompts` and `/api/documents`
- On each chat message, `RetrievalService` runs hybrid search (`hybrid-semantic-keyword`) and injects ranked context
- Embeddings default to deterministic mock hash vectors (`EMBEDDING_PROVIDER=mock`)

## Workflow + governance

- Generated outputs start as drafts
- Workflow states: Draft → Pending Review → Approved → Exported → Archived (plus Needs Changes / Rejected)
- Export (`pdf` / `docx` / `html`) only after human approval and allowed workflow state
- Feedback patterns can be approved and appended as guidance on later generations (prompts are not auto-edited)

## Auth and RBAC

Roles (rank descending): `super_admin` → `administrator` → `manager` → `employee` → `read_only`

JWT access tokens + hashed refresh tokens; bcrypt password hashing (12 rounds). Admin console requires Manager+ to read; Administrator+ to write agents/settings/prompts.

## Web application surfaces

| Area | Routes (examples) |
|------|-------------------|
| Setup | `/setup` |
| Auth | `/login` |
| Workspace | `/assistant`, `/knowledge-base`, `/prompt-builder`, `/feedback-dashboard` |
| Administration | `/administration/*` (dashboard, system status, exports, agents, settings, statistics) |

## Related docs

- [Deployment.md](./Deployment.md) — install, Docker, env
- [API.md](./API.md) — endpoint reference
- [Security.md](./Security.md) — auth, RBAC, hardening
- [Workflow.md](./Workflow.md) — approval and export
