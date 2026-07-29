# H-Kids AI Agent Platform

Multi-agent prototype for H-Kids with 4 specialized agents sharing one governed technical foundation:

- `community-manager`
- `administrative-assistant`
- `sales-agent`
- `hr-agent`

The platform is designed so that every sensitive action remains human-approved. Agents prepare drafts, recommendations, and documents, but they do not publish, send, discount, or validate anything automatically.

## Current Scope

This repository now includes:

- a React + Vite + Tailwind frontend
- a Node.js + Express backend
- PostgreSQL migrations and repositories
- AI gateway abstraction for Claude and future providers
- retrieval, workflow, feedback, and administration layers
- multi-agent administration with 4 seeded prototype agents
- agent-aware conversations, AI usage tracking, feedback, and generated documents

## Architecture

### Shared platform layers

- `apps/api/src/services/ConversationService.js`
- `apps/api/src/services/PromptAssembler.js`
- `apps/api/src/services/retrieval/`
- `apps/api/src/services/ai-gateway/`
- `apps/api/src/services/workflows/`
- `apps/api/src/services/feedback/`
- `apps/api/src/services/admin/`

### Multi-agent model

Each agent has configurable:

- code, name, description, status
- default provider and model
- prompt links
- document links
- workflow links
- temperature, max tokens, timeout, retries

Conversations, generated documents, feedback, and AI usage are now explicitly linked to `agent_code`.

## Human Validation Rules

The prototype enforces governance expectations from the H-Kids brief:

- no automatic social publication
- no automatic email or document sending
- no automatic commercial discount or customer commitment
- no automatic sensitive HR communication
- generated documents must be reviewed and approved before export

## Main Routes

### User workspace

- `GET /api/assistant/bootstrap`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `POST /api/conversations/:id/messages`

### Administration

- `GET /api/admin/dashboard`
- `GET /api/admin/statistics`
- `GET /api/admin/agents`
- `POST /api/admin/agents`
- `PUT /api/admin/agents/:id`
- `DELETE /api/admin/agents/:id`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

### AI governance

- `GET /api/ai/providers`
- `GET /api/ai/models`
- `GET /api/ai/usage`
- `GET /api/ai/statistics`

## Environment Variables

### API (`apps/api/.env`)

Copy `apps/api/.env.example` to `apps/api/.env`.

- `PORT`
- `CLIENT_URL`
- `DATABASE_URL` **or** `DB_HOST` + `DB_PORT` + `DB_USER` + `DB_PASSWORD` + `DB_NAME`
- `DB_SSL`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `DEFAULT_PROVIDER`
- `DEFAULT_MODEL`
- `MAX_TOKENS`
- `TEMPERATURE`
- `ENABLE_STREAMING`
- `MAX_RETRIES`
- `REQUEST_TIMEOUT_MS`
- `ENABLE_USAGE_TRACKING`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `OPENAI_API_KEY`

### Web

- `VITE_API_BASE_URL`

## Install and Run

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL / DB_* and ANTHROPIC_API_KEY
npm run db:ensure   # creates DB + applies migrations 001–011 (requires Postgres)
npm run dev
```

If Postgres is not available yet, omit `DATABASE_URL` / `DB_*` and the API falls back to in-memory PostgreSQL for local UI work. Automated tests always use in-memory isolation unless `FORCE_REAL_DATABASE=true`.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Validation

```bash
npm install
npm run lint
npm test
npm run build
npm run test:e2e
```

Every gate must pass. API tests preload `apps/api/scripts/preload-test-env.js` so developer `.env` database settings and admin passwords cannot break the suite.

## Operations and Delivery

See `docs/OPERATIONS.md` for:

- H-Kids ownership checklist
- backup and recovery procedure
- agent administration workflow
- how to add or modify an agent
- administrator training checklist
- subscriptions and transfer considerations