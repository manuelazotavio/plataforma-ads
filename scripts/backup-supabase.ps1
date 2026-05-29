param(
  [string]$BackupDir = "$PSScriptRoot\..\backups\supabase",
  [int]$KeepDays = 14
)

$ErrorActionPreference = 'Stop'

if (-not $env:SUPABASE_DB_URL) {
  throw 'Defina a variavel de ambiente SUPABASE_DB_URL com a connection string do banco Supabase antes de executar o backup.'
}

$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npx) {
  throw 'npx.cmd nao encontrado. Instale o Node.js ou execute pelo terminal onde o npm/npx esteja disponivel.'
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$sqlFile = Join-Path $BackupDir "supabase-$timestamp.sql"
$zipFile = Join-Path $BackupDir "supabase-$timestamp.zip"

try {
  & $npx.Source --yes supabase@latest db dump --db-url $env:SUPABASE_DB_URL --file $sqlFile
  if ($LASTEXITCODE -ne 0) {
    throw "supabase db dump falhou com codigo $LASTEXITCODE."
  }

  Compress-Archive -Path $sqlFile -DestinationPath $zipFile -Force
  Remove-Item -LiteralPath $sqlFile -Force

  Get-ChildItem -Path $BackupDir -Filter 'supabase-*.zip' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force

  Write-Host "Backup criado: $zipFile"
} catch {
  if (Test-Path -LiteralPath $sqlFile) {
    Remove-Item -LiteralPath $sqlFile -Force
  }
  throw
}
