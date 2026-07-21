#!/usr/bin/env bash
# One-shot: rebuilds the demo repo fixture and records docs/static/img/demo.gif.
# Requires nix (fetches vhs via `nix-shell -p vhs`).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$HERE/setup-demo-repo.sh"

# A stale LD_LIBRARY_PATH (e.g. an alsa-lib path some other app left in the
# ambient environment) crashes vhs's bundled ffmpeg with GLIBC_ABI
# symbol-version errors — same fix as speed-up-wait.sh.
env -u LD_LIBRARY_PATH nix-shell -p vhs --run "env -u LD_LIBRARY_PATH vhs '$HERE/fencepost.tape'"

echo "Recorded docs/static/img/demo.gif (optionally run demo/speed-up-wait.sh next to compress the dead wait)."
