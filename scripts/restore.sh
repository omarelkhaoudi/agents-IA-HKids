#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_PATH="${1:-}"

if [[ -z "$BACKUP_PATH" ]]; then
  echo "Usage: ./scripts/restore.sh <backup-directory>" >&2
  exit 1
fi

if [[ ! -d "$BACKUP_PATH" ]]; then
  echo "Backup directory not found: $BACKUP_PATH" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ROOT_DIR/apps/api/.env" ]]; then
    # shellcheck disable=SC1091
    set -a
    source "$ROOT_DIR/apps/api/.env"
    set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for restore." >&2
  exit 1
fi

echo "Restoring PostgreSQL from $BACKUP_PATH"

if [[ -f "$BACKUP_PATH/postgres/hkids.dump" ]]; then
  pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$BACKUP_PATH/postgres/hkids.dump"
elif [[ -f "$BACKUP_PATH/postgres/hkids.sql" ]]; then
  psql "$DATABASE_URL" -f "$BACKUP_PATH/postgres/hkids.sql"
else
  echo "No PostgreSQL dump found in $BACKUP_PATH/postgres" >&2
  exit 1
fi

if [[ -f "$BACKUP_PATH/config/api.env" ]]; then
  cp "$BACKUP_PATH/config/api.env" "$ROOT_DIR/apps/api/.env"
  echo "Restored apps/api/.env"
fi

if [[ -f "$BACKUP_PATH/config/runtime-secrets.json" ]]; then
  mkdir -p "$ROOT_DIR/apps/api/config"
  cp "$BACKUP_PATH/config/runtime-secrets.json" "$ROOT_DIR/apps/api/config/runtime-secrets.json"
  echo "Restored runtime secrets"
fi

echo "Restore completed. Restart the API to apply migrations/config and verify /api/health."
