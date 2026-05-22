#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5020}"
COLLECTOR_PORT="${AGENT_TELEMETRY_PORT:-8787}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_SHARED_SKILLS=""
CLI_SHARED_SKILL_IMPORTS=""
CLI_SHARED_SKILL_TARGETS=""
CLI_INTERACTIVE=""
CLI_FORCE="false"
CLI_SKIP_DEPS="false"
CLI_SKIP_BUILD="false"
CLI_SKIP_COLLECTOR="false"
CLI_SKIP_DASHBOARD="false"

info() { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok() { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m✗\033[0m %s\n" "$*"; }

missing=()

prompt_yes_no() {
  local prompt="$1"
  local default="${2:-no}"
  local suffix="[y/N]"
  local answer=""
  if [[ "$default" == "yes" ]]; then suffix="[Y/n]"; fi
  setup_is_interactive || return 1
  read -r -p "$prompt $suffix " answer
  answer="$(printf "%s" "$answer" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  if [[ -z "$answer" ]]; then
    [[ "$default" == "yes" ]]
    return
  fi
  [[ "$answer" == "y" || "$answer" == "yes" ]]
}

load_homebrew_shellenv() {
  local brew_bin=""
  if command -v brew >/dev/null 2>&1; then
    brew_bin="$(command -v brew)"
  elif [[ -x /opt/homebrew/bin/brew ]]; then
    brew_bin="/opt/homebrew/bin/brew"
  elif [[ -x /usr/local/bin/brew ]]; then
    brew_bin="/usr/local/bin/brew"
  fi
  if [[ -n "$brew_bin" ]]; then
    eval "$("$brew_bin" shellenv)"
    return 0
  fi
  return 1
}

offer_homebrew_profile_update() {
  [[ "$(uname -s)" == "Darwin" && -n "${HOME:-}" ]] || return 0
  command -v brew >/dev/null 2>&1 || return 0
  local brew_bin
  brew_bin="$(command -v brew)"
  local profile_file="$HOME/.zprofile"
  local shellenv_line="eval \"\$($brew_bin shellenv zsh)\""
  if [[ -f "$profile_file" ]] && grep -Fqx "$shellenv_line" "$profile_file"; then
    ok "Homebrew shellenv already present in $profile_file"
    return 0
  fi
  if prompt_yes_no "Add Homebrew to your zsh PATH in $profile_file now?" "yes"; then
    touch "$profile_file"
    printf "\n%s\n" "$shellenv_line" >> "$profile_file"
    ok "Homebrew shellenv added to $profile_file"
  else
    warn "Homebrew is available for this setup run, but future terminals may need: $shellenv_line"
  fi
}

ensure_homebrew() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    return 1
  fi
  if load_homebrew_shellenv; then
    offer_homebrew_profile_update
    return 0
  fi
  if ! prompt_yes_no "Homebrew is missing. Install Homebrew now so setup can install pnpm, Tailscale, and Syncthing?" "yes"; then
    return 1
  fi
  if ! command -v curl >/dev/null 2>&1; then
    warn "curl is required to install Homebrew automatically"
    return 1
  fi
  info "Installing Homebrew"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_homebrew_shellenv || return 1
  offer_homebrew_profile_update
  ok "Homebrew installed: $(brew --version | head -1)"
}

refresh_tool_paths() {
  load_homebrew_shellenv >/dev/null 2>&1 || true
  if command -v npm >/dev/null 2>&1; then
    local npm_prefix=""
    npm_prefix="$(npm config get prefix 2>/dev/null || true)"
    if [[ -n "$npm_prefix" && "$npm_prefix" != "undefined" && -d "$npm_prefix/bin" ]]; then
      case ":$PATH:" in
        *":$npm_prefix/bin:"*) ;;
        *) export PATH="$npm_prefix/bin:$PATH" ;;
      esac
    fi
  fi
  hash -r 2>/dev/null || true
}

pnpm_version() {
  refresh_tool_paths
  if command -v pnpm >/dev/null 2>&1; then
    pnpm --version 2>/dev/null
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm --version 2>/dev/null
    return
  fi
  return 1
}

pnpm_run() {
  refresh_tool_paths
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
    return
  fi
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
    return
  fi
  fail "pnpm is still not available on PATH"
  echo "Open a new terminal or run one of:"
  echo "  npm install -g pnpm"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    echo "  brew install pnpm"
  fi
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./setup.sh [options]

Options:
  --import-skills[=AGENTS]      Import skills into the shared notes hive.
                                With no AGENTS value, imports all supported agents.
                                AGENTS: all,none,codex,claude,hermes,gemini,openclaw,aeon
  --share-skills[=AGENTS]       Advertise/mirror the shared skill shelf to agents.
                                With no AGENTS value, targets all supported agents.
  --no-shared-skills            Seed the shared shelf only; do not import from or advertise to agents.
  --non-interactive             Do not prompt. Uses explicit flags/env or safe defaults.
  --interactive                 Force prompts when running in a TTY.
  --skip-deps                   Skip pnpm install.
  --skip-build                  Skip next build.
  --skip-collector              Skip collector service installation/restart.
  --skip-dashboard              Skip starting/restarting the dashboard dev server.
  --force                       Re-run setup work even when cached checks say it is current.
  -h, --help                    Show this help.

Environment overrides:
  HIVE_SHARED_SKILLS=true|false
  HIVE_SHARED_SKILL_IMPORTS=all|none|codex,hermes,aeon
  HIVE_SHARED_SKILL_TARGETS=all|none|codex,hermes,aeon
  HIVE_SETUP_INTERACTIVE=false
EOF
}

consume_optional_value() {
  local current="$1"
  local next="${2:-}"
  if [[ "$current" == *=* ]]; then
    printf "%s" "${current#*=}"
    return 0
  fi
  if [[ -n "$next" && "$next" != -* ]]; then
    printf "%s" "$next"
    return 0
  fi
  printf "all"
}

parse_args() {
  while (( $# > 0 )); do
    case "$1" in
      --import-skills|--import-skills=*)
        CLI_SHARED_SKILLS="true"
        CLI_SHARED_SKILL_IMPORTS="$(consume_optional_value "$1" "${2:-}")"
        if [[ "$1" != *=* && -n "${2:-}" && "$2" != -* ]]; then shift; fi
        ;;
      --share-skills|--share-skills=*|--shared-skill-agents|--shared-skill-agents=*)
        CLI_SHARED_SKILLS="true"
        CLI_SHARED_SKILL_IMPORTS="${CLI_SHARED_SKILL_IMPORTS:-none}"
        CLI_SHARED_SKILL_TARGETS="$(consume_optional_value "$1" "${2:-}")"
        if [[ "$1" != *=* && -n "${2:-}" && "$2" != -* ]]; then shift; fi
        ;;
      --no-shared-skills)
        CLI_SHARED_SKILLS="false"
        CLI_SHARED_SKILL_IMPORTS="none"
        CLI_SHARED_SKILL_TARGETS="none"
        ;;
      --non-interactive|--yes|-y)
        CLI_INTERACTIVE="false"
        ;;
      --interactive)
        CLI_INTERACTIVE="true"
        ;;
      --skip-deps)
        CLI_SKIP_DEPS="true"
        ;;
      --skip-build)
        CLI_SKIP_BUILD="true"
        ;;
      --skip-collector)
        CLI_SKIP_COLLECTOR="true"
        ;;
      --skip-dashboard|--no-start)
        CLI_SKIP_DASHBOARD="true"
        ;;
      --force)
        CLI_FORCE="true"
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        fail "Unknown setup option: $1"
        echo
        usage
        exit 2
        ;;
    esac
    shift
  done
}

cd "$ROOT"

parse_args "$@"

info "HivemindOS setup"

install_rsync_if_missing() {
  if command -v rsync >/dev/null 2>&1; then
    ok "rsync found: $(rsync --version 2>/dev/null | head -1)"
    return
  fi
  if ! setup_is_interactive; then
    warn "rsync is missing; skipping optional Tailnet repair sync install in non-interactive setup"
    return
  fi
  if ! prompt_yes_no "rsync is missing. Install it for Tailnet vault repair sync?" "yes"; then
    warn "Skipping rsync install; Tailnet rsync repair sync is disabled"
    return
  fi
  warn "rsync is missing; trying to install it for Tailnet vault sync"
  if [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    brew install rsync
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y rsync
  elif command -v dnf >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo dnf install -y rsync
  elif command -v yum >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo yum install -y rsync
  else
    missing+=("Install rsync for Tailnet vault sync")
    fail "rsync is missing"
    return
  fi
  command -v rsync >/dev/null 2>&1 && ok "rsync installed"
}

install_syncthing_if_missing() {
  if command -v syncthing >/dev/null 2>&1; then
    ok "Syncthing found: $(syncthing --version 2>/dev/null | head -1)"
    return
  fi
  if ! setup_is_interactive; then
    warn "Syncthing is missing; skipping optional realtime shared-brain sync install in non-interactive setup"
    return
  fi
  if ! prompt_yes_no "Syncthing is missing. Install it for realtime shared-brain folder sync?" "yes"; then
    warn "Skipping Syncthing install; realtime shared-brain folder sync is disabled"
    return
  fi
  warn "Syncthing is missing; trying to install it for realtime folder sync"
  if [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    brew install syncthing
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y syncthing
  elif command -v dnf >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo dnf install -y syncthing
  elif command -v yum >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo yum install -y syncthing
  else
    missing+=("Install Syncthing for realtime folder sync")
    fail "Syncthing is missing"
    return
  fi
  command -v syncthing >/dev/null 2>&1 && ok "Syncthing installed"
}

start_syncthing_if_available() {
  command -v syncthing >/dev/null 2>&1 || return
  syncthing_responds() {
    curl -fsS --max-time 2 http://127.0.0.1:8384/rest/system/ping >/dev/null 2>&1
  }
  wait_for_syncthing() {
    local attempt
    for attempt in 1 2 3 4 5 6 7 8 9 10; do
      syncthing_responds && return 0
      sleep 1
    done
    return 1
  }
  if wait_for_syncthing; then
    ok "Syncthing is running on 127.0.0.1:8384"
    return
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew services start syncthing >/dev/null 2>&1 || true
  elif command -v systemctl >/dev/null 2>&1; then
    systemctl --user enable --now syncthing >/dev/null 2>&1 || true
  fi

  if ! wait_for_syncthing; then
    if command -v syncthing >/dev/null 2>&1 && ! pgrep -x syncthing >/dev/null 2>&1; then
      nohup syncthing --no-browser --gui-address=127.0.0.1:8384 >/dev/null 2>&1 &
    fi
    wait_for_syncthing || true
  fi

  if syncthing_responds; then
    ok "Syncthing is running on 127.0.0.1:8384"
  else
    warn "Syncthing is installed, but its web UI is not responding yet"
    warn "Setup will continue; open Syncthing later at http://127.0.0.1:8384 if shared-brain sync needs pairing"
  fi
}

tailscale_cli_candidates() {
  command -v tailscale 2>/dev/null || true
  [[ -x /Applications/Tailscale.app/Contents/MacOS/tailscale ]] && printf "%s\n" "/Applications/Tailscale.app/Contents/MacOS/tailscale"
  [[ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]] && printf "%s\n" "/Applications/Tailscale.app/Contents/MacOS/Tailscale"
}

format_tailscale_error() {
  printf "%s" "$1" | tr '\n' ' ' | sed 's/[[:space:]]\{1,\}/ /g'
}

run_tailscale_set_ssh() {
  local use_sudo="${1:-false}"
  local cli output
  tailscale_ssh_error=""
  while IFS= read -r cli; do
    [[ -n "$cli" ]] || continue
    if [[ "$use_sudo" == "true" ]]; then
      output="$(sudo "$cli" set --ssh=true 2>&1)" || {
        tailscale_ssh_error="$output"
        continue
      }
    else
      output="$("$cli" set --ssh=true 2>&1)" || {
        tailscale_ssh_error="$output"
        continue
      }
    fi
    return 0
  done < <(tailscale_cli_candidates | awk '!seen[$0]++')
  return 1
}

run_tailscale_set_ssh_sudo_noninteractive() {
  local cli output
  tailscale_ssh_error=""
  while IFS= read -r cli; do
    [[ -n "$cli" ]] || continue
    output="$(sudo -n "$cli" set --ssh=true 2>&1)" || {
      tailscale_ssh_error="$output"
      continue
    }
    return 0
  done < <(tailscale_cli_candidates | awk '!seen[$0]++')
  return 1
}

enable_tailscale_ssh() {
  if ! command -v tailscale >/dev/null 2>&1; then
    return
  fi
  if ! tailscale status >/dev/null 2>&1; then
    return
  fi
  if ! tailscale set --help 2>&1 | grep -q -- '--ssh'; then
    warn "This Tailscale version does not support Tailscale SSH"
    return
  fi
  if tailscale debug prefs 2>/dev/null | grep -q '"RunSSH": true'; then
    ok "Tailscale SSH already advertised by this machine"
    return
  fi
  tailscale_ssh_error=""
  if run_tailscale_set_ssh false; then
    ok "Tailscale SSH advertised by this machine"
  elif command -v sudo >/dev/null 2>&1 && run_tailscale_set_ssh_sudo_noninteractive; then
    ok "Tailscale SSH advertised by this machine"
  elif command -v sudo >/dev/null 2>&1 && setup_is_interactive && prompt_yes_no "Tailscale SSH needs admin privileges. Run sudo tailscale set --ssh now?" "yes"; then
    if run_tailscale_set_ssh true; then
      ok "Tailscale SSH advertised by this machine"
    else
      warn "Could not advertise Tailscale SSH automatically"
      if [[ -n "$tailscale_ssh_error" ]]; then
        warn "Tailscale said: $(format_tailscale_error "$tailscale_ssh_error")"
      fi
      warn "Run this on each sync machine if prompted for admin rights: sudo tailscale set --ssh"
      return
    fi
  else
    warn "Could not advertise Tailscale SSH automatically"
    if [[ -n "$tailscale_ssh_error" ]]; then
      warn "Tailscale said: $(format_tailscale_error "$tailscale_ssh_error")"
    fi
    warn "Run this on each sync machine if prompted for admin rights: sudo tailscale set --ssh"
    return
  fi
  if ! tailscale debug prefs 2>/dev/null | grep -q '"RunSSH": true'; then
    warn "Tailscale accepted the SSH setting, but verification did not report RunSSH=true yet"
  fi
}

install_tailscale_if_missing() {
  if command -v tailscale >/dev/null 2>&1; then
    return 0
  fi

  if ! setup_is_interactive; then
    return 1
  fi
  if ! prompt_yes_no "Tailscale is missing. Install it for multi-machine collaboration and shared memory sync?" "yes"; then
    return 1
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    warn "Tailscale is not installed; trying to install it for multi-machine sync"
    brew install --cask tailscale || true
    if ! command -v tailscale >/dev/null 2>&1; then
      brew install tailscale || true
    fi
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    if command -v curl >/dev/null 2>&1; then
      warn "Tailscale is not installed; trying to install it for multi-machine sync"
      curl -fsSL https://tailscale.com/install.sh | sh || true
    else
      warn "Install curl first, then run: curl -fsSL https://tailscale.com/install.sh | sh"
    fi
  else
    return 1
  fi

  if command -v tailscale >/dev/null 2>&1; then
    ok "Tailscale installed"
    return 0
  fi

  warn "Tailscale install did not put the tailscale CLI on PATH"
  return 1
}

obsidian_is_installed() {
  if command -v obsidian >/dev/null 2>&1; then
    return 0
  fi
  [[ "$(uname -s)" == "Darwin" && -d "/Applications/Obsidian.app" ]]
}

install_obsidian_if_missing() {
  if obsidian_is_installed; then
    ok "Obsidian found"
    return 0
  fi
  if ! setup_is_interactive; then
    warn "Obsidian is missing; skipping optional desktop app install in non-interactive setup"
    return 0
  fi
  if ! prompt_yes_no "Obsidian is missing. Install it for the shared brain desktop app now?" "yes"; then
    warn "Skipping Obsidian install; the shared brain still works as local markdown files"
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    info "Installing Obsidian with Homebrew"
    brew install --cask obsidian
  elif command -v flatpak >/dev/null 2>&1; then
    info "Installing Obsidian with Flatpak"
    flatpak install -y flathub md.obsidian.Obsidian
  elif command -v snap >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    info "Installing Obsidian with snap"
    sudo snap install obsidian --classic
  else
    warn "No automatic Obsidian installer found for this OS"
    warn "Install Obsidian later from https://obsidian.md/download"
    return 0
  fi
  if obsidian_is_installed; then
    ok "Obsidian installed"
  else
    warn "Obsidian install finished, but setup could not verify the app on PATH"
  fi
}

install_gpg_if_missing() {
  if command -v gpg >/dev/null 2>&1; then
    ok "GPG found: $(gpg --version 2>/dev/null | head -1)"
    return 0
  fi
  if ! setup_is_interactive; then
    warn "GPG is missing; encrypted hive-env-add note backups are disabled in non-interactive setup"
    return 0
  fi
  if ! prompt_yes_no "GPG is missing. Install GnuPG so hive-env-add can refresh encrypted env backups?" "yes"; then
    warn "Skipping GnuPG install; hive-env-add will still update local env files"
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    info "Installing GnuPG with Homebrew"
    brew install gnupg
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    info "Installing GnuPG with apt"
    sudo apt-get update
    sudo apt-get install -y gnupg
  elif command -v dnf >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    info "Installing GnuPG with dnf"
    sudo dnf install -y gnupg2
  elif command -v yum >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    info "Installing GnuPG with yum"
    sudo yum install -y gnupg2
  else
    warn "No automatic GnuPG installer found for this OS"
    warn "Install GnuPG later to enable encrypted hive-env-add note backups"
    return 0
  fi
  if command -v gpg >/dev/null 2>&1; then
    ok "GPG installed: $(gpg --version 2>/dev/null | head -1)"
  else
    warn "GnuPG install finished, but setup could not verify gpg on PATH"
  fi
}

install_hive_env_add() {
  local bin_dir="${HOME}/.local/bin"
  local command_path="$bin_dir/hive-env-add"
  mkdir -p "$bin_dir"
  chmod +x "$ROOT/scripts/hive-env-add"
  if ln -sf "$ROOT/scripts/hive-env-add" "$command_path" 2>/dev/null; then
    ok "hive-env-add installed: $command_path"
  else
    cp "$ROOT/scripts/hive-env-add" "$command_path"
    chmod +x "$command_path"
    ok "hive-env-add installed: $command_path"
  fi
  case ":$PATH:" in
    *":$bin_dir:"*) ;;
    *) warn "Add $bin_dir to PATH to run hive-env-add from any folder" ;;
  esac
}

install_pnpm_if_missing() {
  refresh_tool_paths
  if command -v pnpm >/dev/null 2>&1; then
    ok "pnpm found: $(pnpm --version)"
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    if ! setup_is_interactive || prompt_yes_no "pnpm is missing. Enable pnpm through Corepack now?" "yes"; then
      info "pnpm not found; enabling pnpm through corepack"
      corepack enable
      corepack prepare pnpm@8.6.12 --activate
      ok "pnpm enabled: $(pnpm_version)"
      return 0
    fi
  fi
  if command -v npm >/dev/null 2>&1; then
    if setup_is_interactive && prompt_yes_no "pnpm is missing. Install pnpm globally with npm now?" "yes"; then
      info "Installing pnpm with npm"
      npm install -g pnpm
      ok "pnpm installed: $(pnpm_version)"
      return 0
    fi
  fi
  if setup_is_interactive && [[ "$(uname -s)" == "Darwin" ]] && { command -v brew >/dev/null 2>&1 || ensure_homebrew; }; then
    if prompt_yes_no "pnpm is missing. Install pnpm with Homebrew now?" "yes"; then
      info "Installing pnpm with Homebrew"
      brew install pnpm
      ok "pnpm installed: $(pnpm_version)"
      return 0
    fi
  fi
  missing+=("pnpm or corepack")
  fail "pnpm is missing"
  return 1
}

setup_is_interactive() {
  if [[ "$CLI_INTERACTIVE" == "false" ]]; then return 1; fi
  if [[ "$CLI_INTERACTIVE" == "true" ]]; then [[ -t 0 && -t 1 ]] && return 0 || return 1; fi
  [[ -t 0 && -t 1 && "${CI:-}" != "true" && "${HIVE_SETUP_INTERACTIVE:-true}" != "false" ]]
}

normalize_agent_list() {
  printf "%s" "$1" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'
}

interactive_skill_multiselect() {
  node "$ROOT/scripts/shared-skill-select.mjs"
}

configure_shared_skills() {
  local enable="${CLI_SHARED_SKILLS:-${HIVE_SHARED_SKILLS:-}}"
  local imports="${CLI_SHARED_SKILL_IMPORTS:-${HIVE_SHARED_SKILL_IMPORTS:-}}"
  local targets="${CLI_SHARED_SKILL_TARGETS:-${HIVE_SHARED_SKILL_TARGETS:-}}"

  if [[ -n "$enable" ]]; then
    case "$(normalize_agent_list "$enable")" in
      0|false|no|off)
        imports="none"
        targets="none"
        ;;
      *)
        imports="${imports:-all}"
        if [[ "$(normalize_agent_list "${imports:-}")" == "all" ]]; then
          targets="${targets:-all}"
        else
          targets="${targets:-$imports}"
        fi
        ;;
    esac
  elif setup_is_interactive; then
    echo
    info "Shared skill setup"
    echo "Share skills between local agent runtimes through the shared notes Skills shelf?"
    read -r -p "Allow shared skills? [Y/n] " enable
    case "$(normalize_agent_list "$enable")" in
      n|no|0|false|off)
        imports="none"
        targets="none"
        ;;
      *)
        selection="$(interactive_skill_multiselect)"
        if [[ "$selection" == "all" ]]; then
          imports="all"
          targets="all"
        else
          imports="$selection"
          targets="$selection"
        fi
        ;;
    esac
  else
    imports="${imports:-none}"
    targets="${targets:-all}"
  fi

  imports="$(normalize_agent_list "${imports:-none}")"
  targets="$(normalize_agent_list "${targets:-none}")"
  ./scripts/seed-shared-skills.sh --import-sources "$imports" --share-targets "$targets"
}

if command -v node >/dev/null 2>&1; then
  ok "Node found: $(node --version)"
else
  missing+=("Node.js 20+")
  fail "Node is missing"
fi

load_homebrew_shellenv || true
install_pnpm_if_missing || true

if command -v corepack >/dev/null 2>&1; then
  corepack prepare pnpm@8.6.12 --activate >/dev/null 2>&1 || true
  refresh_tool_paths
fi

tailscale_ip=""
tailnet_sync_enabled="false"
install_tailscale_if_missing || true
if command -v tailscale >/dev/null 2>&1; then
  if tailscale status >/dev/null 2>&1; then
    ok "Tailscale is running"
    tailscale_ip="$(tailscale ip -4 2>/dev/null | head -1 || true)"
    tailnet_sync_enabled="true"
    enable_tailscale_ssh
  else
    warn "Tailscale is installed but not connected"
    warn "Multi-machine collaboration and shared memory sync are disabled until you open Tailscale and sign in, or run: tailscale up"
  fi
else
  warn "Tailscale is optional and not installed."
  warn "Multi-machine collaboration and shared memory sync are disabled. Local-only dashboard, agents, and local vault features will still work."
  warn "To enable multi-machine sync later:"
  warn "  macOS: brew install --cask tailscale"
  warn "  Linux: curl -fsSL https://tailscale.com/install.sh | sh"
fi

if [[ "$tailnet_sync_enabled" == "true" ]]; then
  install_rsync_if_missing
  install_syncthing_if_missing
  start_syncthing_if_available
else
  warn "Skipping Tailnet rsync/Syncthing setup because Tailscale is not connected"
fi

install_obsidian_if_missing
install_gpg_if_missing

if (( ${#missing[@]} > 0 )); then
  echo
  if (( ${#missing[@]} == 1 )); then
    warn "Setup needs one required dependency first:"
  else
    warn "Setup needs a couple things first:"
  fi
  for item in "${missing[@]}"; do
    echo "  - $item"
  done
  if printf "%s\n" "${missing[@]}" | grep -q "pnpm"; then
    echo
    echo "Install pnpm with one of:"
    if [[ "$(uname -s)" == "Darwin" ]]; then
      echo "  npm install -g pnpm"
      echo "  brew install pnpm"
    else
      echo "  npm install -g pnpm"
    fi
  fi
  echo
  if (( ${#missing[@]} == 1 )); then
    echo "After fixing that, rerun:"
  else
    echo "After fixing those, rerun:"
  fi
  echo "  ./setup.sh"
  exit 1
fi

set_env_local() {
  local key="$1"
  local value="$2"
  local env_file="$ROOT/.env.local"
  touch "$env_file"
  if grep -q "^${key}=" "$env_file"; then
    local tmp_file
    tmp_file="$(mktemp)"
    awk -v key="$key" -v value="$value" 'BEGIN { replaced=0 } $0 ~ "^" key "=" { print key "=" value; replaced=1; next } { print } END { if (!replaced) print key "=" value }' "$env_file" > "$tmp_file"
    mv "$tmp_file" "$env_file"
  else
    printf "%s=%s\n" "$key" "$value" >> "$env_file"
  fi
}

set_env_local "NEXT_PUBLIC_TAILNET_SYNC_ENABLED" "$tailnet_sync_enabled"
set_env_local "HIVE_ENV_TAILNET_SYNC" "$tailnet_sync_enabled"
set_env_local "HIVE_ENV_TAILNET_USER" "$(id -un 2>/dev/null || printf "%s" "${USER:-}")"
set_env_local "HONEY_LEDGER_REMOTE_URL" "${HONEY_LEDGER_REMOTE_URL:-https://hivemindos-honey-ledger.hivemindos.workers.dev}"
set_env_local "HONEY_LEDGER_ISSUER_ID" "${HONEY_LEDGER_ISSUER_ID:-hivemindos}"
set_env_local "HONEY_COMPUTE_GATEWAY_URL" "${HONEY_COMPUTE_GATEWAY_URL:-https://hivemindos-compute-gateway.hivemindos.workers.dev}"
set_env_local "HIVE_TOKEN_ADDRESS" "${HIVE_TOKEN_ADDRESS:-}"
set_env_local "BANKR_LLM_KEY" "${BANKR_LLM_KEY:-}"
set_env_local "NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER" "${NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER:-Scheduled}"

shared_vault_path="${NEXT_PUBLIC_OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian/hivemindos-vault}"
if [[ "$shared_vault_path" == "~/"* ]]; then
  shared_vault_path="$HOME/${shared_vault_path#~/}"
fi
scheduled_folder="${NEXT_PUBLIC_OBSIDIAN_SCHEDULED_FOLDER:-Scheduled}"
mkdir -p "$shared_vault_path/$scheduled_folder"
if [[ ! -f "$shared_vault_path/$scheduled_folder/README.md" ]]; then
  cat > "$shared_vault_path/$scheduled_folder/README.md" <<'EOF'
# Scheduled

Shared schedule definitions and run history for HivemindOS agents.

- `Scheduled/<device>/<schedule>/schedule.md` stores each schedule snapshot.
- `run0001-<agent>-<timestamp>.md` files store execution history.
- Schedules can opt into injecting past run notes for continuity, anti-repetition, and comparisons.
EOF
fi

install_hive_env_add

configure_shared_skills

setup_cache_dir="$ROOT/.setup-cache"
mkdir -p "$setup_cache_dir"

hash_files() {
  if command -v shasum >/dev/null 2>&1; then
    shasum "$@" | shasum | awk '{print $1}'
  else
    sha256sum "$@" | sha256sum | awk '{print $1}'
  fi
}

deps_stamp="$setup_cache_dir/deps.sha"
deps_hash="$(hash_files package.json pnpm-lock.yaml)"
if [[ "$CLI_SKIP_DEPS" == "true" ]]; then
  warn "Skipping dependency install because --skip-deps was provided"
elif [[ "$CLI_FORCE" != "true" && -d "$ROOT/node_modules" && -f "$deps_stamp" && "$(cat "$deps_stamp" 2>/dev/null)" == "$deps_hash" ]]; then
  ok "Dependencies already installed"
else
  info "Installing app dependencies"
  NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation" pnpm_run install --frozen-lockfile
  printf "%s\n" "$deps_hash" > "$deps_stamp"
  ok "Dependencies installed"
fi

if [[ "$CLI_SKIP_COLLECTOR" == "true" ]]; then
  warn "Skipping local telemetry collector because --skip-collector was provided"
else
  info "Installing local telemetry collector"
  hermes_restart_mode="now"
  if setup_is_interactive; then
    hermes_restart_mode="ask"
  fi
  AGENT_TELEMETRY_PORT="$COLLECTOR_PORT" AGENT_TELEMETRY_HERMES_RESTART="${AGENT_TELEMETRY_HERMES_RESTART:-$hermes_restart_mode}" ./scripts/install-telemetry-collector.sh
  ok "Collector installed"
fi

build_stamp="$setup_cache_dir/build.sha"
build_hash="$(hash_files package.json pnpm-lock.yaml next.config.ts tsconfig.json)"
if [[ "$CLI_SKIP_BUILD" == "true" ]]; then
  warn "Skipping dashboard build because --skip-build was provided"
elif [[ "$CLI_FORCE" != "true" && -d "$ROOT/.next" && -f "$build_stamp" && "$(cat "$build_stamp" 2>/dev/null)" == "$build_hash" ]]; then
  ok "Dashboard build already current"
else
  info "Building dashboard"
  pnpm_run build
  printf "%s\n" "$build_hash" > "$build_stamp"
  ok "Dashboard built"
fi

start_dashboard() {
  info "Starting dashboard dev server on port $PORT"
  mkdir -p "$ROOT/.next"
  refresh_tool_paths
  if command -v pnpm >/dev/null 2>&1; then
    nohup ./scripts/run-with-memory-limit.sh --limit-mb 5000 -- pnpm exec next dev --webpack -p "$PORT" > "$ROOT/.next/hivemindos.log" 2>&1 &
  else
    nohup ./scripts/run-with-memory-limit.sh --limit-mb 5000 -- corepack pnpm exec next dev --webpack -p "$PORT" > "$ROOT/.next/hivemindos.log" 2>&1 &
  fi
  sleep 2
}

open_dashboard_if_requested() {
  local url="$1"
  setup_is_interactive || return 0
  if ! prompt_yes_no "Open the HivemindOS dashboard now?" "yes"; then
    return 0
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$url" >/dev/null 2>&1 &
  else
    warn "Could not find a browser opener. Open this URL manually: $url"
    return 0
  fi
  ok "Opened dashboard: $url"
}

dashboard_openable="false"
if [[ "$CLI_SKIP_DASHBOARD" == "true" ]]; then
  warn "Skipping dashboard start because --skip-dashboard was provided"
else
  port_pid="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | head -1 || true)"
  if [[ -n "$port_pid" ]]; then
    port_cmd="$(ps -p "$port_pid" -o command= 2>/dev/null || true)"
    port_cwd="$(lsof -a -p "$port_pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1 || true)"
    if [[ "$port_cwd" == "$ROOT" && "$port_cmd" == *"next"* ]]; then
      info "Restarting existing dashboard on port $PORT"
      kill "$port_pid"
      sleep 2
      start_dashboard
      dashboard_openable="true"
    else
      warn "Port $PORT is already in use by another process; leaving it alone"
      warn "Use PORT=<free-port> ./setup.sh or stop PID $port_pid first"
    fi
  else
    start_dashboard
    dashboard_openable="true"
  fi
fi

local_url="http://localhost:$PORT"
network_url=""
collector_url=""

if [[ -n "$tailscale_ip" ]]; then
  network_url="http://$tailscale_ip:$PORT"
  collector_url="http://$tailscale_ip:$COLLECTOR_PORT"
fi

echo
ok "Ready"
echo
echo "Dashboard:"
echo "  $local_url"
if [[ -n "$network_url" ]]; then
  echo "  $network_url"
fi
echo
echo "Collector:"
if [[ -n "$collector_url" ]]; then
  echo "  $collector_url"
else
  echo "  http://localhost:$COLLECTOR_PORT"
fi
echo
if [[ "$tailnet_sync_enabled" == "true" ]]; then
  echo "On other Tailscale machines that run agents, clone the repo and run only:"
  echo "  ./scripts/install-telemetry-collector.sh"
  echo
  echo "The dashboard will discover collectors automatically. Realtime folder sync uses Syncthing over your Tailnet by default; Tailscale SSH + rsync remains an advanced fallback."
else
  echo "Local-only mode is ready. Install and log in to Tailscale later to enable multi-machine collaboration and shared memory sync."
fi
echo
if [[ "$dashboard_openable" == "true" ]]; then
  open_dashboard_if_requested "$local_url"
fi
