# Security

## Authentication

- Login: `POST /api/auth/login` → JWT access token + refresh token
- Access JWT: signed with `JWT_SECRET`, default TTL `15m` (`JWT_ACCESS_EXPIRES_IN`)
- Refresh: opaque 48-byte token, SHA-256 hashed in DB, rotated on refresh, TTL `JWT_REFRESH_EXPIRES_IN_MS` (default 7 days)
- Passwords: bcrypt cost factor **12** (`AuthService`)
- `POST /api/auth/logout-all` revokes sessions for the current user
- Bearer header required for protected routes (`authenticate` middleware)

## RBAC

Roles (`constants/roles.js`): `super_admin`, `administrator`, `manager`, `employee`, `read_only`

Enforced by `authorizeAccess` on protected routers. Highlights:

- Admin reads: Manager+; admin writes: Administrator+
- Prompt writes: Administrator+
- Conversation / document / feedback / retrieval / workflow writes: Employee+
- `read_only`: blocked from write methods

First setup user is created as `super_admin`.

## Transport and HTTP hardening

- `helmet()` enabled; `X-Powered-By` disabled
- CORS restricted to `CLIENT_URL`
- Static nginx config adds frame, MIME, referrer, permissions, and Content Security Policy headers
- JSON body size limit (`JSON_BODY_LIMIT`, default `1mb`)
- Zod validation on mutating routes (`validate` middleware)

## Rate limiting

| Limiter | Default |
|---------|---------|
| `/api` global | 300 / 15 min |
| `/api/auth/login`, `/refresh` | 20 / 15 min |

Tune via `RATE_LIMIT_*` and `AUTH_RATE_LIMIT_*`.

## Secrets and production config

Required / validated in production:

- Strong `JWT_SECRET` (no empty / silent default)
- `DATABASE_URL`
- `CLIENT_URL` not pointing at localhost
- `DEFAULT_ADMIN_PASSWORD` not left as `Admin123!`
- `ANTHROPIC_API_KEY` (Compose production requires it)

Anthropic key may also be stored in `apps/api/config/runtime-secrets.json` after setup — treat as secret; included in backups under `config/`.

Never commit `.env` or `runtime-secrets.json`. Prefer environment injection in production Compose (`JWT_SECRET`, `POSTGRES_PASSWORD`, etc.).

## Data and AI governance

- Generated documents require human approval before export
- No automated send/publish paths in the product design
- AI usage can be tracked (`ENABLE_USAGE_TRACKING`) for audit
- Admin exports (CSV/JSON) are Manager+ and should be handled as sensitive operational data

## Web client notes

- HTML sanitization utilities exist for unsafe HTML (`sanitizeHtml`)
- Admin console gated by `ProtectedRoute` with `minRole="manager"`

## Dependencies (security-relevant)

API: `helmet`, `express-rate-limit`, `bcrypt`, `jsonwebtoken`, `cors`, `@anthropic-ai/sdk`, `zod`, `pg`.

Keep dependencies updated; run `npm test` including `security.test.js` before release.

## Related docs

- [Deployment.md](./Deployment.md)
- [API.md](./API.md)
- [Administration.md](./Administration.md)
