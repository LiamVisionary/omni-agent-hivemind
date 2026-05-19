#!/usr/bin/env bash
set -euo pipefail

GUI_ADDRESS="${SYNCTHING_GUI_ADDRESS:-127.0.0.1:8384}"
SYNCTHING_BIN="${SYNCTHING_BIN:-$(command -v syncthing || true)}"

if [[ -z "$SYNCTHING_BIN" ]]; then
  echo "syncthing is not installed" >&2
  exit 127
fi

if "$SYNCTHING_BIN" --help 2>/dev/null | grep -q '^  serve '; then
  exec "$SYNCTHING_BIN" serve --no-browser --gui-address="$GUI_ADDRESS"
fi

exec "$SYNCTHING_BIN" -no-browser -gui-address="$GUI_ADDRESS"
