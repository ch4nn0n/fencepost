---
title: CLI & audit
description: The fencepost subcommands, the audit log, and the /audit skill.
---

# CLI & audit

The fencepost bundle is both the hook engine and a small CLI for inspecting config and tuning rules. Invoke it with your runtime — `node dist/index.js <subcommand>` (or `bun`). The examples below use `fencepost` as shorthand for that.

## Subcommands

```bash
# Hook mode (default) — reads stdin, writes the decision to stdout.
node dist/index.js evaluate

# SessionStart mode — reads stdin, writes guidance context.
node dist/index.js sessionstart

# Print the resolved config: sources, errors, warnings, effective JSON.
node dist/index.js config

# Same report, but exit non-zero if there are errors. For CI / pre-commit.
node dist/index.js verify

# Read the audit log and print an analysis.
node dist/index.js audit [--path .claude/fencepost/logs/audit.jsonl]
```

`evaluate` and `sessionstart` are what the plugin hooks call. `config`, `verify`, and `audit` are for you.

### `verify` in CI

Because a [broken config fails closed](../concepts/failure-posture.md), catching mistakes *before* they ship is worth automating:

```yaml title=".github/workflows/ci.yml (excerpt)"
- run: node dist/index.js verify
```

It exits non-zero on any error (invalid `default`/`onError`, YAML syntax error, non-mapping top level) and prints the effective config so reviewers can see what's enforced.

## The audit log

fencepost appends a JSONL entry for **every** evaluation — allows included — to:

```
.claude/fencepost/logs/audit.jsonl
```

Writing is **fire-and-forget**: if it fails (permissions, disk full), the error is swallowed so the permission decision is never blocked or delayed.

Each entry:

```json
{
  "ts": "2026-04-14T21:30:00.000Z",
  "sid": "sess-1",
  "tool": "Bash",
  "input": "kubectl -n prod delete pod foo",
  "normalised": "kubectl delete pod foo",
  "decision": "ask",
  "reason": "Command requires approval: kubectl delete",
  "rule": "bash.ask: kubectl delete",
  "tid": "toolu_01"
}
```

- `normalised` appears only for Bash, and only when [normalisation](../configuration/bash-rules.md#normalise--strip-noise-first) changed the command.
- For non-Bash tools, `input` is a truncated summary of `tool_input`.
- `rule` records which config path matched — the basis for dead-rule detection.

:::note Unbounded for now
The log grows without rotation in v1. If it gets large, truncate or rotate it yourself; size/time-based rotation is future work.
:::

## The `/audit` skill

The plugin registers a Claude Code slash command, **`/audit`**, that reads the log and produces a markdown analysis with concrete config suggestions. Invoke it in a session, or run the underlying tool directly with `fencepost audit`.

It reports:

### 1. Effective config (with provenance)

The fully merged config, showing which file (or preset) each rule came from — so you can see exactly what's active and where it's defined.

### 2. Decision frequency

Grouped by tool and decision:

| Tool | Allow | Ask | Deny | Total |
|------|-------|-----|------|-------|
| Bash | 142 | 23 | 7 | 172 |
| Read | 89 | 0 | 0 | 89 |
| mcp\_\_slack\_\* | 0 | 12 | 0 | 12 |

### 3. Promotion candidates (ask → allow)

Commands or tools you keep approving are surfaced as candidates to promote:

```
Suggestion: Move `git push` from bash.ask to bash.allow
  - Asked 23 times across 8 sessions
  - Never denied by the user
```

### 4. Bash command breakdown

The most frequent normalised commands and how they were decided.

### 5. Dead rules

Rules that never matched any call — likely stale:

```
Warning: These rules have never matched:
  - bash.deny: "git push --force"  (0 matches)
  - tools.deny: "mcp__dangerous_*" (0 matches)
```

### 6. Suggested YAML

Copy-paste-ready snippets:

```yaml
# Suggested additions to bash.allow:
allow:
  - bun test     # asked 28 times, always approved
  - git fetch    # asked 15 times, always approved
```

The loop is: run a while, `/audit`, promote the safe asks, prune the dead rules, tighten anything noisy — and repeat.
