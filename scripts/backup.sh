#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"

mkdir -p "$TARGET_DIR/postgres" "$TARGET_DIR/config" "$TARGET_DIR/exports"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$ROOT_DIR/apps/api/.env" ]]; then
    # shellcheck disable=SC1091
    set -a
    source "$ROOT_DIR/apps/api/.env"
    set +a
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for backup." >&2
  exit 1
fi

echo "Creating backup in $TARGET_DIR"

pg_dump --format=custom --file="$TARGET_DIR/postgres/hkids.dump" "$DATABASE_URL"
pg_dump --format=plain --file="$TARGET_DIR/postgres/hkids.sql" "$DATABASE_URL"

if [[ -f "$ROOT_DIR/apps/api/.env" ]]; then
  cp "$ROOT_DIR/apps/api/.env" "$TARGET_DIR/config/api.env"
fi

if [[ -f "$ROOT_DIR/apps/api/.env.example" ]]; then
  cp "$ROOT_DIR/apps/api/.env.example" "$TARGET_DIR/config/api.env.example"
fi

if [[ -f "$ROOT_DIR/apps/api/config/runtime-secrets.json" ]]; then
  cp "$ROOT_DIR/apps/api/config/runtime-secrets.json" "$TARGET_DIR/config/runtime-secrets.json"
fi

if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -c "\\copy (SELECT id, title, category, status, source_file_name, created_at FROM knowledge_documents) TO STDOUT WITH CSV HEADER" \
    > "$TARGET_DIR/exports/knowledge_documents_meta.csv" || true
  psql "$DATABASE_URL" -c "\\copy (SELECT id, conversation_id, agent_code, document_type, approved, created_at FROM generated_documents) TO STDOUT WITH CSV HEADER" \
    > "$TARGET_DIR/exports/generated_documents_meta.csv" || true
fi

cat > "$TARGET_DIR/MANIFEST.json" <<EOF
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "includes": ["postgres", "config", "knowledge_metadata", "generated_documents_metadata"],
  "note": "Knowledge and generated document bodies are included in the PostgreSQL dump."
}
EOF

echo "Backup completed: $TARGET_DIR"
