#!/usr/bin/env bash
set -euo pipefail

PORT="${AGENT_TELEMETRY_PORT:-8787}"
HERMES_API_HOST="${AGENT_TELEMETRY_HERMES_API_HOST:-127.0.0.1}"
HERMES_API_PORT="${AGENT_TELEMETRY_HERMES_API_PORT:-8642}"
HERMES_RESTART_MODE="${AGENT_TELEMETRY_HERMES_RESTART:-now}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COLLECTOR="$APP_DIR/scripts/agent-telemetry-collector.mjs"
SYNCTHING_RUNNER="$APP_DIR/scripts/run-syncthing.sh"
NODE_BIN="$(command -v node)"

if [[ ! -f "$COLLECTOR" ]]; then
  echo "Missing collector: $COLLECTOR" >&2
  exit 1
fi

install_rsync_if_missing() {
  if command -v rsync >/dev/null 2>&1; then
    return
  fi
  echo "rsync is missing; trying to install it for Tailnet vault sync"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew install rsync
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y rsync
  elif command -v dnf >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo dnf install -y rsync
  elif command -v yum >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo yum install -y rsync
  else
    echo "Install rsync to use Tailnet vault sync." >&2
  fi
}

install_syncthing_if_missing() {
  if command -v syncthing >/dev/null 2>&1; then
    return
  fi
  echo "Syncthing is missing; trying to install it for realtime folder sync"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew install syncthing
  elif command -v apt-get >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y syncthing
  elif command -v dnf >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo dnf install -y syncthing
  elif command -v yum >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
    sudo yum install -y syncthing
  else
    echo "Install Syncthing to use realtime folder sync." >&2
  fi
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

homebrew_tailscale_cli() {
  local prefix candidate
  for candidate in /opt/homebrew/opt/tailscale/bin/tailscale /opt/homebrew/bin/tailscale /usr/local/opt/tailscale/bin/tailscale /usr/local/bin/tailscale; do
    [[ -x "$candidate" ]] && printf "%s\n" "$candidate" && return
  done
  if command -v brew >/dev/null 2>&1; then
    prefix="$(brew --prefix tailscale 2>/dev/null || true)"
    [[ -n "$prefix" && -x "$prefix/bin/tailscale" ]] && printf "%s\n" "$prefix/bin/tailscale"
  fi
}

homebrew_tailscale_formula_installed() {
  command -v brew >/dev/null 2>&1 && brew list --formula tailscale >/dev/null 2>&1
}

tailscale_up_retry_args_from_error() {
  awk '
    /^[[:space:]]*tailscale up[[:space:]]/ {
      sub(/^[[:space:]]*tailscale up[[:space:]]*/, "");
      print;
      exit;
    }
  '
}

connect_homebrew_tailscaled() {
  local formula_cli="$1"
  local output retry_args
  output="$(run_with_timeout 45 sudo "$formula_cli" up --timeout=30s 2>&1)" && return 0
  retry_args="$(printf "%s\n" "$output" | tailscale_up_retry_args_from_error)"
  if [[ -n "$retry_args" ]]; then
    # shellcheck disable=SC2086
    output="$(run_with_timeout 45 sudo "$formula_cli" up $retry_args 2>&1)" && return 0
  fi
  printf "%s\n" "$output" >&2
  return 1
}

quit_macos_tailscale_gui() {
  [[ "$(uname -s)" == "Darwin" ]] || return 0
  osascript -e 'quit app "Tailscale"' >/dev/null 2>&1 || true
  sleep 2
}

setup_homebrew_tailscaled_for_fleet() {
  [[ "$(uname -s)" == "Darwin" ]] || return 1
  [[ -t 0 && -t 1 ]] || return 1
  [[ "${HIVE_TAILSCALED_SWITCH_ATTEMPTED:-false}" != "true" ]] || return 1
  export HIVE_TAILSCALED_SWITCH_ATTEMPTED="true"
  load_homebrew_shellenv || return 1
  if ! prompt_yes_no "Switch this Mac to the Homebrew Tailscale daemon so Fleet can manage Tailnet reachability reliably?" "yes"; then
    echo "Leaving the current Tailscale backend active. If Fleet cannot reach this Mac, install/start the Homebrew tailscaled daemon later." >&2
    return 1
  fi
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew is required for the managed macOS tailscaled setup." >&2
    return 1
  fi
  if ! homebrew_tailscale_formula_installed; then
    echo "Installing Homebrew Tailscale CLI/daemon"
    HOMEBREW_NO_INSTALL_CLEANUP=1 brew install --formula tailscale
  fi
  echo "Restarting Homebrew tailscaled service"
  quit_macos_tailscale_gui
  if ! sudo brew services restart tailscale; then
    echo "Could not restart the Homebrew tailscaled service." >&2
    return 1
  fi
  local formula_cli
  formula_cli="$(homebrew_tailscale_cli)"
  if [[ -z "$formula_cli" ]]; then
    echo "Homebrew tailscale CLI was not found after install/start." >&2
    return 1
  fi
  echo "Connecting Homebrew tailscaled"
  if ! connect_homebrew_tailscaled "$formula_cli"; then
    echo "Homebrew tailscaled did not finish connecting. Open Tailscale auth if prompted, then rerun setup." >&2
    return 1
  fi
  if ! run_with_timeout 10 sudo "$formula_cli" status >/dev/null 2>&1; then
    echo "Homebrew tailscaled started, but status did not respond quickly." >&2
    return 1
  fi
  echo "Homebrew tailscaled is connected"
}

enable_tailscale_ssh() {
  if ! command -v tailscale >/dev/null 2>&1 || ! tailscale status >/dev/null 2>&1; then
    return
  fi
  if ! tailscale set --help 2>&1 | grep -q -- '--ssh'; then
    echo "This Tailscale version does not support Tailscale SSH." >&2
    return
  fi
  if tailscale debug prefs 2>/dev/null | grep -q '"RunSSH": true'; then
    echo "Tailscale SSH already advertised by this machine"
    return
  fi
  local tailscale_ssh_error=""
  if tailscale_ssh_error="$(tailscale set --ssh=true 2>&1)"; then
    echo "Tailscale SSH advertised by this machine"
  elif command -v sudo >/dev/null 2>&1 && tailscale_sudo_error="$(sudo -n tailscale set --ssh=true 2>&1)"; then
    echo "Tailscale SSH advertised by this machine"
  else
    if [[ -n "${tailscale_sudo_error:-}" && "$tailscale_ssh_error" != *"sandboxed Tailscale GUI builds"* ]]; then
      tailscale_ssh_error="$tailscale_sudo_error"
    fi
    echo "Could not advertise Tailscale SSH automatically." >&2
    if [[ -n "$tailscale_ssh_error" ]]; then
      echo "Tailscale said: $(printf "%s" "$tailscale_ssh_error" | tr '\n' ' ' | sed 's/[[:space:]]\{1,\}/ /g')" >&2
    fi
    if [[ "$tailscale_ssh_error" == *"sandboxed Tailscale GUI builds"* ]]; then
      echo "This macOS Tailscale build cannot host Tailscale SSH. Shared-brain Syncthing can still work, but Tailscale SSH features from this Mac are disabled." >&2
      echo "Fleet collector discovery does not require Tailscale SSH; it uses normal Tailnet HTTP on port $PORT." >&2
      echo "For the most reliable managed Fleet setup on macOS, use the Homebrew tailscaled daemon instead of the sandboxed GUI backend." >&2
      if setup_homebrew_tailscaled_for_fleet; then
        enable_tailscale_ssh
      fi
    else
      echo "Run on this machine if prompted for admin rights: sudo tailscale set --ssh" >&2
    fi
    return
  fi
  if ! tailscale debug prefs 2>/dev/null | grep -q '"RunSSH": true'; then
    echo "Tailscale accepted the SSH setting, but verification did not report RunSSH=true yet." >&2
  fi
}

stop_existing_listener() {
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  elif command -v fuser >/dev/null 2>&1; then
    pids="$(fuser "$PORT/tcp" 2>/dev/null || true)"
  fi
  if [[ -n "$pids" ]]; then
    echo "Stopping existing collector listener on port $PORT: $pids"
    kill $pids >/dev/null 2>&1 || true
    sleep 1
  fi
}

run_with_timeout() {
  local seconds="$1"
  shift
  "$@" &
  local pid="$!"
  local elapsed=0
  while kill -0 "$pid" >/dev/null 2>&1; do
    if (( elapsed >= seconds )); then
      kill "$pid" >/dev/null 2>&1 || true
      sleep 1
      kill -9 "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  wait "$pid"
}

launchctl_bounded() {
  local seconds="$1"
  shift
  if ! run_with_timeout "$seconds" launchctl "$@"; then
    echo "launchctl $* did not finish quickly; continuing setup." >&2
    return 1
  fi
}

prompt_yes_no() {
  local question="$1"
  local default="${2:-yes}"
  local answer=""
  if [[ ! -t 0 || ! -t 1 ]]; then
    [[ "$default" == "yes" ]]
    return
  fi
  if [[ "$default" == "yes" ]]; then
    read -r -p "$question [Y/n] " answer
    [[ ! "$answer" =~ ^[Nn] ]]
  else
    read -r -p "$question [y/N] " answer
    [[ "$answer" =~ ^[Yy] ]]
  fi
}

collector_local_health() {
  curl -fsS --max-time 2 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1
}

wait_for_local_collector() {
  local seconds="${1:-10}"
  local elapsed=0
  while (( elapsed < seconds )); do
    if collector_local_health; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

maybe_allow_node_through_macos_firewall() {
  if [[ "$(uname -s)" != "Darwin" || ! -x /usr/libexec/ApplicationFirewall/socketfilterfw ]]; then
    return
  fi
  if ! prompt_yes_no "Allow this collector's Node binary through the macOS firewall for Tailnet dashboards?" "yes"; then
    echo "Skipping macOS firewall allow-list. If another dashboard cannot reach this collector, allow incoming connections for: $NODE_BIN" >&2
    return
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$NODE_BIN" >/dev/null 2>&1 || true
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$NODE_BIN" >/dev/null 2>&1 || true
    echo "Allowed Node collector binary through macOS firewall: $NODE_BIN"
  else
    echo "sudo is unavailable; allow incoming connections for this Node binary manually: $NODE_BIN" >&2
  fi
}

maybe_disable_tailscale_shields_up() {
  if ! command -v tailscale >/dev/null 2>&1 || ! tailscale status >/dev/null 2>&1; then
    return
  fi
  if ! tailscale debug prefs 2>/dev/null | grep -q '"ShieldsUp": true'; then
    return
  fi
  echo "Tailscale Shields Up is enabled; other Tailnet machines cannot reach this collector while it is on." >&2
  if ! prompt_yes_no "Disable Tailscale Shields Up now so Fleet dashboards can reach this collector?" "yes"; then
    echo "Leaving Shields Up enabled. Disable later with: tailscale set --shields-up=false" >&2
    return
  fi
  if tailscale set --shields-up=false >/dev/null 2>&1; then
    echo "Disabled Tailscale Shields Up"
  elif command -v sudo >/dev/null 2>&1 && sudo tailscale set --shields-up=false >/dev/null 2>&1; then
    echo "Disabled Tailscale Shields Up"
  else
    echo "Could not disable Shields Up automatically. Run: tailscale set --shields-up=false" >&2
  fi
}

hermes_api_healthy() {
  curl -fsS --max-time 2 "http://$HERMES_API_HOST:$HERMES_API_PORT/health" >/dev/null 2>&1
}

should_apply_hermes_gateway_change() {
  case "$HERMES_RESTART_MODE" in
    later|skip|no|0|false)
      echo "Hermes API settings were updated. Start or restart Hermes later so the API server settings take effect." >&2
      return 1
      ;;
    ask)
      if [[ -t 0 && -t 1 ]]; then
        echo
        echo "Hermes API settings were updated for dashboard chat bridging."
        echo "The Hermes gateway must be started or restarted before those settings take effect."
        read -r -p "Start/restart Hermes gateway now? [Y/n] " answer
        case "$answer" in
          n|N|no|NO|No)
            echo "Skipping Hermes gateway start/restart. Run 'hermes gateway start' later to enable dashboard chat bridging." >&2
            return 1
            ;;
        esac
      fi
      return 0
      ;;
    *)
      return 0
      ;;
  esac
}

wait_for_hermes_api() {
  local seconds="${1:-5}"
  local elapsed=0
  while (( elapsed < seconds )); do
    if hermes_api_healthy; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

activate_hermes_gateway() {
  local status
  status="$(hermes gateway status 2>&1 || true)"
  if printf "%s" "$status" | grep -qi "not running"; then
    echo "Starting Hermes gateway so the API server settings take effect"
    run_with_timeout 10 hermes gateway start >/dev/null 2>&1
    return
  fi

  echo "Restarting Hermes gateway so the API server settings take effect"
  run_with_timeout 5 hermes gateway stop >/dev/null 2>&1 || true
  run_with_timeout 10 hermes gateway start >/dev/null 2>&1
}

configure_hermes_api_server() {
  if ! command -v hermes >/dev/null 2>&1; then
    return
  fi

  if hermes_api_healthy; then
    echo "Hermes API server is already healthy"
    return
  fi

  echo "Configuring Hermes API server on $HERMES_API_HOST:$HERMES_API_PORT"
  hermes config set API_SERVER_ENABLED true >/dev/null || echo "Could not set API_SERVER_ENABLED; continuing" >&2
  hermes config set API_SERVER_HOST "$HERMES_API_HOST" >/dev/null || echo "Could not set API_SERVER_HOST; continuing" >&2
  hermes config set API_SERVER_PORT "$HERMES_API_PORT" >/dev/null || echo "Could not set API_SERVER_PORT; continuing" >&2

  if should_apply_hermes_gateway_change; then
    if ! activate_hermes_gateway; then
      echo "Hermes gateway did not start quickly; continuing setup. Run 'hermes gateway start' later if dashboard chat bridging is not healthy." >&2
    fi
  fi

  if wait_for_hermes_api 5; then
    echo "Hermes API server is healthy"
  else
    echo "Hermes API server is not healthy yet; collector /chat will report this if delegation is attempted." >&2
  fi
}

configure_hermes_api_server

TAILNET_SYNC_ENABLED="false"
if command -v tailscale >/dev/null 2>&1 && tailscale status >/dev/null 2>&1; then
  TAILNET_SYNC_ENABLED="true"
else
  echo "Tailscale is not installed and logged in; multi-machine collaboration and shared memory sync are disabled. Local collector features will still work." >&2
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ "$TAILNET_SYNC_ENABLED" == "true" ]]; then
    install_syncthing_if_missing
    if command -v syncthing >/dev/null 2>&1; then
      SYNCTHING_BIN="$(command -v syncthing)"
      if "$SYNCTHING_BIN" --help 2>/dev/null | grep -q '^  serve '; then
        SYNCTHING_COMMAND="exec '$SYNCTHING_BIN' serve --no-browser --gui-address=127.0.0.1:8384"
      else
        SYNCTHING_COMMAND="exec '$SYNCTHING_BIN' -no-browser -gui-address=127.0.0.1:8384"
      fi
      SYNCTHING_PLIST="$HOME/Library/LaunchAgents/com.hivemindos.syncthing.plist"
      mkdir -p "$(dirname "$SYNCTHING_PLIST")"
      cat > "$SYNCTHING_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.hivemindos.syncthing</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-lc</string>
    <string>$SYNCTHING_COMMAND</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SYNCTHING_GUI_ADDRESS</key><string>127.0.0.1:8384</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/hivemindos-syncthing.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/hivemindos-syncthing.err.log</string>
</dict>
</plist>
PLIST
      launchctl_bounded 5 unload "$SYNCTHING_PLIST" >/dev/null 2>&1 || true
      launchctl_bounded 5 load "$SYNCTHING_PLIST"
      launchctl_bounded 5 kickstart -k "gui/$(id -u)/com.hivemindos.syncthing" >/dev/null 2>&1 || true
      echo "Installed Syncthing macOS LaunchAgent on 127.0.0.1:8384"
    else
      echo "Syncthing is unavailable; Tailnet shared memory sync is disabled." >&2
    fi
  fi

  PLIST="$HOME/Library/LaunchAgents/com.agent-control-room.telemetry.plist"
  mkdir -p "$(dirname "$PLIST")"
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.agent-control-room.telemetry</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$COLLECTOR</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AGENT_TELEMETRY_PORT</key><string>$PORT</string>
    <key>AGENT_TELEMETRY_HERMES_API_HOST</key><string>$HERMES_API_HOST</string>
    <key>AGENT_TELEMETRY_HERMES_API_PORT</key><string>$HERMES_API_PORT</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/agent-telemetry.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/agent-telemetry.err.log</string>
</dict>
</plist>
PLIST
  launchctl_bounded 5 unload "$PLIST" >/dev/null 2>&1 || true
  launchctl_bounded 5 load "$PLIST"
  launchctl_bounded 5 kickstart -k "gui/$(id -u)/com.agent-control-room.telemetry" >/dev/null 2>&1 || true
  echo "Installed macOS LaunchAgent on port $PORT"
  maybe_allow_node_through_macos_firewall
else
  if [[ "$TAILNET_SYNC_ENABLED" == "true" ]]; then
    install_syncthing_if_missing
    if command -v syncthing >/dev/null 2>&1; then
      chmod +x "$SYNCTHING_RUNNER" 2>/dev/null || true
      SYNCTHING_SERVICE="$HOME/.config/systemd/user/hivemindos-syncthing.service"
      mkdir -p "$(dirname "$SYNCTHING_SERVICE")"
      cat > "$SYNCTHING_SERVICE" <<SERVICE
[Unit]
Description=HivemindOS Syncthing folder sync

[Service]
Environment=SYNCTHING_GUI_ADDRESS=127.0.0.1:8384
ExecStart=$SYNCTHING_RUNNER
Restart=always

[Install]
WantedBy=default.target
SERVICE
      systemctl --user daemon-reload
      systemctl --user enable hivemindos-syncthing.service
      systemctl --user restart hivemindos-syncthing.service
      echo "Installed Syncthing systemd user service on 127.0.0.1:8384"
    else
      echo "Syncthing is unavailable; Tailnet shared memory sync is disabled." >&2
    fi
  fi

  stop_existing_listener
  SERVICE="$HOME/.config/systemd/user/agent-telemetry.service"
  mkdir -p "$(dirname "$SERVICE")"
  cat > "$SERVICE" <<SERVICE
[Unit]
Description=HivemindOS telemetry collector

[Service]
Environment=AGENT_TELEMETRY_PORT=$PORT
Environment=AGENT_TELEMETRY_HERMES_API_HOST=$HERMES_API_HOST
Environment=AGENT_TELEMETRY_HERMES_API_PORT=$HERMES_API_PORT
ExecStart=$(command -v node) $COLLECTOR
Restart=always

[Install]
WantedBy=default.target
SERVICE
  systemctl --user daemon-reload
  systemctl --user enable agent-telemetry.service
  systemctl --user restart agent-telemetry.service
  echo "Installed systemd user service on port $PORT"
fi

if [[ "$TAILNET_SYNC_ENABLED" == "true" ]]; then
  install_rsync_if_missing
  maybe_disable_tailscale_shields_up
  enable_tailscale_ssh
fi

if command -v tailscale >/dev/null 2>&1; then
  IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  if [[ -n "$IP" ]]; then
    echo "Collector URL: http://$IP:$PORT"
  fi
fi
echo "Local collector URL: http://127.0.0.1:$PORT"
if wait_for_local_collector 10; then
  echo "Local collector health: ok"
else
  echo "Local collector health did not respond yet. Check logs and retry: curl http://127.0.0.1:$PORT/health" >&2
fi
if [[ -n "${IP:-}" ]]; then
  echo "Tailnet reachability check from another dashboard machine:"
  echo "  curl --max-time 5 http://$IP:$PORT/health"
fi
