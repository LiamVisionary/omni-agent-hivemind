param(
  [switch]$Yes,
  [switch]$NonInteractive,
  [int]$Port = 0
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
if ($Port -eq 0) { $Port = if ($env:PORT) { [int]$env:PORT } else { 5020 } }

function Info($Message) { Write-Host $Message -ForegroundColor Cyan }
function Ok($Message) { Write-Host "✓ $Message" -ForegroundColor Green }
function Warn($Message) { Write-Host "! $Message" -ForegroundColor Yellow }
function Test-Command($Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }

function Ask-YesNo($Prompt, [bool]$DefaultYes = $false) {
  if ($Yes) { return $true }
  if ($NonInteractive) {
    Warn "Would ask: $Prompt"
    return $false
  }
  $suffix = if ($DefaultYes) { "[Y/n]" } else { "[y/N]" }
  $answer = (Read-Host "$Prompt $suffix").Trim().ToLowerInvariant()
  if ($answer.Length -eq 0) { return $DefaultYes }
  return $answer -eq "y" -or $answer -eq "yes"
}

function Remove-ManagedBlock($Path) {
  if (-not (Test-Path $Path)) { return }
  $lines = Get-Content $Path
  $next = New-Object System.Collections.Generic.List[string]
  $skip = $false
  $changed = $false
  foreach ($line in $lines) {
    if ($line -eq "<!-- BEGIN HIVEMINDOS_SHARED_SKILLS -->" -or $line -eq "<!-- BEGIN OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->") {
      $skip = $true
      $changed = $true
      continue
    }
    if ($line -eq "<!-- END HIVEMINDOS_SHARED_SKILLS -->" -or $line -eq "<!-- END OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->") {
      $skip = $false
      continue
    }
    if (-not $skip) { $next.Add($line) }
  }
  if ($changed) {
    Set-Content -Path $Path -Value $next
    Ok "Removed HivemindOS shared-skill block from $Path"
  }
}

function AgentInstructionFiles {
  $home = [Environment]::GetFolderPath("UserProfile")
  @(
    "$home\.codex\AGENTS.md",
    "$home\.claude\CLAUDE.md",
    "$home\.hermes\SOUL.md",
    "$home\.hermes\AGENTS.md",
    "$home\.gemini\GEMINI.md",
    "$home\.openclaw\AGENTS.md",
    "$home\.aeon\AGENTS.md"
  )
  Get-ChildItem "$home\.openclaw" -Directory -Filter "workspace-*" -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "AGENTS.md" }
}

function AgentSkillDirs {
  $home = [Environment]::GetFolderPath("UserProfile")
  @(
    "$home\.codex\skills\karpathy-guidelines",
    "$home\.claude\skills\karpathy-guidelines",
    "$home\.hermes\skills\karpathy-guidelines",
    "$home\.gemini\skills\karpathy-guidelines",
    "$home\.openclaw\skills\karpathy-guidelines",
    "$home\.aeon\skills\karpathy-guidelines"
  )
  Get-ChildItem "$home\.openclaw" -Directory -Filter "workspace-*" -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "skills\karpathy-guidelines" }
}

function Uninstall-WingetPackage($Name, $Id) {
  if (-not (Test-Command winget)) {
    Warn "winget is not available. Uninstall $Name manually if desired."
    return
  }
  winget uninstall --id $Id --exact --accept-source-agreements
}

Info "HivemindOS Windows uninstall"
Warn "This removes only the pieces you approve. Personal vault notes and third-party apps are left alone unless you say yes."

if (Ask-YesNo "Stop HivemindOS dashboard process on port $Port?" $true) {
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
    Ok "Stopped dashboard process $($listener.OwningProcess)"
  }
}

if (Ask-YesNo "Stop Syncthing processes started for HivemindOS?" $true) {
  Get-Process syncthing -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Ok "Stopped Syncthing processes"
}

if (Ask-YesNo "Remove HivemindOS shared-skill instructions from agent files?" $true) {
  $vaultPath = if ($env:NEXT_PUBLIC_OBSIDIAN_VAULT_PATH) { $env:NEXT_PUBLIC_OBSIDIAN_VAULT_PATH } else { "$([Environment]::GetFolderPath("UserProfile"))\Documents\Obsidian\hivemindos-vault" }
  Remove-ManagedBlock (Join-Path $vaultPath "AGENTS.md")
  AgentInstructionFiles | ForEach-Object { Remove-ManagedBlock $_ }
}

if (Ask-YesNo "Remove copied karpathy-guidelines skill from local agent skill folders?" $false) {
  AgentSkillDirs | ForEach-Object {
    if (Test-Path (Join-Path $_ "SKILL.md")) {
      $content = Get-Content (Join-Path $_ "SKILL.md") -Raw
      if ($content -match "name:\s*karpathy-guidelines") {
        Remove-Item $_ -Recurse -Force
        Ok "Removed $_"
      }
    }
  }
}

if (Ask-YesNo "Remove HivemindOS app cache/build/dependencies from this checkout?" $true) {
  foreach ($path in @(".next", ".setup-cache", "node_modules")) {
    if (Test-Path $path) { Remove-Item $path -Recurse -Force }
  }
  Ok "Removed .next, .setup-cache, and node_modules"
}

if (Ask-YesNo "Remove .env.local from this checkout?" $false) {
  Remove-Item ".env.local" -Force -ErrorAction SilentlyContinue
  Ok "Removed .env.local"
}

if (Ask-YesNo "Remove hive-env-add from ~/.local/bin if it points to this checkout?" $true) {
  $binDir = Join-Path ([Environment]::GetFolderPath("UserProfile")) ".local\bin"
  $shimPath = Join-Path $binDir "hive-env-add.cmd"
  if (Test-Path $shimPath) {
    $content = Get-Content $shimPath -Raw
    if ($content.Contains($Root) -and $content.Contains("scripts\hive-env-add")) {
      Remove-Item $shimPath -Force
      Ok "Removed $shimPath"
    } else {
      Warn "Skipped $shimPath because it is not managed by this checkout"
    }
  }
}

if (Ask-YesNo "Uninstall Syncthing itself from this machine?" $false) {
  Uninstall-WingetPackage "Syncthing" "Syncthing.Syncthing"
}

if (Ask-YesNo "Uninstall Tailscale itself from this machine?" $false) {
  Uninstall-WingetPackage "Tailscale" "Tailscale.Tailscale"
}

if (Ask-YesNo "Uninstall pnpm from this machine?" $false) {
  if (Test-Command npm) { npm uninstall -g pnpm | Out-Null }
  Uninstall-WingetPackage "pnpm" "pnpm.pnpm"
}

if (Ask-YesNo "Uninstall GnuPG/GPG from this machine?" $false) {
  Uninstall-WingetPackage "GnuPG" "GnuPG.GnuPG"
}

if (Ask-YesNo "Uninstall Obsidian from this machine?" $false) {
  Uninstall-WingetPackage "Obsidian" "Obsidian.Obsidian"
}

if (Ask-YesNo "Delete this HivemindOS git checkout after uninstall finishes?" $false) {
  $parent = Split-Path -Parent $Root
  $leaf = Split-Path -Leaf $Root
  Set-Location $parent
  Remove-Item $leaf -Recurse -Force
}

Ok "Uninstall prompts complete"
