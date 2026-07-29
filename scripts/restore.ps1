param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path $BackupPath)) {
  throw "Backup directory not found: $BackupPath"
}

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
  throw "DATABASE_URL is required for restore."
}

Write-Host "Restoring PostgreSQL from $BackupPath"

$dumpPath = Join-Path $BackupPath "postgres\hkids.dump"
$sqlPath = Join-Path $BackupPath "postgres\hkids.sql"

if (Test-Path $dumpPath) {
  & pg_restore --clean --if-exists --no-owner --dbname=$env:DATABASE_URL $dumpPath
} elseif (Test-Path $sqlPath) {
  & psql $env:DATABASE_URL -f $sqlPath
} else {
  throw "No PostgreSQL dump found in $BackupPath\postgres"
}

$apiEnvBackup = Join-Path $BackupPath "config\api.env"
if (Test-Path $apiEnvBackup) {
  Copy-Item $apiEnvBackup (Join-Path $RootDir "apps\api\.env") -Force
  Write-Host "Restored apps/api/.env"
}

$secretsBackup = Join-Path $BackupPath "config\runtime-secrets.json"
if (Test-Path $secretsBackup) {
  $configDir = Join-Path $RootDir "apps\api\config"
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  Copy-Item $secretsBackup (Join-Path $configDir "runtime-secrets.json") -Force
  Write-Host "Restored runtime secrets"
}

Write-Host "Restore completed. Restart the API to apply migrations/config and verify /api/health."
