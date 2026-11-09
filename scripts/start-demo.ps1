<#
  NurseLinguo demo stack launcher (owner path).

  Brings up, in order, and reports on each layer:
    1. Docker engine (starts Docker Desktop if needed)
    2. MySQL container ningua-mysql on host port 3307, waiting for "healthy"
    3. Spring Boot backend on :8080 against MySQL (never silently on H2)
    4. Vite dev server on :5173 only (localStorage is per-port)

  Every step checks first, so running it twice is safe: anything already up
  and answering correctly is reused instead of restarted.

  Usage:  scripts\start-demo.cmd          (double-clickable, preferred)
          powershell -ExecutionPolicy Bypass -File scripts\start-demo.ps1
#>
[CmdletBinding()]
param(
  [int]$BackendPort = 8080,
  [int]$FrontendPort = 5173,
  [int]$DbPort = 3307,
  [int]$DockerTimeoutSeconds = 240,
  [int]$BackendTimeoutSeconds = 420,
  [int]$FrontendTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$pidFile = Join-Path $PSScriptRoot '.demo-pids.json'
$backendLog = Join-Path $repoRoot 'backend-mysql.log'
$frontendLog = Join-Path $repoRoot 'frontend-dev.log'

function Say([string]$Message) { Write-Host $Message }
function Fail([string]$Message) { Write-Host ""; Write-Host "FAILED: $Message" -ForegroundColor Red; exit 1 }

function Get-PortOwner([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return $null
}

function Get-ProcInfo([int]$ProcId) {
  return Get-CimInstance Win32_Process -Filter "ProcessId=$ProcId" -ErrorAction SilentlyContinue
}

# Only ever kill a dev process this repo owns. Docker Desktop, the native
# MySQL80 service and anything unrecognised are never touched.
function Test-OurProcess([int]$ProcId, [string]$Pattern) {
  $p = Get-ProcInfo $ProcId
  if ($null -eq $p) { return $false }
  if (@('java.exe', 'node.exe', 'mvn.cmd', 'cmd.exe', 'cloudflared.exe') -notcontains $p.Name) { return $false }
  if ("$($p.CommandLine)" -match $Pattern) { return $true }
  return $false
}

function Stop-Ours([int]$ProcId) {
  & taskkill /F /T /PID $ProcId *> $null
  return ($LASTEXITCODE -eq 0)
}

function Get-Health([string]$Url, [int]$TimeoutSec = 4) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
    return "$($r.Content)"
  } catch {
    return $null
  }
}

# ---------------------------------------------------------------- 1. Docker ---
Say ""
Say "== 1/4 Docker engine =="
$dockerUp = $false
try {
  & docker version --format '{{.Server.Version}}' *> $null
  $dockerUp = ($LASTEXITCODE -eq 0)
} catch { $dockerUp = $false }

if ($dockerUp) {
  $ver = (& docker version --format '{{.Server.Version}}') 2>$null
  Say "Docker engine already running (server $ver)"
} else {
  $desktop = @(
    'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $desktop) { Fail "Docker Desktop.exe not found. Install Docker Desktop, then run this again." }
  Say "Starting Docker Desktop ..."
  Start-Process -FilePath $desktop | Out-Null
  $deadline = (Get-Date).AddSeconds($DockerTimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    Write-Host "." -NoNewline
    try {
      & docker version --format '{{.Server.Version}}' *> $null
      if ($LASTEXITCODE -eq 0) { $dockerUp = $true; break }
    } catch { }
  }
  Say ""
  if (-not $dockerUp) { Fail "Docker engine did not answer within $DockerTimeoutSeconds s. Open Docker Desktop and wait for the whale icon, then retry." }
  Say "Docker engine is up"
}

# ----------------------------------------------------------------- 2. MySQL ---
Say ""
Say "== 2/4 MySQL ($DbPort) =="
$env:MYSQL_PORT = "$DbPort"

function Get-MysqlLine {
  $line = (& docker ps --format '{{.Names}}|{{.Ports}}|{{.Status}}') 2>$null | Where-Object { $_ -like 'ningua-mysql|*' } | Select-Object -First 1
  return $line
}

$mysqlLine = Get-MysqlLine
$mapped = $false
if ($mysqlLine -and $mysqlLine -match ":$DbPort->3306/tcp") { $mapped = $true }

if ($mapped) {
  Say "ningua-mysql already published on host port $DbPort"
} else {
  if ($mysqlLine) { Say "ningua-mysql is up but not published on $DbPort - recreating it with MYSQL_PORT=$DbPort" }
  else { Say "ningua-mysql is not running - starting it with MYSQL_PORT=$DbPort" }
  Say "(MYSQL_PORT is mandatory here: the native MySQL80 service owns 3306)"
  & npm run infra:up
  if ($LASTEXITCODE -ne 0) { Fail "npm run infra:up failed. Is Docker Desktop fully started?" }
}

$deadline = (Get-Date).AddSeconds(180)
$status = ''
while ((Get-Date) -lt $deadline) {
  $status = (& docker inspect -f '{{.State.Health.Status}}' ningua-mysql) 2>$null
  if ($status -eq 'healthy') { break }
  Write-Host "." -NoNewline
  Start-Sleep -Seconds 3
}
Say ""

$mysqlLine = Get-MysqlLine
if ($mysqlLine -and $mysqlLine -notmatch ":$DbPort->3306/tcp") {
  Fail "ningua-mysql is not published on host port $DbPort. Current: $mysqlLine. Run: `$env:MYSQL_PORT=\"$DbPort\"; npm run infra:up"
}
if ($status -ne 'healthy') { Fail "ningua-mysql health is '$status', not 'healthy'. Check: docker logs ningua-mysql" }
Say "MySQL healthy (ningua-mysql, 0.0.0.0:$DbPort->3306/tcp)"

# --------------------------------------------------------------- 3. Backend ---
Say ""
Say "== 3/4 Backend (:$BackendPort) =="
$healthUrl = "http://localhost:$BackendPort/api/health"
$health = Get-Health $healthUrl
$backendMode = ''

if ($health -and $health -match '"service"\s*:\s*"nurselingua-api"') {
  Say "Backend already running - reused"
  $backendMode = 'reused'
} else {
  $owner = Get-PortOwner $BackendPort
  if ($owner) {
    if ($health -and $health -match 'ningua-api-mock') { Say "Port $BackendPort is held by the api-mock (PID $owner) - stopping it" }
    else { Say "Port $BackendPort is held by PID $owner and is not the NurseLingua API - checking it" }
    if (Test-OurProcess $owner 'nurselingua|ningua|spring-boot|mvn|api-mock') {
      if (Stop-Ours $owner) { Say "Reclaimed :$BackendPort (PID $owner stopped)" }
      else { Fail "Could not stop PID $owner holding :$BackendPort. Stop it manually, then retry." }
      Start-Sleep -Seconds 2
    } else {
      $p = Get-ProcInfo $owner
      Fail "Port $BackendPort is held by PID $owner ($($p.Name)) which is not a demo process. Identify and stop it yourself, then retry."
    }
  }

  $mvn = Join-Path $repoRoot '.tools\apache-maven-3.9.9\bin\mvn.cmd'
  if (-not (Test-Path $mvn)) { $mvn = Join-Path $repoRoot 'backend\mvnw.cmd' }
  if (-not (Test-Path $mvn)) { Fail "No Maven found at .tools\apache-maven-3.9.9\bin\mvn.cmd or backend\mvnw.cmd" }

  $env:SPRING_DATASOURCE_URL = "jdbc:mysql://localhost:$DbPort/nurselingua?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
  Say "Starting Spring Boot on :$BackendPort against MySQL on :$DbPort ..."
  if (Test-Path $backendLog) { Remove-Item $backendLog -Force -ErrorAction SilentlyContinue }
  # A tiny generated runner keeps quoting out of the way: no /c argument
  # juggling, and the JDBC URL's '&' characters stay inside a quoted set.
  $runner = Join-Path $env:TEMP 'nurselinguo-backend-run.cmd'
  @(
    '@echo off',
    "set `"SPRING_DATASOURCE_URL=$($env:SPRING_DATASOURCE_URL)`"",
    "cd /d `"$repoRoot`"",
    "`"$mvn`" -f backend/pom.xml spring-boot:run -Dspring-boot.run.arguments=--server.port=$BackendPort > `"$backendLog`" 2>&1"
  ) | Set-Content -Path $runner -Encoding ASCII
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$runner`"" -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null

  $logDeadline = (Get-Date).AddSeconds(45)
  while (-not (Test-Path $backendLog) -and (Get-Date) -lt $logDeadline) { Start-Sleep -Milliseconds 500 }
  if (-not (Test-Path $backendLog)) { Fail "The Maven launcher never wrote $backendLog. Check that cmd.exe can run $mvn" }

  $deadline = (Get-Date).AddSeconds($BackendTimeoutSeconds)
  $health = $null
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 4
    Write-Host "." -NoNewline
    $health = Get-Health $healthUrl 3
    if ($health -and $health -match '"service"\s*:\s*"nurselingua-api"') { break }
    if ((Test-Path $backendLog) -and (Select-String -Path $backendLog -Pattern 'BUILD FAILURE|APPLICATION FAILED TO START' -Quiet)) { break }
  }
  Say ""
  if (-not ($health -and $health -match '"service"\s*:\s*"nurselingua-api"')) {
    if (Test-Path $backendLog) { Say "--- last backend log lines ---"; Get-Content $backendLog -Tail 25 }
    Fail "Backend did not answer $healthUrl. See $backendLog"
  }
  $backendMode = 'started'
}

# Never demo on H2: the boot log must show MySQL and the 8.4 server.
if ($backendMode -eq 'started') {
  $dbOk = (Test-Path $backendLog) -and (Select-String -Path $backendLog -Pattern "jdbc:mysql://localhost:$DbPort/nurselingua" -Quiet)
  $verOk = (Test-Path $backendLog) -and (Select-String -Path $backendLog -Pattern 'Database version: 8\.4' -Quiet)
  if (-not $dbOk) { Fail "Boot log does not show jdbc:mysql://localhost:$DbPort/nurselingua. Refusing to demo on H2. See $backendLog" }
  if (-not $verOk) { Say "WARNING: boot log did not show 'Database version: 8.4' - check $backendLog" }
  else { Say "Backend up on :$BackendPort - jdbc:mysql://localhost:$DbPort/nurselingua, Database version 8.4.x" }
} else {
  Say "Backend up on :$BackendPort - reused (verified by /api/health)"
}

# -------------------------------------------------------------- 4. Frontend ---
Say ""
Say "== 4/4 Frontend (:$FrontendPort) =="
$appUrl = "http://localhost:$FrontendPort"
$frontendMode = ''
$owner = Get-PortOwner $FrontendPort

if ($owner) {
  $proxyHealth = Get-Health "$appUrl/api/health" 6
  if ($proxyHealth -and $proxyHealth -match '"service"\s*:\s*"nurselingua-api"') {
    Say "Vite on $FrontendPort - open it now (reused)"
    $frontendMode = 'reused'
  } elseif (Test-OurProcess $owner 'vite|npm|node') {
    Say "Port $FrontendPort is held by a dev server with a wrong or dead proxy (PID $owner) - restarting it"
    if (Stop-Ours $owner) { Start-Sleep -Seconds 2 } else { Fail "Could not stop PID $owner holding :$FrontendPort" }
  } else {
    $p = Get-ProcInfo $owner
    Fail "Port $FrontendPort is held by PID $owner ($($p.Name)), not Vite. Only :$FrontendPort is allowed for the demo (localStorage is per-port)."
  }
}

if ($frontendMode -ne 'reused') {
  if (-not (Test-Path (Join-Path $repoRoot 'frontend\node_modules'))) {
    Say "frontend\node_modules is missing - running npm install"
    Push-Location (Join-Path $repoRoot 'frontend')
    & npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed in frontend" }
  }

  if (Test-Path $frontendLog) { Remove-Item $frontendLog -Force -ErrorAction SilentlyContinue }
  Say "Starting Vite on :$FrontendPort (a fallback port is never accepted) ..."
  $runner = Join-Path $env:TEMP 'nurselinguo-frontend-run.cmd'
  @(
    '@echo off',
    "cd /d `"$(Join-Path $repoRoot 'frontend')`"",
    "npm run dev > `"$frontendLog`" 2>&1"
  ) | Set-Content -Path $runner -Encoding ASCII
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$runner`"" -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds($FrontendTimeoutSeconds)
  $served = $false
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline
    if ((Test-Path $frontendLog) -and (Select-String -Path $frontendLog -Pattern "Local:\s+http://[^:]+:(\d+)" -Quiet)) {
      $m = Select-String -Path $frontendLog -Pattern "Local:\s+http://[^:]+:(\d+)" | Select-Object -First 1
      $printed = [int]$m.Matches[0].Groups[1].Value
      if ($printed -ne $FrontendPort) {
        Say ""
        Say "Vite printed port $printed instead of $FrontendPort - refusing that (localStorage is per-port):"
        Say "  1. stop the process holding :$FrontendPort, 2. run this launcher again."
        if (Test-Path $frontendLog) { Get-Content $frontendLog -Tail 10 }
        Fail "Vite fell back to :$printed. Nothing else may own :$FrontendPort."
      }
    }
    $page = Get-Health $appUrl 3
    if ($page) { $served = $true; break }
  }
  Say ""
  if (-not $served) {
    if (Test-Path $frontendLog) { Get-Content $frontendLog -Tail 20 }
    Fail "Vite did not serve $appUrl within $FrontendTimeoutSeconds s. See $frontendLog"
  }
  $proxyHealth = Get-Health "$appUrl/api/health" 6
  if (-not ($proxyHealth -and $proxyHealth -match '"service"\s*:\s*"nurselingua-api"')) {
    Say "WARNING: $appUrl loads, but its /api proxy did not reach the backend. Check $frontendLog"
  }
  Say "Vite on $FrontendPort - open it now"
  $frontendMode = 'started'
}

# Record what is actually listening so stop-demo.ps1 can stop exactly that.
$backendPid = Get-PortOwner $BackendPort
$frontendPid = Get-PortOwner $FrontendPort
@{
  backendPid  = $backendPid
  backendPort = $BackendPort
  frontendPid = $frontendPid
  frontendPort = $FrontendPort
  savedAt     = (Get-Date).ToString('s')
} | ConvertTo-Json | Set-Content -Path $pidFile -Encoding ASCII

Say ""
Say "=========================================================="
Say " Demo stack is ready"
Say "   MySQL    : healthy, ningua-mysql on host port $DbPort"
Say "   Backend  : http://localhost:$BackendPort  ($backendMode, Java + MySQL 8.4)"
Say "   Frontend : http://localhost:$FrontendPort  <- open this"
Say "=========================================================="
Say " Stop with: scripts\stop-demo.ps1  (containers keep running)"
exit 0
