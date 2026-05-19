#!/usr/bin/env bash
set -euo pipefail

PORT="${AGENT_TELEMETRY_PORT:-8787}"
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

if [[ "$(uname -s)" == "Darwin" ]]; then
  install_syncthing_if_missing
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
  launchctl unload "$SYNCTHING_PLIST" >/dev/null 2>&1 || true
  launchctl load "$SYNCTHING_PLIST"
  launchctl kickstart -k "gui/$(id -u)/com.omni-agent-hivemind.syncthing" >/dev/null 2>&1 || true
  echo "Installed Syncthing macOS LaunchAgent on 127.0.0.1:8384"

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
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/agent-telemetry.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/agent-telemetry.err.log</string>
</dict>
</plist>
PLIST
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load "$PLIST"
  launchctl kickstart -k "gui/$(id -u)/com.agent-control-room.telemetry" >/dev/null 2>&1 || true
  echo "Installed macOS LaunchAgent on port $PORT"
else
  install_syncthing_if_missing
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

  stop_existing_listener
  SERVICE="$HOME/.config/systemd/user/agent-telemetry.service"
  mkdir -p "$(dirname "$SERVICE")"
  cat > "$SERVICE" <<SERVICE
[Unit]
Description=Agent Control Room telemetry collector

[Service]
Environment=AGENT_TELEMETRY_PORT=$PORT
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

install_rsync_if_missing
enable_tailscale_ssh

if command -v tailscale >/dev/null 2>&1; then
  IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  if [[ -n "$IP" ]]; then
    echo "Collector URL: http://$IP:$PORT"
  fi
fi
