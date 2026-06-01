#!/usr/bin/env bash
# Fencepost SessionStart hook
# Emits guidance context for the session and prepares the temp sandbox dir.
HERE="$(dirname "$0")"
# Tell the binary where the bundled `import:` presets live (plugin-relative).
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
# Ensure the scratch sandbox exists (see feature-15-claude-files.md). Best-effort.
mkdir -p /tmp/claude 2>/dev/null || true
exec "$HERE/../bin/fencepost" sessionstart
