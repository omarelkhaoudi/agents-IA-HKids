# Delivery Checklist

Use this checklist when handing over the H-Kids Administrative AI Assistant to the customer or operations owner.

## Administrator accounts

- [ ] First `super_admin` created via Setup Wizard or documented seed credentials
- [ ] Default password `Admin123!` changed in every non-dev environment
- [ ] At least one backup administrator (`administrator` or `super_admin`)
- [ ] Roles assigned appropriately (`manager`, `employee`, `read_only` as needed)
- [ ] Administrator email inboxes confirmed for notifications / recovery contact

## Git repository

- [ ] Customer has access to the source repository
- [ ] Default branch documented; release tag or commit SHA recorded for delivery
- [ ] `.env` / secrets **not** committed
- [ ] README + `docs/` present on the delivered revision

## Environment variables

- [ ] `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` set for production
- [ ] `DEFAULT_ADMIN_EMAIL` / `PASSWORD` / `NAME` set and password rotated
- [ ] `ANTHROPIC_API_KEY`, `DEFAULT_PROVIDER`, `DEFAULT_MODEL` configured
- [ ] Rate limit and JWT TTL values reviewed
- [ ] Web `VITE_API_BASE_URL` / `PUBLIC_API_BASE_URL` matches public API URL
- [ ] Production Compose required vars validated (`POSTGRES_PASSWORD`, etc.)

## Anthropic account

- [ ] Customer-owned Anthropic account created
- [ ] API key issued and stored in secrets manager / env / runtime secrets
- [ ] Billing alerts configured
- [ ] Model access verified (`claude-3-5-sonnet-latest` and/or haiku)
- [ ] System status Claude check OK

## Database

- [ ] PostgreSQL 16 provisioned (or Compose `db` service)
- [ ] Migrations `001`–`020` applied (`schema_migrations` populated on API start)
- [ ] Seeded agents, prompts, and knowledge documents reviewed
- [ ] Connectivity from API confirmed (`/api/ready`)

## Backup

- [ ] `scripts/backup.sh` or `backup.ps1` runnable with `pg_dump`
- [ ] `BACKUP_DIR` decided and writable
- [ ] Scheduled backup job defined (cron/Task Scheduler)
- [ ] Sample backup contains `postgres/`, `config/`, `MANIFEST.json`
- [ ] Backup storage access granted to operations owner

## Restore

- [ ] Restore dry-run completed with `restore.sh` / `restore.ps1`
- [ ] Post-restore `/api/health` verified
- [ ] Admin login verified after restore
- [ ] Runtime secrets / `.env` restored when applicable
- [ ] RTO/RPO expectations documented for the customer

## Documentation

- [ ] `docs/Architecture.md` through `docs/Security.md` delivered
- [ ] `docs/OPERATIONS.md` index reviewed
- [ ] This checklist signed off
- [ ] How-tos covered: update prompts, upload documents, create workflows/agents, configure Claude, env vars

## Training

- [ ] Switch between the four prototype agents
- [ ] Update prompts and instructions
- [ ] Attach/remove documents per agent
- [ ] Read dashboard statistics and AI usage
- [ ] Approve/reject generated documents and export
- [ ] Review workflow history and feedback patterns
- [ ] Run backup and restore once with an operator

## Licenses

- [ ] Confirm proprietary ownership / license terms for the delivered codebase
- [ ] Anthropic API Terms accepted by the customer
- [ ] Third-party OSS licenses reviewed (npm packages: Express, React, Anthropic SDK, etc.)

## Dependencies

- [ ] `npm install` succeeds on target Node 20+
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass on delivery commit
- [ ] Docker images build (`apps/api/Dockerfile`, `apps/web/Dockerfile`) if used
- [ ] PostgreSQL client tools available where backups run

## Monitoring

- [ ] `/api/health` and `/api/ready` probed by uptime monitor
- [ ] Administration → System status reviewed by ops
- [ ] API/container logs retention configured
- [ ] AI usage / cost visibility via `/api/ai/usage` and admin exports
- [ ] Alerting contacts listed for API down, DB down, Anthropic failures

## Sign-off

| Item | Owner | Date | OK |
|------|-------|------|----|
| Technical delivery | | | |
| Security / secrets | | | |
| Training complete | | | |
| Backup/restore proven | | | |
