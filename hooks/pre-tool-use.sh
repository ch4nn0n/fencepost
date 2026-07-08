#!/usr/bin/env bash
# Fencepost PreToolUse hook
# Reads JSON from stdin, evaluates against config, writes decision to stdout.
HERE="$(cd "$(dirname "$0")" && pwd)"
# Tell fencepost where the bundled `import:` presets live (plugin-relative).
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"

# Run the committed JS bundle with whatever runtime is available.
RUNNER="$(command -v node || command -v bun || true)"
if [ -z "$RUNNER" ]; then
  echo "fencepost: no 'node' or 'bun' runtime found on PATH; skipping check" >&2
  exit 0 # fail open: never block Claude Code just because we can't run
fi
exec "$RUNNER" "$HERE/../dist/index.js" evaluate
