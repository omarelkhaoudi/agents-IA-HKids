# Troubleshooting

## API will not start

| Symptom | Check |
|---------|-------|
| Crash on boot in production | `JWT_SECRET`, `DATABASE_URL`, non-localhost `CLIENT_URL`, non-default `DEFAULT_ADMIN_PASSWORD` (`assertProductionConfig`) |
| `database "hkids_admin_ai" does not exist` | Run `npm run db:ensure` (creates DB + migrations). Or start Compose DB: `docker compose up db -d`. |
| `psql` / `docker` not found | Not required for ensure/migrate — Node `pg` is used. Install Docker Desktop or PostgreSQL only if you want a persistent server. |
| DB connection refused | Postgres not running; unset `DATABASE_URL`/`DB_*` for in-memory dev, or start Postgres first |
| Migration errors | Inspect SQL in `apps/api/src/database/migrations/`; table `schema_migrations` for applied versions |

## Tests fail with database errors

API tests force an isolated in-memory database via `apps/api/scripts/preload-test-env.js` (`HKIDS_USE_IN_MEMORY_DB=true`) and pin default admin credentials (`admin@hkids.app` / `Admin123!`). They must not depend on your personal `.env` passwords or database.

```bash
npm test
# Optional real-DB suite:
FORCE_REAL_DATABASE=true npm run db:ensure -w @hkids/api
FORCE_REAL_DATABASE=true npm run test -w @hkids/api
```

## Health and readiness

```bash
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/ready
```

| Endpoint | Meaning |
|----------|---------|
| `/api/health` | 503 if any of database, aiGateway, retrieval, workflow checks fail |
| `/api/ready` | 200 if database + workflow ok (AI/retrieval may be degraded) |

Use Administration → System status for richer diagnostics (`claudeApi`, migration version, pending queues, env issues).

## Claude / Anthropic failures

1. Confirm `ANTHROPIC_API_KEY` in env or `apps/api/config/runtime-secrets.json` (from setup).
2. Confirm `DEFAULT_PROVIDER=anthropic` and a listed model (`claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`).
3. OpenAI/Gemini/Ollama providers are stubs — selecting them will fail with “reserved for future support”.
4. Check rate limits / Anthropic account billing.

## Auth issues

| Issue | Action |
|-------|--------|
| 401 on protected routes | Login again; access token TTL default `15m`; use `/api/auth/refresh` |
| Login 429 | Auth rate limit (`AUTH_RATE_LIMIT_MAX`, default 20 / 15 min) |
| Cannot open Administration | Need Manager+; writes need Administrator+ |
| Setup 409 | Setup already completed; use admin login |

Default seeded credentials (change in production): see `DEFAULT_ADMIN_*` in `.env.example`.

## CORS / frontend cannot reach API

- `CLIENT_URL` must match the browser origin exactly.
- Web build must use correct `VITE_API_BASE_URL` (Compose: `PUBLIC_API_BASE_URL`).

## Retrieval returns weak context

- Document status should be `active`.
- Enrich title/description/tags (content is synthesized from metadata).
- Confirm agent `documentIds` include the right docs.
- Index refreshes after document CRUD; restart API if index looks stale after restore.

## Export blocked

- Document must be `approved: true`.
- Workflow state must be `Approved` or `Exported`.
- Use approve endpoint/UI before export.

## Backup / restore

| Issue | Action |
|-------|--------|
| `DATABASE_URL is required` | Export it or create `apps/api/.env` |
| `pg_dump` / `pg_restore` not found | Install PostgreSQL client tools |
| Empty restore dump | Confirm path contains `postgres/hkids.dump` or `.sql` |
| After restore, missing Anthropic | Restore `runtime-secrets.json` or reset env key |

## Rate limiting (general API)

Default: 300 requests / 15 minutes per client (`RATE_LIMIT_*`). Raise carefully in production if legitimate traffic is blocked.

## Useful commands

```bash
npm run dev
npm test
npm run lint
npm run build
docker compose logs -f api
```

## Related docs

- [Deployment.md](./Deployment.md)
- [Backup-Restore.md](./Backup-Restore.md)
- [Security.md](./Security.md)
