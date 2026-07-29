# API Reference

Base URL (local): `http://localhost:3001`  
JSON body; CORS origin = `CLIENT_URL`.  
Most `/api/*` routes require `Authorization: Bearer <access_token>` after login.

Public: health, setup, login/refresh/logout.  
Protected routers also run `authorizeAccess` (RBAC).

## Public

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | API name/version |
| GET | `/api/health` | 200 or 503; DB, AI gateway, retrieval, workflow checks |
| GET | `/api/ready` | Ready when DB + workflow ok |
| GET | `/api/setup/status` | Installation state |
| POST | `/api/setup` | Complete wizard (409 if already done) |
| POST | `/api/auth/login` | Auth rate limited |
| POST | `/api/auth/refresh` | Auth rate limited |
| POST | `/api/auth/logout` | |

## Auth (authenticated)

| Method | Path |
|--------|------|
| POST | `/api/auth/logout-all` |
| GET | `/api/auth/me` |

## Admin (Manager+ read; Administrator+ write)

| Method | Path |
|--------|------|
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/statistics` |
| GET | `/api/admin/system-status` |
| GET | `/api/admin/exports/:type` | `type`: `ai-usage` \| `feedback` \| `statistics` \| `generated-documents`; `?format=json\|csv` |
| GET | `/api/admin/agents` |
| POST | `/api/admin/agents` |
| PUT | `/api/admin/agents/:id` |
| DELETE | `/api/admin/agents/:id` |
| GET | `/api/admin/settings` |
| PUT | `/api/admin/settings` |

## AI

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/ai/providers` | Authenticated |
| GET | `/api/ai/models` | |
| GET | `/api/ai/usage` | |
| GET | `/api/ai/statistics` | |
| Writes under `/ai` | | Administrator+ |

## Assistant / conversations

| Method | Path | Write role |
|--------|------|------------|
| GET | `/api/assistant/bootstrap` | — |
| GET | `/api/conversations` | — |
| POST | `/api/conversations` | Employee+ |
| GET | `/api/conversations/:id` | — |
| POST | `/api/conversations/:id/messages` | Employee+ |

## Documents (knowledge)

| Method | Path | Write: Employee+ |
|--------|------|------------------|
| GET/POST | `/api/documents` | |
| PUT/DELETE | `/api/documents/:id` | |

## Prompts

| Method | Path | Write: Administrator+ |
|--------|------|------------------------|
| GET/POST | `/api/prompts` | |
| PUT/DELETE | `/api/prompts/:id` | |

## Retrieval

| Method | Path |
|--------|------|
| POST | `/api/retrieval/search` | Employee+ |

## Feedback

| Method | Path | Write: Employee+ |
|--------|------|------------------|
| GET | `/api/feedback/dashboard` | |
| POST | `/api/feedback` | |
| POST | `/api/feedback/patterns/:id/approve` | |
| POST | `/api/feedback/improvements/:id/approve` | |

## Generated documents + workflow

| Method | Path |
|--------|------|
| POST | `/api/conversations/:id/generated-documents` | Employee+ |
| PUT | `/api/conversations/:id/generated-documents/:documentId` | Employee+ |
| POST | `.../approve` | Employee+ |
| GET | `.../export` | Authenticated (gated by approval state) |
| GET | `.../workflow` | Authenticated |
| POST | `.../workflow/transition` | Employee+ |

## RBAC summary

| Prefix / pattern | GET | Write |
|------------------|-----|-------|
| `/admin` | Manager+ | Administrator+ |
| `/ai` | any auth | Administrator+ |
| `/prompts` | any auth | Administrator+ |
| `/documents`, `/conversations`, `/assistant`, `/retrieval`, `/feedback`, `/workflow` | any auth | Employee+ (writes) |
| `read_only` | reads allowed per rules | blocked |

Roles: `super_admin` > `administrator` > `manager` > `employee` > `read_only`.

## Setup body (high level)

Company fields, admin credentials, optional `anthropicApiKey`, `defaultProvider`, `defaultModel`, `language`, `timezone`, `currency`.

## Related docs

- [Architecture.md](./Architecture.md)
- [Security.md](./Security.md)
- [Administration.md](./Administration.md)
