# Records docs/static/img/demo.gif: a live Claude Code session where a
# compound Bash command mixes an allowed step with two steps that need
# approval, and fencepost's "ask" prompt lists only the flagged parts
# (src/bash/evaluate-ast.ts askParts()/matchedInputs) — the allowed `git add
# .` step is silently dropped from the list, only the two `ask`-rule matches
# (`git branch -D`, `git stash drop`) are shown.
#
# Uses the real installed fencepost@fencepost plugin (no --plugin-dir), so
# this records exactly what an actual user sees. --plugin-dir against a
# local clone is a trap: it runs the committed dist/ bundle, which silently
# goes stale relative to src/ until `bun run build` is rerun, with no error
# to signal it.
#
# The demo repo's .claude/settings.json (setup-demo-repo.sh) sets:
# - disableClaudeAiConnectors: true, so a personal Gmail/Calendar/etc.
#   claude.ai connector configured on the recording machine doesn't show up
#   as a "N MCP servers need authentication" banner. That setting is scoped
#   to claude.ai connectors specifically — it won't suppress an MCP server
#   added the classic way (claude mcp add, user or project scope); those
#   would need --strict-mcp-config on the CLI instead, which has no
#   settings.json equivalent.
# - model: haiku, so the claude launch below doesn't need --model. Haiku
#   dispatches the tool call and renders fencepost's prompt noticeably
#   faster than Sonnet (observed visible by ~11-13s vs Sonnet's ~15-20s).
#
# Prereqs (not run by this tape): `bash demo/record.sh` (or `bun run
# demo:record`) runs steps 1-2 below for you.
#   1. bash demo/setup-demo-repo.sh   (builds a disposable local-only repo)
#   2. vhs demo/fencepost.tape
#   3. bash demo/speed-up-wait.sh     (optional, not run by record.sh:
#      compresses the real-time "model thinking" wait — see that script for
#      why it's a targeted, verified time-cut rather than blind
#      content-based frame-dropping)

Output docs/static/img/demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set TypingSpeed 40ms
Set Padding 20

Hide
# Unset so this claude process doesn't inherit IDE/session identifiers from
# whatever is recording it (a VS Code terminal, or literally a parent Claude
# Code session — CLAUDE_CODE_SSE_PORT in particular is what makes a nested
# claude try and fail an IDE handshake, shown as a distracting "Visual
# Studio Code disconnected" toast).
Type "unset TERM_PROGRAM VSCODE_PID VSCODE_CWD VSCODE_GIT_ASKPASS_NODE VSCODE_GIT_ASKPASS_MAIN VSCODE_GIT_ASKPASS_EXTRA_ARGS VSCODE_GIT_IPC_HANDLE CLAUDE_CODE_SSE_PORT CLAUDE_CODE_CHILD_SESSION CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_EXECPATH CLAUDE_CODE_SESSION_ID; cd /tmp/claude/fencepost-demo && clear"
Enter
Sleep 500ms
Show

Type "claude --permission-mode bypassPermissions"
Enter
Sleep 2s

# First launch in a directory Claude Code hasn't seen: it shows a one-time
# "trust this folder?" dialog before anything else. "1. Yes, I trust this
# folder" is the highlighted default, so Enter accepts it. Once accepted for
# this path it's remembered (recorded in ~/.claude.json), so on a later
# re-render this Enter lands on the empty chat prompt instead and is a no-op.
Enter
Sleep 1s

# Clears the startup banner (org name/email, "What's new") off the visible
# screen before the recording continues, so neither appears in the gif.
Ctrl+L
Sleep 500ms

# The "don't ask / don't split it up" steering lives in the demo repo's
# CLAUDE.md (see setup-demo-repo.sh) instead of being typed inline here, so
# the on-screen prompt is just the command being tested.
Type "Test this: git add . && git branch -D old-feature && git stash drop"
Enter

# fencepost returns "ask" -> Claude Code's native permission prompt renders
# here, listing only the git branch -D and git stash drop parts (the git add
# . part is allowed and silently omitted). A shorter Sleep here (16s) was
# tried and broke: the accept-Enter apparently lands during the
# dispatch/render transition rather than cleanly after it, and the prompt
# never holds visibly on screen (confirmed missing across sampled frames,
# despite the fencepost audit log still showing a correct "ask" decision
# underneath). Keeping the same generous wait that's proven reliable rather
# than chasing a tighter one — the real compression happens in
# speed-up-wait.sh instead, which is safe because it only touches verified
# dead time.
Sleep 28s
Enter
Sleep 5s
