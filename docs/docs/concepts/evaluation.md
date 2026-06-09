---
title: Evaluation & output
description: The evaluation pipeline and the hook output fencepost emits.
---

# Evaluation & output

This page covers the pipeline a tool call runs through, and the JSON fencepost writes back to Claude Code.

## The pipeline

```
stdin (hook JSON)
   │
   ▼
parse HookInput ──▶ redirect tool input ──▶ evaluate ──▶ format output ──▶ stdout
                          │                     │
                   (/tmp → /tmp/claude)   (decision model)
                                                │
                                          write audit log
```

1. **Parse** the `PreToolUse` hook JSON from stdin. It carries `tool_name`, `tool_input`, `cwd`, `session_id`, and `tool_use_id`.
2. **Redirect** — if the [sandbox](../configuration/sandbox.md) is enabled, rewrite `/tmp` paths to `/tmp/claude` *before* evaluation, so rules and the audit log see the path the tool will actually use.
3. **Evaluate** against the resolved config (see [the decision model](./decision-model.md)).
4. **Format** the result into hook output JSON.
5. **Log** the decision to the [audit trail](../reference/cli-and-audit.md) (fire-and-forget — a logging failure never blocks the decision).

The entry point is deliberately thin; all logic lives in dedicated modules.

## Hook input

Claude Code sends the hook this shape:

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "bun test", "description": "Run tests" },
  "tool_use_id": "toolu_01ABC123"
}
```

## Hook output

fencepost responds with `hookSpecificOutput`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow | deny | ask",
    "permissionDecisionReason": "explanation",
    "additionalContext": "extra context for Claude (optional)",
    "updatedInput": { "...": "rewritten tool input (optional)" }
  }
}
```

### Allow is the fast path

An allow with no rewrite produces **no output at all** — empty stdout means "allow". This keeps the common case cheap.

The one exception: an allow whose input was [redirected](../configuration/sandbox.md) must emit an explicit allow carrying `updatedInput`, otherwise the rewrite would be lost.

### Deny steers toward the alternative

Denials are crafted to make Claude *act*, not retry. The reason is prefixed `Fencepost:` for transparency and includes the alternative:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: blocked — Recursive delete is dangerous. Use this instead: delete specific files individually",
    "additionalContext": "The previous command was blocked by a fencepost permission rule. Do not retry the same command. Use the suggested alternative approach."
  }
}
```

The `additionalContext` reinforces "don't retry the same thing."

### Ask is factual

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Fencepost: 'git push origin main' requires approval."
  }
}
```

The user sees this and decides. fencepost keeps it factual rather than persuasive.

### Compound commands name the offender

When one part of a compound command (`a && b`) triggers the decision, the reason names the specific offending sub-command and nudges Claude to split it:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: blocked — compound command contains 'rm -rf /etc' which is not permitted (...). Run commands separately rather than chaining with &&.",
    "additionalContext": "Break compound commands into separate tool calls so each can be evaluated independently."
  }
}
```

This connects to [discourage chaining](../configuration/guidance-and-chaining.md): an *ask*-level chain is converted to a deny so each step can be approved on its own.

### Deny offers a manual-run escape hatch

A hard block doesn't have to be a flat wall. On a **Bash deny**, when `offerManualRun` is on (the default), fencepost appends an instruction to the deny's `additionalContext` telling Claude to:

1. lead with the rule reason / suggested alternative (the preferred path), then
2. offer the **verbatim original command** in a copyable code block, noting that *you* can run it yourself by typing it in the prompt prefixed with `!`.

`! <command>` runs as a **user** shell command, not a tool call, so it doesn't pass back through the `PreToolUse` hook — a genuine in-session escape hatch with no second terminal and no clipboard. The command offered is the **original** input (before any [`/tmp` redirect](../configuration/sandbox.md)), since that's what you intend to run.

```yaml
tools:
  bash:
    offerManualRun: true   # default true
```

Why text rather than the clipboard? A `PreToolUse` hook is a short-lived subprocess with no reliable clipboard channel (`pbcopy`/`xclip`/`wl-copy` may be missing over SSH, in containers, or in CI), and silently clobbering the clipboard is a surprising side effect for a security tool. Every Claude Code surface already renders a one-click copy button on fenced code blocks, so fencepost stays portable and side-effect-free.

The escape hatch is **omitted** for non-Bash denials (there's no `!` equivalent) and for the [fail-closed config-error deny](./failure-posture.md) (the fix there is to repair the config, not to bypass it).

:::note It is, by design, a bypass
The alternative is always presented first; the manual run is a secondary "if you still want the original" fallback. Reserve hard `deny` for things you never want the agent doing — and if you find yourself routing around a particular deny often, that rule probably wants to be `ask` instead. Set `offerManualRun: false` for a stricter posture, or for headless use where `!` isn't available.
:::

## Performance

fencepost runs on every tool call, so it's built to be fast: a small bundle and a thin pipeline. The bash AST adds ~75 ms only when a Bash command is evaluated; [nested interpreter](../configuration/interpreters.md) grammars load (~55 ms) only when inline code is actually detected. A plain `Read` or `ls` pays none of that.
