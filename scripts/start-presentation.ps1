<#
.SYNOPSIS
  Starts NBA Performance Explorer as a local production build for a presentation.

.DESCRIPTION
  Serves the built frontend and the API from one local Node process, exactly as the Render
  service does, on http://localhost:<Port>/. Historical tables come from the data committed
  with the app (the 2023-24 recorded season, the 2024 playoff snapshot and the 2018 shot
  archive), so the demonstration does not depend on Wikipedia or NBA.com being reachable.

  The script never installs packages, never downloads anything, never changes Windows settings
  and never touches Git. It builds only when no build exists (or with -Rebuild), using the
  dependencies already installed by `npm ci`.

.PARAMETER Port
  Local port. Default 4310.

.PARAMETER Rebuild
  Run `npm run build` even when a build already exists.

.PARAMETER LiveArchive
  Fetch the 2023-24 and 2024 playoff Wikipedia tables live (falling back to the committed
  snapshot). Default: use the committed snapshot only, which needs no network.

.PARAMETER DemoPlayers
  Serve labelled synthetic player data ("DEMO FIXTURES") for the NBA.com player pages instead
  of querying NBA.com. Default: query NBA.com, and show an honest "unavailable" state offline.

.PARAMETER NoBrowser
  Do not open the browser after startup.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\start-presentation.ps1
#>
[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)][int]$Port = 4310,
  [switch]$Rebuild,
  [switch]$LiveArchive,
  [switch]$DemoPlayers,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stateDir = Join-Path $env:TEMP 'nba-explorer-presentation'
$pidFile = Join-Path $stateDir 'server.pid'
$logFile = Join-Path $stateDir 'server.log'
$errFile = Join-Path $stateDir 'server.err.log'
$url = "http://localhost:$Port/"

function Fail([string]$message) {
  Write-Host ''
  Write-Host "  Cannot start: $message" -ForegroundColor Red
  Write-Host ''
  exit 1
}
function Step([string]$message) { Write-Host "  - $message" }
function Test-Health {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 2
    return ($r.service -eq 'nba-performance-explorer-api' -and $r.status -eq 'ok')
  } catch { return $false }
}

Write-Host ''
Write-Host '  NBA PERFORMANCE EXPLORER - presentation server' -ForegroundColor White
Write-Host "  Repository: $root"
Write-Host ''

# 1. Node.js matching package.json (>=22.12 <23).
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) { Fail 'Node.js 22 is not installed or not on PATH. Install Node.js 22 LTS, then run npm ci once.' }
$version = (& node --version).Trim().TrimStart('v')
$parts = $version.Split('.')
if ([int]$parts[0] -ne 22 -or ([int]$parts[0] -eq 22 -and [int]$parts[1] -lt 12)) {
  Fail "Node.js $version found; this project needs 22.12 or newer within 22.x."
}
Step "Node.js $version"

# 2. Installed dependencies (never installed here: a presentation may be offline).
if (-not (Test-Path (Join-Path $root 'node_modules\express'))) {
  Fail "dependencies are not installed. While online, run once in the repository:  npm ci"
}
Step 'Dependencies present'

# 3. Port: reuse our own server if it is already running; refuse anything else.
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
  if (Test-Health) {
    Step "Already running on port $Port; reusing it"
    if (-not $NoBrowser) { Start-Process $url }
    Write-Host ''
    Write-Host "  Open: $url" -ForegroundColor Green
    exit 0
  }
  Fail "port $Port is used by another program. Choose another port:  scripts\start-presentation.ps1 -Port 4320"
}
Step "Port $Port is free"

# 4. Production build (local only; uses installed dependencies).
$frontendIndex = Join-Path $root 'frontend\dist\index.html'
$serverJs = Join-Path $root 'backend\dist\server.js'
if ($Rebuild -or -not (Test-Path $frontendIndex) -or -not (Test-Path $serverJs)) {
  Step 'Building the production bundle (a minute or two)...'
  $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -eq $npm) { Fail 'npm was not found next to Node.js.' }
  $buildOut = Join-Path $env:TEMP 'nba-explorer-build.log'
  $buildErr = Join-Path $env:TEMP 'nba-explorer-build.err.log'
  $build = Start-Process -FilePath $npm.Source -ArgumentList 'run', 'build' -WorkingDirectory $root `
    -NoNewWindow -Wait -PassThru -RedirectStandardOutput $buildOut -RedirectStandardError $buildErr
  if ($build.ExitCode -ne 0) { Fail "the build failed. See $buildOut and $buildErr" }
}
Step 'Production build present'

# 5. Start the server in the background, logging to a temporary folder.
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$env:NODE_ENV = 'production'
$env:PORT = "$Port"
$env:FRONTEND_DIST = 'frontend/dist'
if ($LiveArchive) { $env:WIKI_ARCHIVE_MODE = 'live' } else { $env:WIKI_ARCHIVE_MODE = 'bundled' }
if ($DemoPlayers) {
  $env:NBA_DATA_PROVIDER = 'fixture'
  $env:NBA_ALLOW_FIXTURE_IN_PRODUCTION = 'true'
} else {
  $env:NBA_DATA_PROVIDER = 'nba-stats'
  $env:NBA_ALLOW_FIXTURE_IN_PRODUCTION = 'false'
  $env:NBA_STATS_TIMEOUT_MS = '8000'
}
$process = Start-Process -FilePath $node.Source -ArgumentList 'backend/dist/server.js' `
  -WorkingDirectory $root -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $logFile -RedirectStandardError $errFile
Set-Content -Path $pidFile -Value $process.Id -Encoding ascii
Step "Server process $($process.Id) started"

# 6. Wait for a real health check, not just an open port.
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  if ($process.HasExited) { break }
  if (Test-Health) { $ready = $true; break }
}
if (-not $ready) {
  $detail = ''
  if (Test-Path $errFile) { $detail = (Get-Content $errFile -Tail 5) -join ' ' }
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  Fail "the server did not report healthy within 30 seconds. $detail (log: $errFile)"
}
Step 'Health check passed'

$archive = 'committed snapshot (no network needed)'
if ($LiveArchive) { $archive = 'live Wikipedia, falling back to the committed snapshot' }
$players = 'NBA.com on request (shows "unavailable" when offline)'
if ($DemoPlayers) { $players = 'labelled DEMO FIXTURES (synthetic, not NBA results)' }
Write-Host ''
Write-Host "  Ready: $url" -ForegroundColor Green
Write-Host "  Historical tables: $archive"
Write-Host "  NBA.com player pages: $players"
Write-Host '  Runbook: docs\release\DEMO_RUNBOOK.md'
Write-Host '  Stop:    powershell -ExecutionPolicy Bypass -File scripts\stop-presentation.ps1'
Write-Host ''
if (-not $NoBrowser) { Start-Process $url }
