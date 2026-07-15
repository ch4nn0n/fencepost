---
title: CLI & audit
description: The fencepost subcommands, the audit log, and the bundled skills.
---

# CLI & audit

The fencepost bundle is both the hook engine and a small CLI for inspecting config and tuning rules. Invoke it with your runtime — `node dist/index.js <subcommand>` (or `bun`). The examples below use `fencepost` as shorthand for that.

## Subcommands

```bash
# Hook mode (default) — reads stdin, writes the decision to stdout.
node dist/index.js evaluate

# PostToolUse mode: reads stdin, redacts secrets from tool output.
node dist/index.js posttooluse

# SessionStart mode — reads stdin, writes guidance context.
node dist/index.js sessionstart

# Print the resolved config: sources, errors, warnings, effective JSON.
node dist/index.js config

# Same report, but exit non-zero if there are errors. For CI / pre-commit.
node dist/index.js verify

# Read the user-level audit log (~/.claude/fencepost/logs/audit.jsonl),
# filter to the current project, and print an analysis.
node dist/index.js audit

# Same, but analyse entries from every project in the log.
node dist/index.js audit --global
```

Any subcommand also accepts `--verbose`, which turns on debug logging.

`evaluate`, `posttooluse`, and `sessionstart` are what the plugin hooks call (`posttooluse` is wired to the plugin's PostToolUse hook via `hooks/post-tool-use.sh`). `config`, `verify`, and `audit` are for you.

### `verify` in CI

Because a [broken config fails closed](../concepts/failure-posture.md), catching mistakes *before* they ship is worth automating:

```yaml title=".github/workflows/ci.yml (excerpt)"
- run: node dist/index.js verify
```

It exits non-zero on any error (invalid `default`/`onError`, YAML syntax error, non-mapping top level) and prints the effective config so reviewers can see what's enforced.

## The audit log

fencepost appends a JSONL entry for **every** evaluation — allows included — to a single, **user-level** log:

```
~/.claude/fencepost/logs/audit.jsonl
```

Every project writes here; each entry carries a `cwd` field so it can be attributed back to the project it ran in. `FENCEPOST_HOME` overrides the home directory (used by tests). `fencepost audit` filters to the current project by default; `fencepost audit --global` analyses all projects at once.

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
  "reason": "Command requires approval",
  "rule": "bash.ask: kubectl delete",
  "tid": "toolu_01",
  "cwd": "/home/you/git/myproject"
}
```

- `cwd` is the project directory the call ran in — the basis for per-project filtering in `fencepost audit`.
- `normalised` appears only for Bash, and only when [normalisation](../configuration/bash-rules.md#normalise--strip-noise-first) changed the command.
- For non-Bash tools, `input` is a truncated summary of `tool_input`.
- When a **secrets** rule matched, `input` is a paths-only JSON (`file_path` / `notebook_path`), never the command or content (which contain the secret by definition), and `normalised` is suppressed.
- `rule` records which config path matched — the basis for dead-rule detection.
- `secrets` (optional, `{scanner, rules, count}`) is written on PostToolUse redactions: scanner name, matched rule ids, and redaction count, never the values.

:::note Unbounded for now
The log grows without rotation in v1. If it gets large, truncate or rotate it yourself; size/time-based rotation is future work.
:::

## The `/audit` skill

The plugin registers a Claude Code slash command, **`/audit`**, that reads the log and produces a markdown analysis with concrete config suggestions. Invoke it in a session, or run the underlying tool directly with `fencepost audit` (add `--global` to analyse every project rather than just the current one).

It reports:

### 1. Effective config

The list of source files (configs and presets) that were merged, followed by a summary of the merged rules: the `default` decision, then each non-empty rule list.

### 2. Decision frequency

Grouped by tool and decision:

| Tool | Allow | Ask | Deny | Total |
|------|-------|-----|------|-------|
| Bash | 142 | 23 | 7 | 172 |
| Read | 89 | 0 | 0 | 89 |
| mcp\_\_slack\_\* | 0 | 12 | 0 | 12 |

### 3. Promotion candidates (ask → allow)

Commands or tools you keep approving (at least 5 asks) are surfaced as candidates to promote:

```
- **Add `git push` to bash.allow**
  - Asked 23 times across 8 sessions
```

### 4. Bash command breakdown

The most frequent normalised commands and how they were decided.

### 5. Dead rules

Rules that never matched any call — likely stale. Deny, ask, and allow rules are all checked:

```
## Dead Rules

These rules have never matched any tool call in the audit log:

- `bash.deny: git push --force`
- `tools.deny: mcp__dangerous_*`
```

### 6. Suggested YAML

Copy-paste-ready snippets:

```yaml
# Suggested additions to bash.allow:
bash:
  allow:
    - bun test  # asked 28 times
    - git fetch  # asked 15 times
```

The loop is: run a while, `/audit`, promote the safe asks, prune the dead rules, tighten anything noisy — and repeat.

## The `/preset` and `/contribute-preset` skills

Two more slash commands ship with the plugin, for tools that have no bundled preset yet:

- **`/preset <tool>`** builds rules for a CLI tool or MCP server by reading its **real** command surface — enumerating subcommands from the installed binary's `--help` (or the connected MCP server's live tool list) rather than guessing from memory, since subcommands vary by version. It proposes an allow / ask / deny classification for your review, merges the result into your own `.claude/fencepost.yaml`, and validates it with `fencepost verify` plus per-tier `evaluate` spot-checks. It never sets `default`.
- **`/contribute-preset <name>`** packages a rule set as a bundled preset and opens a pull request to the fencepost repository: it writes `presets/<name>.yaml`, updates the docs, runs the checks from `CONTRIBUTING.md`, and creates the PR with `gh`.

See [Presets → generating rules for a new tool](../presets.md#generating-rules-for-a-new-tool).
