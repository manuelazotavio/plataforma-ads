param(
  [string]$TaskName = 'ADS Comunica - Backup Supabase',
  [string]$At = '03:00',
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

$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -KeepDays $KeepDays" `
  -WorkingDirectory $projectRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $At
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Description 'Backup diario do banco Supabase do ADS Comunica.' `
  -Force | Out-Null

Write-Host "Tarefa criada: $TaskName, diariamente as $At."
