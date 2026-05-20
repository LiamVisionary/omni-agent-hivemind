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
  if tailscale set --ssh=true >/dev/null 2>&1 || tailscale set --ssh >/dev/null 2>&1; then
    echo "Tailscale SSH advertised by this machine"
  elif command -v sudo >/dev/null 2>&1 && (sudo -n tailscale set --ssh=true >/dev/null 2>&1 || sudo -n tailscale set --ssh >/dev/null 2>&1); then
    echo "Tailscale SSH advertised by this machine"
  else
    echo "Could not advertise Tailscale SSH automatically; run on this machine: sudo tailscale set --ssh" >&2
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
      SYNCTHING_PLIST="$HOME/Library/LaunchAgents/com.omni-agent-hivemind.syncthing.plist"
      mkdir -p "$(dirname "$SYNCTHING_PLIST")"
      cat > "$SYNCTHING_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.omni-agent-hivemind.syncthing</string>
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
  <key>StandardOutPath</key><string>$HOME/Library/Logs/omni-agent-hivemind-syncthing.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/omni-agent-hivemind-syncthing.err.log</string>
</dict>
</plist>
PLIST
      launchctl_bounded 5 unload "$SYNCTHING_PLIST" >/dev/null 2>&1 || true
      launchctl_bounded 5 load "$SYNCTHING_PLIST"
      launchctl_bounded 5 kickstart -k "gui/$(id -u)/com.omni-agent-hivemind.syncthing" >/dev/null 2>&1 || true
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
else
  if [[ "$TAILNET_SYNC_ENABLED" == "true" ]]; then
    install_syncthing_if_missing
    if command -v syncthing >/dev/null 2>&1; then
      chmod +x "$SYNCTHING_RUNNER" 2>/dev/null || true
      SYNCTHING_SERVICE="$HOME/.config/systemd/user/omni-agent-hivemind-syncthing.service"
      mkdir -p "$(dirname "$SYNCTHING_SERVICE")"
      cat > "$SYNCTHING_SERVICE" <<SERVICE
[Unit]
Description=Omni-Agent Hivemind Syncthing folder sync

[Service]
Environment=SYNCTHING_GUI_ADDRESS=127.0.0.1:8384
ExecStart=$SYNCTHING_RUNNER
Restart=always

[Install]
WantedBy=default.target
SERVICE
      systemctl --user daemon-reload
      systemctl --user enable omni-agent-hivemind-syncthing.service
      systemctl --user restart omni-agent-hivemind-syncthing.service
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
Description=Agent Control Room telemetry collector

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
  enable_tailscale_ssh
fi

if command -v tailscale >/dev/null 2>&1; then
  IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  if [[ -n "$IP" ]]; then
    echo "Collector URL: http://$IP:$PORT"
  fi
fi
echo "Local collector URL: http://127.0.0.1:$PORT"
