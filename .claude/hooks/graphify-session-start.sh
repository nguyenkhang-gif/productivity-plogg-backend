#!/usr/bin/env bash
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

if ! command -v graphify >/dev/null 2>&1; then
  if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && command -v uv >/dev/null 2>&1; then
    uv tool install --quiet "graphifyy[sql,mcp]" >/dev/null 2>&1 || exit 0
    export PATH="$HOME/.local/bin:$PATH"
  else
    echo "graphify not installed; run: pip install 'graphifyy[sql,mcp]' to enable the code graph." >&2
    exit 0
  fi
fi

if [ -f graphify-out/graph.json ]; then
  graphify update . >/dev/null 2>&1 || true
else
  graphify extract . --code-only >/dev/null 2>&1 && graphify cluster-only . --no-label --no-viz >/dev/null 2>&1 || true
fi

exit 0
