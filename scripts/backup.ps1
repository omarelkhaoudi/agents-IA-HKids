param(
  [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$BackupRoot = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $RootDir "backups" }
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TargetDir = Join-Path $BackupRoot $Timestamp

New-Item -ItemType Directory -Force -Path (Join-Path $TargetDir "postgres") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TargetDir "config") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $TargetDir "exports") | Out-Null

if (-not $env:DATABASE_URL) {
  $envFile = Join-Path $RootDir "apps\api\.env"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
      $parts = $_.Split('=', 2)
      if ($parts.Length -eq 2) {
        [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
      }
    }
  }
}

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is required for backup."
}

Write-Host "Creating backup in $TargetDir"

& pg_dump --format=custom --file=(Join-Path $TargetDir "postgres\hkids.dump") $env:DATABASE_URL
& pg_dump --format=plain --file=(Join-Path $TargetDir "postgres\hkids.sql") $env:DATABASE_URL

$apiEnv = Join-Path $RootDir "apps\api\.env"
if (Test-Path $apiEnv) {
  Copy-Item $apiEnv (Join-Path $TargetDir "config\api.env")
}

$apiEnvExample = Join-Path $RootDir "apps\api\.env.example"
if (Test-Path $apiEnvExample) {
  Copy-Item $apiEnvExample (Join-Path $TargetDir "config\api.env.example")
}

$secrets = Join-Path $RootDir "apps\api\config\runtime-secrets.json"
if (Test-Path $secrets) {
  Copy-Item $secrets (Join-Path $TargetDir "config\runtime-secrets.json")
}

if (Get-Command psql -ErrorAction SilentlyContinue) {
  & psql $env:DATABASE_URL -c "\copy (SELECT id, title, category, status, source_file_name, created_at FROM knowledge_documents) TO STDOUT WITH CSV HEADER" |
    Set-Content -Encoding utf8 (Join-Path $TargetDir "exports\knowledge_documents_meta.csv")
  & psql $env:DATABASE_URL -c "\copy (SELECT id, conversation_id, agent_code, document_type, approved, created_at FROM generated_documents) TO STDOUT WITH CSV HEADER" |
    Set-Content -Encoding utf8 (Join-Path $TargetDir "exports\generated_documents_meta.csv")
}

@{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  includes = @("postgres", "config", "knowledge_metadata", "generated_documents_metadata")
  note = "Knowledge and generated document bodies are included in the PostgreSQL dump."
} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $TargetDir "MANIFEST.json")

Write-Host "Backup completed: $TargetDir"
