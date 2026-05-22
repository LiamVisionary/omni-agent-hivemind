#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-5020}"
COLLECTOR_PORT="${AGENT_TELEMETRY_PORT:-8787}"

info() { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok() { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }

yes_all="false"
non_interactive="false"
delete_repo="false"

usage() {
  cat <<'EOF'
Usage: ./uninstall.sh [options]

Interactively removes HivemindOS local setup pieces. Each destructive action is
prompted one by one unless --yes is provided.

Options:
  --yes, -y              Answer yes to all prompts.
  --non-interactive      Do not prompt; only print what can be removed.
  -h, --help             Show this help.
EOF
}

while (( $# > 0 )); do
  case "$1" in
    --yes|-y)
      yes_all="true"
      ;;
    --non-interactive)
      non_interactive="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      warn "Ignoring unknown option: $1"
      ;;
  esac
  shift
done

ask() {
  local prompt="$1"
  local default="${2:-no}"
  local suffix="[y/N]"
  local answer=""
  if [[ "$yes_all" == "true" ]]; then return 0; fi
  if [[ "$non_interactive" == "true" ]]; then
    warn "Would ask: $prompt"
    return 1
  fi
  [[ "$default" == "yes" ]] && suffix="[Y/n]"
  read -r -p "$prompt $suffix " answer
  answer="$(printf "%s" "$answer" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ -z "$answer" ]]; then
    [[ "$default" == "yes" ]]
    return
  fi
  [[ "$answer" == "y" || "$answer" == "yes" ]]
}

run_if_exists() {
  command -v "$1" >/dev/null 2>&1
}

remove_managed_block() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  local tmp_file
  tmp_file="$(mktemp)"
  awk '
    $0 == "<!-- BEGIN HIVEMINDOS_SHARED_SKILLS -->" || $0 == "<!-- BEGIN OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->" { skip=1; changed=1; next }
    $0 == "<!-- END HIVEMINDOS_SHARED_SKILLS -->" || $0 == "<!-- END OMNI_AGENT_HIVEMIND_SHARED_SKILLS -->" { skip=0; next }
    skip != 1 { print }
    END { if (changed != 1) exit 3 }
  ' "$file" > "$tmp_file" || {
    rm -f "$tmp_file"
    return 0
  }
  mv "$tmp_file" "$file"
  ok "Removed HivemindOS shared-skill block from $file"
}

agent_instruction_files() {
  local agent="$1"
  case "$agent" in
    codex) printf "%s\n" "$HOME/.codex/AGENTS.md" ;;
    claude) printf "%s\n" "$HOME/.claude/CLAUDE.md" ;;
    hermes) printf "%s\n" "$HOME/.hermes/SOUL.md" "$HOME/.hermes/AGENTS.md" ;;
    gemini) printf "%s\n" "$HOME/.gemini/GEMINI.md" ;;
    openclaw)
      printf "%s\n" "$HOME/.openclaw/AGENTS.md"
      for workspace in "$HOME"/.openclaw/workspace-*; do
        [[ -d "$workspace" ]] && printf "%s\n" "$workspace/AGENTS.md"
      done
      ;;
    aeon) printf "%s\n" "$HOME/.aeon/AGENTS.md" ;;
  esac
}

agent_skill_dirs() {
  local agent="$1"
  case "$agent" in
    codex) printf "%s\n" "$HOME/.codex/skills/karpathy-guidelines" ;;
    claude) printf "%s\n" "$HOME/.claude/skills/karpathy-guidelines" ;;
    hermes) printf "%s\n" "$HOME/.hermes/skills/karpathy-guidelines" ;;
    gemini) printf "%s\n" "$HOME/.gemini/skills/karpathy-guidelines" ;;
    openclaw)
      printf "%s\n" "$HOME/.openclaw/skills/karpathy-guidelines"
      for workspace in "$HOME"/.openclaw/workspace-*; do
        [[ -d "$workspace/skills" ]] && printf "%s\n" "$workspace/skills/karpathy-guidelines"
      done
      ;;
    aeon)
      printf "%s\n" "$HOME/.aeon/skills/karpathy-guidelines"
      [[ -n "${AEON_LOCAL_PATH:-}" ]] && printf "%s\n" "$AEON_LOCAL_PATH/skills/karpathy-guidelines"
      ;;
  esac
}

vault_path="${NEXT_PUBLIC_OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian/hivemindos-vault}"
if [[ "$vault_path" == "~/"* ]]; then
  vault_path="$HOME/${vault_path#~/}"
fi

info "HivemindOS uninstall"
warn "This removes only the pieces you approve. Personal vault notes and third-party apps are left alone unless you say yes."

if ask "Stop HivemindOS dashboard processes for this checkout and port $PORT?" "yes"; then
  if run_if_exists lsof; then
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1 || true)"
      cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      if [[ "$cwd" == "$ROOT" || "$cmd" == *"$ROOT"* ]]; then
        kill "$pid" >/dev/null 2>&1 || true
        ok "Stopped dashboard process $pid"
      fi
    done < <(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  else
    warn "lsof is unavailable; skipped process detection"
  fi
fi

if ask "Remove HivemindOS telemetry collector service?" "yes"; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    for plist in "$HOME/Library/LaunchAgents/com.agent-control-room.telemetry.plist" "$HOME/Library/LaunchAgents/com.hivemindos.telemetry.plist"; do
      [[ -f "$plist" ]] || continue
      label="$(/usr/libexec/PlistBuddy -c 'Print :Label' "$plist" 2>/dev/null || basename "$plist" .plist)"
      launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || launchctl unload "$plist" >/dev/null 2>&1 || true
      rm -f "$plist"
      ok "Removed LaunchAgent $label"
    done
  elif run_if_exists systemctl; then
    systemctl --user disable --now agent-telemetry.service >/dev/null 2>&1 || true
    rm -f "$HOME/.config/systemd/user/agent-telemetry.service"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    ok "Removed systemd user service agent-telemetry.service"
  fi
fi

if ask "Stop and remove the HivemindOS Syncthing service wrapper?" "yes"; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    plist="$HOME/Library/LaunchAgents/com.hivemindos.syncthing.plist"
    if [[ -f "$plist" ]]; then
      launchctl bootout "gui/$(id -u)/com.hivemindos.syncthing" >/dev/null 2>&1 || launchctl unload "$plist" >/dev/null 2>&1 || true
      rm -f "$plist"
      ok "Removed HivemindOS Syncthing LaunchAgent"
    fi
  elif run_if_exists systemctl; then
    systemctl --user disable --now hivemindos-syncthing.service >/dev/null 2>&1 || true
    rm -f "$HOME/.config/systemd/user/hivemindos-syncthing.service"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    ok "Removed HivemindOS Syncthing systemd service"
  fi
fi

if ask "Remove HivemindOS shared-skill instructions from agent files?" "yes"; then
  [[ -f "$vault_path/AGENTS.md" ]] && remove_managed_block "$vault_path/AGENTS.md"
  for agent in codex claude hermes gemini openclaw aeon; do
    while IFS= read -r file; do
      remove_managed_block "$file"
    done < <(agent_instruction_files "$agent")
  done
fi

if ask "Remove copied karpathy-guidelines skill from local agent skill folders?" "no"; then
  for agent in codex claude hermes gemini openclaw aeon; do
    while IFS= read -r dir; do
      [[ -d "$dir" ]] || continue
      if [[ -f "$dir/SKILL.md" ]] && grep -q "name: karpathy-guidelines" "$dir/SKILL.md"; then
        rm -rf "$dir"
        ok "Removed $dir"
      else
        warn "Skipped unmanaged skill directory: $dir"
      fi
    done < <(agent_skill_dirs "$agent")
  done
fi

if ask "Remove Aeon shared-brain skill manifest entries created by HivemindOS?" "yes"; then
  aeon_root="${AEON_LOCAL_PATH:-${AEON_HOME:-$HOME/.aeon}}"
  if [[ -f "$aeon_root/skills.json" ]] && run_if_exists node; then
    node - "$aeon_root/skills.json" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.skills = Array.isArray(manifest.skills) ? manifest.skills.filter((skill) => skill?.source !== "shared-brain") : [];
manifest.updatedAt = new Date().toISOString();
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
    ok "Removed shared-brain skills from $aeon_root/skills.json"
  fi
  if [[ -d "$aeon_root/skills" ]]; then
    find "$aeon_root/skills" -mindepth 2 -maxdepth 2 -name .hivemind-skill-source.json -type f 2>/dev/null |
      while IFS= read -r marker; do
        if grep -q '"managedBy": "hivemindos"' "$marker" || grep -q '"provider": "shared-brain"' "$marker"; then
          rm -rf "$(dirname "$marker")"
          ok "Removed $(dirname "$marker")"
        fi
      done
  fi
fi

if ask "Remove the shared Skills shelf created in the Obsidian vault?" "no"; then
  rm -rf "$vault_path/Skills"
  ok "Removed $vault_path/Skills"
fi

if ask "Remove HivemindOS app cache/build/dependencies from this checkout?" "yes"; then
  rm -rf "$ROOT/.next" "$ROOT/.setup-cache" "$ROOT/node_modules"
  ok "Removed .next, .setup-cache, and node_modules"
fi

if ask "Remove .env.local from this checkout?" "no"; then
  rm -f "$ROOT/.env.local"
  ok "Removed .env.local"
fi

if ask "Remove hive-env-add from ~/.local/bin if it points to this checkout?" "yes"; then
  command_path="$HOME/.local/bin/hive-env-add"
  if [[ -L "$command_path" && "$(readlink "$command_path")" == "$ROOT/scripts/hive-env-add" ]]; then
    rm -f "$command_path"
    ok "Removed $command_path"
  elif [[ -f "$command_path" ]] && cmp -s "$command_path" "$ROOT/scripts/hive-env-add"; then
    rm -f "$command_path"
    ok "Removed copied $command_path"
  else
    warn "Skipped $command_path because it is not managed by this checkout"
  fi
fi

if ask "Remove the Homebrew shellenv line HivemindOS setup may have added to ~/.zprofile?" "no"; then
  profile_file="$HOME/.zprofile"
  if [[ -f "$profile_file" ]]; then
    tmp_file="$(mktemp)"
    grep -Fv 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' "$profile_file" |
      grep -Fv 'eval "$(/usr/local/bin/brew shellenv zsh)"' > "$tmp_file" || true
    mv "$tmp_file" "$profile_file"
    ok "Removed Homebrew shellenv line from $profile_file"
  fi
fi

if ask "Uninstall Syncthing itself from this machine?" "no"; then
  if [[ "$(uname -s)" == "Darwin" ]] && run_if_exists brew; then
    brew uninstall syncthing || true
  elif run_if_exists apt-get && run_if_exists sudo; then
    sudo apt-get remove -y syncthing || true
  elif run_if_exists dnf && run_if_exists sudo; then
    sudo dnf remove -y syncthing || true
  elif run_if_exists yum && run_if_exists sudo; then
    sudo yum remove -y syncthing || true
  fi
fi

if ask "Uninstall Tailscale itself from this machine?" "no"; then
  if [[ "$(uname -s)" == "Darwin" ]] && run_if_exists brew; then
    brew uninstall --cask tailscale tailscale-app >/dev/null 2>&1 || true
    brew uninstall tailscale >/dev/null 2>&1 || true
  elif run_if_exists apt-get && run_if_exists sudo; then
    sudo apt-get remove -y tailscale || true
  elif run_if_exists dnf && run_if_exists sudo; then
    sudo dnf remove -y tailscale || true
  elif run_if_exists yum && run_if_exists sudo; then
    sudo yum remove -y tailscale || true
  fi
fi

if ask "Uninstall pnpm from this machine?" "no"; then
  if run_if_exists npm; then npm uninstall -g pnpm >/dev/null 2>&1 || true; fi
  if [[ "$(uname -s)" == "Darwin" ]] && run_if_exists brew; then brew uninstall pnpm >/dev/null 2>&1 || true; fi
fi

if ask "Uninstall Obsidian from this machine?" "no"; then
  if [[ "$(uname -s)" == "Darwin" ]] && run_if_exists brew; then
    brew uninstall --cask obsidian >/dev/null 2>&1 || true
  elif run_if_exists flatpak; then
    flatpak uninstall -y md.obsidian.Obsidian >/dev/null 2>&1 || true
  elif run_if_exists snap && run_if_exists sudo; then
    sudo snap remove obsidian >/dev/null 2>&1 || true
  else
    warn "No automatic Obsidian uninstall path configured for this OS"
  fi
fi

if ask "Delete this HivemindOS git checkout after uninstall finishes?" "no"; then
  delete_repo="true"
fi

ok "Uninstall prompts complete"
if [[ "$delete_repo" == "true" ]]; then
  parent="$(dirname "$ROOT")"
  repo_name="$(basename "$ROOT")"
  info "Deleting checkout: $ROOT"
  cd "$parent"
  rm -rf "$repo_name"
fi
