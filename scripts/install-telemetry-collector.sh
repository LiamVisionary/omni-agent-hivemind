#!/usr/bin/env bash
set -euo pipefail

PORT="${AGENT_TELEMETRY_PORT:-8787}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COLLECTOR="$APP_DIR/scripts/agent-telemetry-collector.mjs"
NODE_BIN="$(command -v node)"

if [[ ! -f "$COLLECTOR" ]]; then
  echo "Missing collector: $COLLECTOR" >&2
  exit 1
fi

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

if command -v tailscale >/dev/null 2>&1; then
  IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  if [[ -n "$IP" ]]; then
    echo "Collector URL: http://$IP:$PORT"
  fi
fi
