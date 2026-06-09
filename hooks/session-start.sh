#!/usr/bin/env bash
# Fencepost SessionStart hook
# Emits guidance context for the session and prepares the temp sandbox dir.
HERE="$(cd "$(dirname "$0")" && pwd)"
# Tell fencepost where the bundled `import:` presets live (plugin-relative).
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
# Ensure the scratch sandbox exists (see The sandbox docs). Best-effort.
mkdir -p /tmp/claude 2>/dev/null || true

RUNNER="$(command -v node || command -v bun || true)"
if [ -z "$RUNNER" ]; then
  echo "fencepost: no 'node' or 'bun' runtime found on PATH; skipping guidance" >&2
  exit 0
fi
exec "$RUNNER" "$HERE/../dist/index.js" sessionstart
