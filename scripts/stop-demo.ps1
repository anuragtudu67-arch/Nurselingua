<#
  Stop the NurseLinguo demo dev servers that start-demo.ps1 launched.

  It stops only the java/node processes that were listening on :8080 and :5173
  when the launcher finished, and only if the recorded PID still owns that port.
  Docker containers (ningua-mysql, ningua-n8n) are never touched: stop them with
  "npm run infra:down" if you actually want them gone.

  Usage:  powershell -ExecutionPolicy Bypass -File scripts\stop-demo.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$pidFile = Join-Path $PSScriptRoot '.demo-pids.json'

function Get-PortOwner([int]$Port) {
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return [int]$conn.OwningProcess }
  return $null
}

if (-not (Test-Path $pidFile)) {
  Write-Host "No demo PID file at $pidFile - nothing recorded to stop."
  Write-Host "The containers keep running: npm run infra:down if you want them gone."
  exit 0
}

$saved = Get-Content $pidFile -Raw | ConvertFrom-Json

$targets = @(
  @{ Name = 'Backend';  ProcId = $saved.backendPid;  Port = [int]$saved.backendPort },
  @{ Name = 'Frontend'; ProcId = $saved.frontendPid; Port = [int]$saved.frontendPort }
)

$stopped = 0
foreach ($t in $targets) {
  if (-not $t.ProcId) { Write-Host "$($t.Name): nothing recorded - left alone"; continue }
  $owner = Get-PortOwner $t.Port
  if ($owner -ne $t.ProcId) {
    Write-Host "$($t.Name): PID $($t.ProcId) no longer owns :$($t.Port) - left alone"
    continue
  }
  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($t.ProcId)" -ErrorAction SilentlyContinue
  if ($null -eq $p) { Write-Host "$($t.Name): PID $($t.ProcId) already gone"; continue }
  if (@('java.exe', 'node.exe') -notcontains $p.Name) {
    Write-Host "$($t.Name): PID $($t.ProcId) is $($p.Name), not java/node - left alone"
    continue
  }
  Write-Host "Stopping $($t.Name) - PID $($t.ProcId) on :$($t.Port) ($($p.Name))"
  & taskkill /F /T /PID $t.ProcId *> $null
  if ($LASTEXITCODE -eq 0) { $stopped++ }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "Stopped $stopped process(es). Docker containers were not touched."
Write-Host "MySQL and n8n are still up. Use 'npm run infra:down' to stop them."
exit 0
