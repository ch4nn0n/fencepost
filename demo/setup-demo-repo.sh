#!/usr/bin/env bash
# Builds a disposable git repo for demo/fencepost.tape to record against:
# a branch and stash entry to delete/drop, and a local-only "origin" (a bare
# repo, no network) in case a future tape variant pushes. Safe to re-run;
# wipes and rebuilds each time — always rerun this before re-recording, the
# fixture branch/stash only exist for one take.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="/tmp/claude/fencepost-demo"
REMOTE_DIR="/tmp/claude/fencepost-demo-remote.git"

rm -rf "$DEMO_DIR" "$REMOTE_DIR"
git init --quiet --bare "$REMOTE_DIR"

git init --quiet "$DEMO_DIR"
cd "$DEMO_DIR"
git config user.email "demo@fencepost.dev"
git config user.name "fencepost demo"
git remote add origin "$REMOTE_DIR"

mkdir -p .claude
cat > .claude/settings.json <<JSON
{
  "statusLine": {
    "type": "command",
    "command": "$HERE/statusline.sh"
  },
  "disableClaudeAiConnectors": true,
  "model": "haiku"
}
JSON

cat > .claude/fencepost.yaml <<'YAML'
import:
  - claude
  - git

default: ask
onError: ask

# Off so the demo compound command below resolves through the normal
# ask/allow filtering (only the flagged parts prompt) instead of being
# denied outright for chaining steps that need approval.
tools:
  bash:
    discourageChaining: false
YAML

# Harness: keeps the recorded chat prompt itself short (just the command),
# instead of a long inline "don't ask me / don't confirm" instruction typed
# on screen every take.
cat > CLAUDE.md <<'MD'
This is a fencepost demo repo. When asked to test a command, call the Bash
tool directly with the exact command given, as a single call (do not split
compound commands into separate calls, do not call any question or
confirmation tool, do not ask for confirmation yourself) — pass it straight
through so fencepost's hook is what decides.
MD

echo "# fencepost demo" > README.md
git add -A
git commit --quiet -m "init"
git push --quiet -u origin main

# Set up state for the compound-command demo (git add . && git branch -D
# old-feature && git stash drop): a branch to delete, a stash entry to
# drop, and an unstaged change for `git add .` to pick up. All three exist
# so approving the prompt actually succeeds instead of erroring.
git branch old-feature
echo "wip" >> README.md
git stash push --quiet -m "wip"
echo "unstaged change" >> README.md

echo "Demo repo ready at $DEMO_DIR"
