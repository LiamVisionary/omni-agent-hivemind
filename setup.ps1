param(
  [switch]$NonInteractive,
  [switch]$SkipDeps,
  [switch]$SkipBuild,
  [switch]$SkipDashboard,
  [switch]$Force,
  [int]$Port = 0,
  [int]$CollectorPort = 0
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$Missing = New-Object System.Collections.Generic.List[string]
if ($Port -eq 0) { $Port = if ($env:PORT) { [int]$env:PORT } else { 5020 } }
if ($CollectorPort -eq 0) { $CollectorPort = if ($env:AGENT_TELEMETRY_PORT) { [int]$env:AGENT_TELEMETRY_PORT } else { 8787 } }

function Info($Message) { Write-Host $Message -ForegroundColor Cyan }
function Ok($Message) { Write-Host "✓ $Message" -ForegroundColor Green }
function Warn($Message) { Write-Host "! $Message" -ForegroundColor Yellow }
function Fail($Message) { Write-Host "✗ $Message" -ForegroundColor Red }

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ask-YesNo($Prompt, [bool]$DefaultYes = $false) {
  if ($NonInteractive) { return $false }
  $suffix = if ($DefaultYes) { "[Y/n]" } else { "[y/N]" }
  $answer = (Read-Host "$Prompt $suffix").Trim().ToLowerInvariant()
  if ($answer.Length -eq 0) { return $DefaultYes }
  return $answer -eq "y" -or $answer -eq "yes"
}

function Install-WingetPackage($Name, $Id) {
  if (-not (Test-Command winget)) {
    Warn "winget is not available. Install $Name manually: winget install --id $Id"
    return $false
  }
  Info "Installing $Name with winget"
  winget install --id $Id --exact --accept-package-agreements --accept-source-agreements
  return $LASTEXITCODE -eq 0
}

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Invoke-Pnpm {
  param([string[]]$Arguments)
  Refresh-Path
  if (Test-Command pnpm) {
    & pnpm @Arguments
    return
  }
  if (Test-Command corepack) {
    & corepack pnpm @Arguments
    return
  }
  Fail "pnpm is still not available on PATH"
  Write-Host "Open a new terminal or run one of:"
  Write-Host "  npm install -g pnpm"
  Write-Host "  winget install --id pnpm.pnpm"
  exit 1
}

function Ensure-Node {
  if (Test-Command node) {
    Ok "Node found: $(node --version)"
    return
  }
  if (Ask-YesNo "Node.js 20+ is missing. Install Node.js LTS with winget now?" $true) {
    Install-WingetPackage "Node.js LTS" "OpenJS.NodeJS.LTS" | Out-Null
    Refresh-Path
  }
  if (Test-Command node) {
    Ok "Node found: $(node --version)"
  } else {
    $Missing.Add("Node.js 20+")
    Fail "Node is missing"
  }
}

function Ensure-Pnpm {
  if (Test-Command pnpm) {
    Ok "pnpm found: $(pnpm --version)"
    return
  }
  if (Test-Command corepack) {
    if (-not $NonInteractive -and (Ask-YesNo "pnpm is missing. Enable pnpm through Corepack now?" $true)) {
      Info "Enabling pnpm through Corepack"
      corepack enable
      corepack prepare pnpm@8.6.12 --activate
      Refresh-Path
    } elseif ($NonInteractive) {
      Info "pnpm not found; enabling pnpm through Corepack"
      corepack enable
      corepack prepare pnpm@8.6.12 --activate
      Refresh-Path
    }
  }
  if (-not (Test-Command pnpm) -and (Test-Command npm) -and (Ask-YesNo "pnpm is missing. Install pnpm globally with npm now?" $true)) {
    Info "Installing pnpm with npm"
    npm install -g pnpm
    Refresh-Path
  }
  if (-not (Test-Command pnpm) -and (Ask-YesNo "pnpm is missing. Install pnpm with winget now?" $true)) {
    Install-WingetPackage "pnpm" "pnpm.pnpm" | Out-Null
    Refresh-Path
  }
  if (Test-Command pnpm) {
    Ok "pnpm found: $(pnpm --version)"
  } elseif (Test-Command corepack) {
    $pnpmVersion = Invoke-Pnpm @("--version")
    Ok "pnpm available through Corepack: $pnpmVersion"
  } else {
    $Missing.Add("pnpm or corepack")
    Fail "pnpm is missing"
  }
}

function Ensure-Tailscale {
  if (Test-Command tailscale) {
    $status = & tailscale status 2>$null
    if ($LASTEXITCODE -eq 0) {
      Ok "Tailscale is running"
      return $true
    }
    Warn "Tailscale is installed but not connected"
    Warn "Multi-machine collaboration and shared memory sync are disabled until you open Tailscale and sign in, or run: tailscale up"
    return $false
  }
  if (Ask-YesNo "Tailscale is missing. Install it for multi-machine collaboration and shared memory sync?" $true) {
    Install-WingetPackage "Tailscale" "Tailscale.Tailscale" | Out-Null
    Refresh-Path
  }
  if (Test-Command tailscale) {
    Warn "Tailscale is installed but not connected"
    Warn "Open Tailscale and sign in, or run: tailscale up"
  } else {
    Warn "Tailscale is optional and not installed."
    Warn "Multi-machine collaboration and shared memory sync are disabled. Local-only dashboard, agents, and local vault features will still work."
    Warn "To enable multi-machine sync later: winget install --id Tailscale.Tailscale"
  }
  return $false
}

function Ensure-Syncthing([bool]$TailnetSyncEnabled) {
  if (-not $TailnetSyncEnabled) {
    Warn "Skipping Syncthing setup because Tailscale is not connected"
    return
  }
  if (-not (Test-Command syncthing)) {
    if (Ask-YesNo "Syncthing is missing. Install it for realtime shared-brain folder sync?" $true) {
      Install-WingetPackage "Syncthing" "Syncthing.Syncthing" | Out-Null
      Refresh-Path
    }
  }
  if (Test-Command syncthing) {
    Ok "Syncthing found: $(syncthing --version 2>$null | Select-Object -First 1)"
    $ping = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8384/rest/system/ping" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($ping.StatusCode -eq 200) {
      Ok "Syncthing is running on 127.0.0.1:8384"
      return
    }
    if (Ask-YesNo "Start Syncthing in the background now?" $true) {
      Start-Process -WindowStyle Hidden -FilePath "syncthing" -ArgumentList "--no-browser", "--gui-address=127.0.0.1:8384"
      Start-Sleep -Seconds 2
      Ok "Syncthing started on 127.0.0.1:8384"
    }
  } else {
    Warn "Syncthing is unavailable; realtime shared-brain folder sync is disabled."
  }
}

function Ensure-Obsidian {
  $obsidianCommand = Test-Command obsidian
  $obsidianApp = Test-Path (Join-Path $env:LOCALAPPDATA "Obsidian\Obsidian.exe")
  if ($obsidianCommand -or $obsidianApp) {
    Ok "Obsidian found"
    return
  }
  if (Ask-YesNo "Obsidian is missing. Install it for the shared brain desktop app now?" $true) {
    Install-WingetPackage "Obsidian" "Obsidian.Obsidian" | Out-Null
    Refresh-Path
  }
  if ((Test-Command obsidian) -or (Test-Path (Join-Path $env:LOCALAPPDATA "Obsidian\Obsidian.exe"))) {
    Ok "Obsidian installed"
  } else {
    Warn "Obsidian is optional and not installed. Install later with: winget install --id Obsidian.Obsidian"
  }
}

function Ensure-Gpg {
  if (Test-Command gpg) {
    Ok "GPG found: $((gpg --version 2>$null | Select-Object -First 1))"
    return
  }
  if (Ask-YesNo "GPG is missing. Install GnuPG so hive-env-add can refresh encrypted env backups?" $true) {
    Install-WingetPackage "GnuPG" "GnuPG.GnuPG" | Out-Null
    Refresh-Path
  }
  if (Test-Command gpg) {
    Ok "GPG found: $((gpg --version 2>$null | Select-Object -First 1))"
  } else {
    Warn "GPG is optional and not installed. hive-env-add will still update local env files."
  }
}

function Ensure-HiveEnvAdd {
  $binDir = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".local\bin"
  $shimPath = Join-Path $binDir "hive-env-add.cmd"
  $scriptPath = Join-Path $Root "scripts\hive-env-add"
  New-Item -ItemType Directory -Force -Path $binDir | Out-Null
  $pythonCommand = if (Test-Command py) { "py -3" } elseif (Test-Command python) { "python" } elseif (Test-Command python3) { "python3" } else { "" }
  if (-not $pythonCommand) {
    Warn "Python is missing; hive-env-add shim installed but will need Python to run."
    $pythonCommand = "python"
  }
  Set-Content -Path $shimPath -Value "@echo off`r`n$pythonCommand `"$scriptPath`" %*`r`n" -Encoding ASCII
  Ok "hive-env-add installed: $shimPath"
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (($userPath -split ";") -notcontains $binDir) {
    if (Ask-YesNo "Add $binDir to your user PATH for hive-env-add?" $true) {
      $nextPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
      [Environment]::SetEnvironmentVariable("Path", $nextPath, "User")
      Refresh-Path
      Ok "Added $binDir to user PATH"
    } else {
      Warn "Add $binDir to PATH to run hive-env-add from any folder"
    }
  } else {
    Refresh-Path
  }
}

function Open-DashboardIfRequested($Url) {
  if ($SkipDashboard) { return }
  if (Ask-YesNo "Open the HivemindOS dashboard now?" $true) {
    Start-Process $Url
    Ok "Opened dashboard: $Url"
  }
}

function Set-EnvLocal($Key, $Value) {
  $envFile = Join-Path $Root ".env.local"
  if (-not (Test-Path $envFile)) { New-Item -ItemType File -Path $envFile | Out-Null }
  $lines = Get-Content $envFile -ErrorAction SilentlyContinue
  $replaced = $false
  $next = foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($Key))=") {
      $replaced = $true
      "$Key=$Value"
    } else {
      $line
    }
  }
  if (-not $replaced) { $next += "$Key=$Value" }
  Set-Content -Path $envFile -Value $next
}

function Get-HashForFiles($Files) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $text = ""
  foreach ($file in $Files) {
    if (Test-Path $file) {
      $text += (Get-FileHash $file -Algorithm SHA256).Hash
    }
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes($text)
  return [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
}

Info "HivemindOS Windows setup"

Ensure-Node
Ensure-Pnpm
$tailnetSyncEnabled = Ensure-Tailscale
Ensure-Syncthing $tailnetSyncEnabled
Ensure-Obsidian
Ensure-Gpg
Ensure-HiveEnvAdd

if ($Missing.Count -gt 0) {
  Write-Host ""
  Warn "Setup needs required dependencies first:"
  foreach ($item in $Missing) { Write-Host "  - $item" }
  Write-Host ""
  Write-Host "After fixing those, rerun:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\setup.ps1"
  exit 1
}

Set-EnvLocal "NEXT_PUBLIC_TAILNET_SYNC_ENABLED" ($tailnetSyncEnabled.ToString().ToLowerInvariant())
Set-EnvLocal "HIVE_ENV_TAILNET_SYNC" ($tailnetSyncEnabled.ToString().ToLowerInvariant())
Set-EnvLocal "HIVE_ENV_TAILNET_USER" ([Environment]::UserName)
Set-EnvLocal "HONEY_LEDGER_REMOTE_URL" $(if ($env:HONEY_LEDGER_REMOTE_URL) { $env:HONEY_LEDGER_REMOTE_URL } else { "https://hivemindos-honey-ledger.hivemindos.workers.dev" })
Set-EnvLocal "HONEY_LEDGER_ISSUER_ID" $(if ($env:HONEY_LEDGER_ISSUER_ID) { $env:HONEY_LEDGER_ISSUER_ID } else { "hivemindos" })
Set-EnvLocal "HONEY_COMPUTE_GATEWAY_URL" $(if ($env:HONEY_COMPUTE_GATEWAY_URL) { $env:HONEY_COMPUTE_GATEWAY_URL } else { "https://hivemindos-compute-gateway.hivemindos.workers.dev" })
Set-EnvLocal "HIVE_TOKEN_ADDRESS" $(if ($env:HIVE_TOKEN_ADDRESS) { $env:HIVE_TOKEN_ADDRESS } else { "" })
Set-EnvLocal "BANKR_LLM_KEY" $(if ($env:BANKR_LLM_KEY) { $env:BANKR_LLM_KEY } else { "" })
Set-EnvLocal "NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER" $(if ($env:NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER) { $env:NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER } else { "Scheduled" })

$setupCache = Join-Path $Root ".setup-cache"
New-Item -ItemType Directory -Force -Path $setupCache | Out-Null

$depsStamp = Join-Path $setupCache "deps-windows.sha"
$depsHash = Get-HashForFiles @("package.json", "pnpm-lock.yaml")
if ($SkipDeps) {
  Warn "Skipping dependency install because -SkipDeps was provided"
} elseif (-not $Force -and (Test-Path "node_modules") -and (Test-Path $depsStamp) -and ((Get-Content $depsStamp -Raw).Trim() -eq $depsHash)) {
  Ok "Dependencies already installed"
} else {
  Info "Installing app dependencies"
  $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --no-deprecation".Trim()
  Invoke-Pnpm @("install", "--frozen-lockfile")
  Set-Content -Path $depsStamp -Value $depsHash
  Ok "Dependencies installed"
}

$buildStamp = Join-Path $setupCache "build-windows.sha"
$buildHash = Get-HashForFiles @("package.json", "pnpm-lock.yaml", "next.config.ts", "tsconfig.json")
if ($SkipBuild) {
  Warn "Skipping dashboard build because -SkipBuild was provided"
} elseif (-not $Force -and (Test-Path ".next") -and (Test-Path $buildStamp) -and ((Get-Content $buildStamp -Raw).Trim() -eq $buildHash)) {
  Ok "Dashboard build already current"
} else {
  Info "Building dashboard"
  Invoke-Pnpm @("exec", "next", "build", "--webpack")
  Set-Content -Path $buildStamp -Value $buildHash
  Ok "Dashboard built"
}

$dashboardOpenable = $false
if ($SkipDashboard) {
  Warn "Skipping dashboard start because -SkipDashboard was provided"
} else {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    Warn "Port $Port is already in use by PID $($listener.OwningProcess); leaving it alone"
  } else {
    Info "Starting dashboard dev server on port $Port"
    New-Item -ItemType Directory -Force -Path ".next" | Out-Null
    $stdoutPath = Join-Path $Root ".next\hivemindos-windows.log"
    $stderrPath = Join-Path $Root ".next\hivemindos-windows.err.log"
    Refresh-Path
    if (Test-Command pnpm) {
      Start-Process -FilePath "pnpm" -ArgumentList @("exec", "next", "dev", "--webpack", "-p", "$Port") -WorkingDirectory $Root -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -WindowStyle Hidden
    } else {
      Start-Process -FilePath "corepack" -ArgumentList @("pnpm", "exec", "next", "dev", "--webpack", "-p", "$Port") -WorkingDirectory $Root -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -WindowStyle Hidden
    }
    $dashboardOpenable = $true
  }
}

Write-Host ""
Ok "Ready"
Write-Host ""
Write-Host "Dashboard:"
Write-Host "  http://localhost:$Port"
Write-Host ""
Write-Host "Collector:"
Write-Host "  http://localhost:$CollectorPort"
Write-Host ""
if ($tailnetSyncEnabled) {
  Write-Host "Tailscale is connected. Syncthing can sync shared-brain folders over your Tailnet."
} else {
  Write-Host "Local-only mode is ready. Install and log in to Tailscale later to enable multi-machine collaboration and shared memory sync."
}
Write-Host ""
if ($dashboardOpenable) {
  Open-DashboardIfRequested "http://localhost:$Port"
}
