#!/usr/bin/env bash
# Compresses the dead "model thinking" stretch in docs/static/img/demo.gif
# after a fresh vhs render (which runs in real time, since it's waiting on
# an actual LLM response). Splits into three segments and only speeds up
# the middle one:
#   [0, CUT_START]   as recorded (typing the prompt)
#   [CUT_START, CUT_END]  4x sped up (verified pure spinner/counter dead
#                     time, no other content changes, safe to compress
#                     with a plain speed multiplier). Resampled to a real
#                     lower frame rate (not just shorter per-frame delays)
#                     — GIF delays are in centisecond units, and a first
#                     attempt that only shortened delays down to the 10ms
#                     floor did nothing in practice: many renderers clamp
#                     anything that short back up to a default (~100ms),
#                     since old encoders wrote 0 to mean "no delay set."
#                     Actually dropping frames sidesteps that entirely.
#   [CUT_END, end]    as recorded, untouched (the "Running shell command"
#                     transition through the fencepost prompt and
#                     resolution — the part that actually matters, so it's
#                     never touched by this script)
#
# CUT_START/CUT_END are tuned to this specific tape's timing. With
# --model haiku (current), dispatch starts by ~9s and the prompt is fully
# visible by ~10-11s, so CUT_END is tighter than the Sonnet-era value (13s)
# was. If demo/fencepost.tape's prompt text, waits, or model change
# materially, re-verify these against fresh frame extraction before reusing
# them — see the frame-review steps in the fencepost.tape history for how.
# A too-tight CUT_END risks cutting into the dispatch/prompt transition
# itself; when in doubt, err wider.
set -euo pipefail

GIF="/home/josh/git/fencepost/docs/static/img/demo.gif"
CUT_START=3
CUT_END=7

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# LD_LIBRARY_PATH is unset for both the nix-shell invocation and the command
# inside it: a stale alsa-lib path some other app left in the ambient
# environment shadows nix-shell's own glibc otherwise, crashing ffmpeg with
# GLIBC_ABI symbol-version errors.
env -u LD_LIBRARY_PATH nix-shell -p ffmpeg --run "env -u LD_LIBRARY_PATH ffmpeg -y -i '$GIF' -filter_complex \"
  [0:v]trim=0:$CUT_START,setpts=PTS-STARTPTS[a];
  [0:v]trim=$CUT_START:$CUT_END,setpts=(PTS-STARTPTS)/4,fps=10[b];
  [0:v]trim=$CUT_END,setpts=PTS-STARTPTS[c];
  [a][b][c]concat=n=3:v=1:a=0[outv];
  [outv]split[p1][p2];
  [p1]palettegen=stats_mode=diff[pal];
  [p2][pal]paletteuse=dither=bayer
\" -vsync vfr '$TMP/out.gif'"

mv "$TMP/out.gif" "$GIF"
echo "Sped up $GIF"
