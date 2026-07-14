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
parse HookInput ──▶ compile config ──▶ redirect tool input ──▶ evaluate ──▶ secrets scan ──▶ format output ──▶ stdout
                         │                    │                    │              │
                  (broken config       (/tmp → /tmp/claude)  (decision      (can override a
                   denies everything)                          model)        non-deny to deny)
                                                                   │
                                                             write audit log
```

1. **Parse** the `PreToolUse` hook JSON from stdin. It carries `tool_name`, `tool_input`, `cwd`, `session_id`, and `tool_use_id`.
2. **Compile the config** for the call's `cwd`. If a config file is present but invalid, fencepost stops here and **fails closed**: every tool call is denied until the config is fixed (see [failure posture](./failure-posture.md)).
3. **Redirect** — if the [sandbox](../configuration/sandbox.md) is enabled, rewrite `/tmp` paths to `/tmp/claude` *before* evaluation, so rules and the audit log see the path the tool will actually use.
4. **Evaluate** against the resolved config (see [the decision model](./decision-model.md)).
5. **Scan for secrets** — if [secrets protection](../configuration/secrets.md) is enabled and the rules didn't already deny, the tool input is scanned; a hit overrides the result to **deny**.
6. **Format** the result into hook output JSON.
7. **Log** the decision to the [audit trail](../reference/cli-and-audit.md) (fire-and-forget — a logging failure never blocks the decision).

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

### Allow is explicit too

Every decision is written to stdout, including allow. Empty stdout would mean "no decision" to Claude Code and fall through to its native permission prompt; an explicit allow suppresses that prompt, so a call fencepost allows runs without double-gating.

An allow whose input was [redirected](../configuration/sandbox.md) additionally carries `updatedInput`, so the tool runs against the rewritten path.

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

### Compound commands nudge toward splitting

When one part of a compound command (`a && b`) triggers a deny, the reason itself stays generic (the matched rule's reason); the split-it-up nudge lives in `additionalContext`. Here is the genuine output for `ls && rm -rf /etc` under a config that denies `rm -rf`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: blocked — Command denied by rule",
    "additionalContext": "The previous command was blocked by a fencepost permission rule. Do not retry the same command. Break compound commands into separate tool calls so each can be evaluated independently. If the user still wants to run the original command, they can run it themselves outside fencepost by typing it in the prompt prefixed with '!' (a user-run command does not pass through fencepost). Offer it to them in a copyable code block, exactly: ls && rm -rf /etc"
  }
}
```

The rule that fired is recorded in the [audit log](../reference/cli-and-audit.md) (`"rule": "bash.deny: rm -rf"`), not in the reason. (An *ask* reason does quote the matched command: `Fencepost: 'git push origin main' requires approval.`)

This connects to [discourage chaining](../configuration/guidance-and-chaining.md): an *ask*-level chain is converted to a deny so each step can be approved on its own. That chained deny uses a fixed reason: `Fencepost: this chained command needs approval — run each step (split on && / ; / ||) as a separate command so it can be reviewed individually.`

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
