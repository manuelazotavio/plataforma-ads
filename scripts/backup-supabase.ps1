param(
  [string]$BackupDir = "$PSScriptRoot\..\backups\supabase",
  [string]$CloudBackupDir = '',
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

if (-not $CloudBackupDir) {
  $oneDriveRoot = $env:OneDrive
  if (-not $oneDriveRoot) {
    $oneDriveRoot = $env:OneDriveConsumer
  }
  if ($oneDriveRoot) {
    $CloudBackupDir = Join-Path $oneDriveRoot 'ADS Conecta\Backups\Supabase'
  }
}

if ($CloudBackupDir) {
  New-Item -ItemType Directory -Force -Path $CloudBackupDir | Out-Null
}

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

  if ($CloudBackupDir) {
    $cloudZipFile = Join-Path $CloudBackupDir (Split-Path -Leaf $zipFile)
    Copy-Item -LiteralPath $zipFile -Destination $cloudZipFile -Force

    $localHash = (Get-FileHash -LiteralPath $zipFile -Algorithm SHA256).Hash
    $cloudHash = (Get-FileHash -LiteralPath $cloudZipFile -Algorithm SHA256).Hash
    if ($localHash -ne $cloudHash) {
      throw 'A copia do backup no armazenamento em nuvem falhou na verificacao de integridade.'
    }
  }

  Get-ChildItem -Path $BackupDir -Filter 'supabase-*.zip' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force

  if ($CloudBackupDir) {
    Get-ChildItem -Path $CloudBackupDir -Filter 'supabase-*.zip' |
      Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
      Remove-Item -Force
  }

  Write-Host "Backup local criado: $zipFile"
  if ($CloudBackupDir) {
    Write-Host "Backup copiado para a nuvem: $cloudZipFile"
  } else {
    Write-Warning 'OneDrive nao encontrado. O backup foi salvo somente localmente.'
  }
} catch {
  if (Test-Path -LiteralPath $sqlFile) {
    Remove-Item -LiteralPath $sqlFile -Force
  }
  throw
}
