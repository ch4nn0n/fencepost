#!/usr/bin/env bash
# Fencepost PreToolUse hook
# Reads JSON from stdin, evaluates against config, writes decision to stdout.
exec "$(dirname "$0")/../bin/fencepost" evaluate
