# Backup and Restore

## Scripts

| Script | Platform |
|--------|----------|
| `scripts/backup.sh` | Bash |
| `scripts/backup.ps1` | PowerShell |
| `scripts/restore.sh` | Bash |
| `scripts/restore.ps1` | PowerShell |

Root npm shortcuts (Windows PowerShell wrappers):

```bash
npm run backup
npm run restore   # requires -BackupPath argument to the underlying script
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL. If unset, scripts load `apps/api/.env` |
| `BACKUP_DIR` | No | Backup root; default `<repo>/backups` |

Requires `pg_dump` on PATH for backup; `pg_restore` and/or `psql` for restore. Optional CSV metadata exports need `psql`.

## What a backup contains

Each run creates `<BACKUP_DIR>/<YYYYMMDD-HHMMSS>/`:

```
postgres/hkids.dump      # custom format
postgres/hkids.sql       # plain SQL
config/api.env           # copy of apps/api/.env if present
config/api.env.example
config/runtime-secrets.json   # if present (Anthropic key from setup, etc.)
exports/knowledge_documents_meta.csv
exports/generated_documents_meta.csv
MANIFEST.json
```

Knowledge and generated document **bodies** are inside the PostgreSQL dump. CSV files are metadata only.

## Backup procedure

### Bash

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/hkids_admin_ai
# optional: export BACKUP_DIR=/secure/backups
./scripts/backup.sh
```

### PowerShell

```powershell
$env:DATABASE_URL = "postgresql://user:pass@host:5432/hkids_admin_ai"
# optional: $env:BACKUP_DIR = "D:\backups\hkids"
.\scripts\backup.ps1
```

Or from repo root: `npm run backup` (uses `apps/api/.env` if `DATABASE_URL` is unset).

## Restore procedure

1. Stop writers (API) if possible.
2. Ensure target database exists and `DATABASE_URL` points to it.
3. Run restore with the backup directory path.
4. Restart the API (migrations apply on startup; already-applied versions in `schema_migrations` are skipped).
5. Verify `GET /api/health` and administrator login.

### Bash

```bash
./scripts/restore.sh /path/to/backups/20260728-153000
```

### PowerShell

```powershell
.\scripts\restore.ps1 -BackupPath "C:\path\to\backups\20260728-153000"
```

Restore behavior:

1. Prefer `postgres/hkids.dump` with `pg_restore --clean --if-exists --no-owner`
2. Else apply `postgres/hkids.sql` via `psql`
3. Copy `config/api.env` → `apps/api/.env` if present
4. Copy `config/runtime-secrets.json` → `apps/api/config/runtime-secrets.json` if present

## Post-restore checklist

- [ ] API restarts cleanly
- [ ] `/api/health` and `/api/ready` return 200
- [ ] Admin login works
- [ ] Agents, conversations, generated documents, feedback, workflows, `ai_usage` look correct
- [ ] Claude key present (env or runtime secrets)
- [ ] Document a restore test date for delivery

## Production Compose note

`docker-compose.production.yml` mounts `./backups` on `db` and `api`. Prefer running backup tools against the DB URL (host tooling or an exec into a client container with `pg_dump`).

## Related docs

- [Deployment.md](./Deployment.md)
- [Troubleshooting.md](./Troubleshooting.md)
- [OPERATIONS.md](./OPERATIONS.md)
