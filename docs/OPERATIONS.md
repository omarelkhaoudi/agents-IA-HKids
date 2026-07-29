# Operations Guide

Short index for day-2 operations. Detailed procedures live in the docs below.

## Documentation map

| Topic | Document |
|-------|----------|
| System design | [Architecture.md](./Architecture.md) |
| Install, Docker, env, Claude | [Deployment.md](./Deployment.md) |
| Admin console, exports, status | [Administration.md](./Administration.md) |
| Backup and restore scripts | [Backup-Restore.md](./Backup-Restore.md) |
| New agents | [Creating-New-Agent.md](./Creating-New-Agent.md) |
| Prompts | [Prompt-System.md](./Prompt-System.md) |
| Knowledge + RAG | [Knowledge-Base.md](./Knowledge-Base.md) |
| Approval and export | [Workflow.md](./Workflow.md) |
| HTTP API + RBAC | [API.md](./API.md) |
| Common failures | [Troubleshooting.md](./Troubleshooting.md) |
| Auth, secrets, hardening | [Security.md](./Security.md) |
| Handover checklist | [DELIVERY_CHECKLIST.md](./DELIVERY_CHECKLIST.md) |

## Quick ownership checklist

- Anthropic account and API key
- Hosting project (API, web, Postgres)
- Source repository access
- Administrator accounts and email inboxes
- Monitoring on `/api/health` and `/api/ready`
- Scheduled backups (`scripts/backup.sh` \| `backup.ps1`) and tested restore

## Governance (unchanged)

- Every output starts as a draft
- No automatic publication, sending, commercial commitment, or sensitive HR decision
- Export only after human approval

## Recovery (summary)

1. Restore latest backup ([Backup-Restore.md](./Backup-Restore.md))
2. Re-apply environment / runtime secrets
3. Restart API (migrations apply on startup; `schema_migrations` tracks 001–009)
4. Verify health, admin login, agents, and Claude status

For agent administration, prompts, documents, and training steps, use [Administration.md](./Administration.md) and [DELIVERY_CHECKLIST.md](./DELIVERY_CHECKLIST.md).
