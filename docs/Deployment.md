# Deployment

## Prerequisites

- Node.js 20+
- npm (workspaces)
- PostgreSQL 16 (local or Docker)
- Anthropic API key for live Claude calls
- Optional: Docker + Docker Compose for full stack
- Optional: `pg_dump` / `pg_restore` / `psql` for backup scripts

## Local development

```bash
cd assistant-administratif-ia
npm install
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL (or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME), JWT_SECRET, ANTHROPIC_API_KEY
npm run db:ensure
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3001`

`npm run db:ensure` creates the configured database if it is missing (via the Node `pg` driver — `psql` is optional) and applies migrations `001`–`020`. Migrations also run automatically on API startup via `runMigrations` into `schema_migrations`.

If `DATABASE_URL` / `DB_*` are unset in development, the API uses in-memory PostgreSQL (`pg-mem`) so the UI can start without a local server. Prefer a real Postgres for persistent CRM/content data.

Set `VITE_API_BASE_URL` for the web app if the API is not at the default (build-time for Docker; Vite env for local).

### First-time setup

1. Open the web app. If `GET /api/setup/status` reports `requiresSetup: true`, use `/setup`.
2. `POST /api/setup` creates the first `super_admin`, optional Anthropic key (`config/runtime-secrets.json`), and company/provider settings.
3. Confirm `GET /api/health` and `GET /api/ready`.

## Docker Compose (development)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
docker compose up --build
```

Services (`docker-compose.yml`):

| Service | Port | Notes |
|---------|------|-------|
| `db` | 5432 | `postgres:16-alpine`, DB `hkids_admin_ai` |
| `api` | 3001 | Depends on healthy DB |
| `web` | 8080→80 | nginx; build arg `VITE_API_BASE_URL=http://localhost:3001` |

## Docker Compose (production)

Use `docker-compose.production.yml`. Required env (compose fails if missing):

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | Database password |
| `CLIENT_URL` | Allowed CORS origin (must not be localhost in production API checks) |
| `JWT_SECRET` | Signing secret |
| `DEFAULT_ADMIN_PASSWORD` | Must not remain `Admin123!` |
| `ANTHROPIC_API_KEY` | Claude access |
| `PUBLIC_API_BASE_URL` | Baked into web as `VITE_API_BASE_URL` |

Optional: `POSTGRES_DB`, `POSTGRES_USER`, `HTTP_PORT`, `DB_SSL`, JWT TTLs, rate limits, `DEFAULT_ADMIN_EMAIL` / `NAME`, provider/model.

```bash
docker compose -f docker-compose.production.yml up --build -d
```

API healthcheck hits `/api/health`. Web listens on `${HTTP_PORT:-80}`.

## Environment variables (API)

From `apps/api/.env.example` and `config/env.js`:

| Variable | Default / notes |
|----------|-----------------|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | `3001` |
| `CLIENT_URL` | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string (preferred) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Used when `DATABASE_URL` is empty |
| `DB_SSL` | `false` |
| `DB_CONNECT_RETRIES` | `10` (startup retry) |
| `HKIDS_USE_IN_MEMORY_DB` | Force `pg-mem` |
| `FORCE_REAL_DATABASE` | When `true`, API tests use real Postgres from env |
| `JWT_SECRET` | Required in production |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN_MS` | `604800000` (7 days) |
| `DEFAULT_ADMIN_EMAIL` | `admin@hkids.app` |
| `DEFAULT_ADMIN_PASSWORD` | Change in production |
| `DEFAULT_ADMIN_NAME` | `H-Kids Administrator` |
| `ANTHROPIC_API_KEY` | Claude |
| `DEFAULT_PROVIDER` | `anthropic` |
| `DEFAULT_MODEL` | `claude-3-5-sonnet-latest` |
| `MAX_TOKENS` | `1500` |
| `TEMPERATURE` | `0.3` |
| `ENABLE_STREAMING` | `false` |
| `MAX_RETRIES` | `2` |
| `REQUEST_TIMEOUT_MS` | `30000` |
| `ENABLE_USAGE_TRACKING` | `true` |
| `EMBEDDING_PROVIDER` | `mock` |
| `EMBEDDING_MODEL` | `mock-hash-v1` |
| `OPENAI_API_KEY` | Reserved / unused by live path |
| `JSON_BODY_LIMIT` | `1mb` |
| `RATE_LIMIT_*` / `AUTH_RATE_LIMIT_*` | Global and auth limiters |

Production guard (`assertProductionConfig`): requires `JWT_SECRET`, `DATABASE_URL`, non-localhost `CLIENT_URL`, and a non-default admin password.

## Configure Claude

1. Create an Anthropic account and API key.
2. Set `ANTHROPIC_API_KEY` in `apps/api/.env` or Compose.
3. Optionally set `DEFAULT_PROVIDER=anthropic` and `DEFAULT_MODEL` (`claude-3-5-sonnet-latest` or `claude-3-5-haiku-latest`).
4. Or complete Setup Wizard / Admin Settings to store provider, model, and key (key may be written to `apps/api/config/runtime-secrets.json`).
5. Verify via Administration → System status (`claudeApi` check) or `GET /api/admin/system-status`.

## Build and start (without Compose)

```bash
npm run build
# Ensure DATABASE_URL and secrets are set
npm run start -w @hkids/api
# Serve apps/web/dist with nginx or any static host; set VITE_API_BASE_URL at build time
```

## Validation after deploy

```bash
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/ready
npm test
npm run lint
npm run typecheck
```

## Related docs

- [Backup-Restore.md](./Backup-Restore.md)
- [Administration.md](./Administration.md)
- [Security.md](./Security.md)
- [Troubleshooting.md](./Troubleshooting.md)
