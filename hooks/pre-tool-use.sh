#!/usr/bin/env bash
# Fencepost PreToolUse hook
# Reads JSON from stdin, evaluates against config, writes decision to stdout.
HERE="$(dirname "$0")"
# Tell the binary where the bundled `import:` presets live (plugin-relative).
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
exec "$HERE/../bin/fencepost" evaluate
