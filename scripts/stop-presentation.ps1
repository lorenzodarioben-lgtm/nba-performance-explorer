<#
.SYNOPSIS
  Stops the presentation server started by start-presentation.ps1, and nothing else.

.DESCRIPTION
  Reads the process ID the start script recorded and stops it only if that process is still
  this app's Node server (backend/dist/server.js). Other Node processes are never touched.
#>
$ErrorActionPreference = 'Stop'
$pidFile = Join-Path (Join-Path $env:TEMP 'nba-explorer-presentation') 'server.pid'
if (-not (Test-Path $pidFile)) {
  Write-Host '  No presentation server is recorded as running.'
  exit 0
}
$id = [int](Get-Content $pidFile -TotalCount 1)
$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$id" -ErrorAction SilentlyContinue
if ($null -eq $proc) {
  Write-Host "  Process $id has already stopped."
} elseif ($proc.Name -ne 'node.exe' -or $proc.CommandLine -notmatch 'backend[\\/]dist[\\/]server\.js') {
  Write-Host "  Process $id is not the presentation server any more; left running." -ForegroundColor Yellow
} else {
  Stop-Process -Id $id -Force
  Write-Host "  Stopped the presentation server (process $id)." -ForegroundColor Green
}
Remove-Item $pidFile -ErrorAction SilentlyContinue
