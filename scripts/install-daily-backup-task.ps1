param(
  [string]$TaskName = 'ADS Conecta - Backup Supabase',
  [string]$At = '03:00',
  [string]$CloudBackupDir = '',
  [int]$KeepDays = 14
)

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'backup-supabase.ps1'
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Script de backup nao encontrado em $scriptPath."
}

if (-not $env:SUPABASE_DB_URL) {
  throw 'Defina a variavel de ambiente SUPABASE_DB_URL antes de instalar a tarefa. A tarefa usara essa variavel do usuario atual.'
}

if (-not $CloudBackupDir) {
  $oneDriveRoot = $env:OneDrive
  if (-not $oneDriveRoot) {
    $oneDriveRoot = $env:OneDriveConsumer
  }
  if ($oneDriveRoot) {
    $CloudBackupDir = Join-Path $oneDriveRoot 'ADS Conecta\Backups\Supabase'
  }
}

$backupArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -KeepDays $KeepDays"
if ($CloudBackupDir) {
  $backupArguments += " -CloudBackupDir `"$CloudBackupDir`""
}

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument $backupArguments `
  -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $At
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Description 'Backup diario do banco Supabase do ADS Conecta.' `
  -Force | Out-Null

Write-Host "Tarefa criada: $TaskName, diariamente as $At."
if ($CloudBackupDir) {
  Write-Host "Copia em nuvem: $CloudBackupDir"
} else {
  Write-Warning 'OneDrive nao encontrado. A tarefa salvara apenas a copia local.'
}
