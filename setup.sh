#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5020}"
COLLECTOR_PORT="${AGENT_TELEMETRY_PORT:-8787}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok() { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m!\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m✗\033[0m %s\n" "$*"; }

missing=()

cd "$ROOT"

info "Agent Control Room setup"

if command -v node >/dev/null 2>&1; then
  ok "Node found: $(node --version)"
else
  missing+=("Node.js 20+")
  fail "Node is missing"
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm found: $(pnpm --version)"
elif command -v corepack >/dev/null 2>&1; then
  info "pnpm not found; enabling pnpm through corepack"
  corepack enable
  corepack prepare pnpm@latest --activate
  ok "pnpm enabled: $(pnpm --version)"
else
  missing+=("pnpm or corepack")
  fail "pnpm is missing"
fi

tailscale_ip=""
if command -v tailscale >/dev/null 2>&1; then
  if tailscale status >/dev/null 2>&1; then
    ok "Tailscale is running"
    tailscale_ip="$(tailscale ip -4 2>/dev/null | head -1 || true)"
  else
    warn "Tailscale is installed but not connected"
    missing+=("Run: tailscale up")
  fi
else
  warn "Tailscale is not installed"
  missing+=("Install Tailscale and log in")
fi

if (( ${#missing[@]} > 0 )); then
  echo
  warn "Setup needs a couple things first:"
  for item in "${missing[@]}"; do
    echo "  - $item"
  done
  echo
  echo "After fixing those, rerun:"
  echo "  ./setup.sh"
  exit 1
fi

info "Installing app dependencies"
pnpm install --frozen-lockfile
ok "Dependencies installed"

info "Installing local telemetry collector"
AGENT_TELEMETRY_PORT="$COLLECTOR_PORT" ./scripts/install-telemetry-collector.sh
ok "Collector installed"

info "Building dashboard"
pnpm build
ok "Dashboard built"

if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  warn "Port $PORT is already in use; leaving the existing process alone"
else
  info "Starting dashboard on port $PORT"
  nohup pnpm start > "$ROOT/.next/agent-control-room.log" 2>&1 &
  sleep 2
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
  echo "  http://<tailscale-ip>:$COLLECTOR_PORT"
fi
echo
echo "On other Tailscale machines that run agents, clone the repo and run only:"
echo "  ./scripts/install-telemetry-collector.sh"
echo
echo "The dashboard will discover collectors automatically."
