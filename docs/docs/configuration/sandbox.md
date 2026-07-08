---
title: The sandbox
description: Funnel Claude's temp files into /tmp/claude and scope destructive permissions to it.
---

# The sandbox

Claude scatters scratch and temporary files across `/tmp`. The sandbox funnels them into **one** directory — `/tmp/claude` — so you can grant **destructive permissions scoped to that directory** with confidence, while the rest of the filesystem stays gated.

Three mechanisms cooperate:

1. **Sandbox creation** — the `SessionStart` hook runs `mkdir -p /tmp/claude`.
2. **Guidance** — a [session-start line](./guidance-and-chaining.md) tells Claude to use the sandbox.
3. **Input redirection** — fencepost rewrites `/tmp` paths to the sandbox in tool inputs, and rules allow destructive ops confined to it.

## Redirection

When enabled, fencepost rewrites references to the system temp root in tool inputs:

| Input path | Rewritten to |
|------------|--------------|
| `/tmp/foo` | `/tmp/claude/foo` |
| `/tmp` (bare, at a boundary) | `/tmp/claude` |
| `/tmp/claude/foo` | unchanged (already in the sandbox) |
| `/var/tmp/x` | unchanged (not the system temp root) |
| `/tmpfile` | unchanged (not a `/tmp` path) |

It's a pragmatic string rewrite with a path-boundary lookbehind, not a full shell parser. The rewritten field depends on the tool:

| Tool | Field rewritten |
|------|-----------------|
| `Bash` | `command` |
| `Read` / `Write` / `Edit` | `file_path` |
| `NotebookEdit` | `notebook_path` |

### When it happens

Redirection runs **before** evaluation, so rules and the [audit log](../reference/cli-and-audit.md) see the path the tool will actually use:

```
tool_input → redirect → evaluate(rewritten) → format(result, updatedInput)
```

When the input changed, the decision JSON carries `updatedInput` so the tool runs against the sandbox path (applied on `allow`/`ask`; irrelevant on `deny`). On an *allow* with a rewrite, fencepost emits an explicit allow output instead of the empty-stdout fast path, so the rewrite isn't lost.

## Config

```yaml
redirect:
  tmp: true              # rewrite /tmp → tmpTarget (default false at the core level)
  tmpTarget: /tmp/claude # destination dir — must be directly under /tmp
```

`redirect` is block-level last-wins. The core default is **off**; the [`claude` preset](../presets.md#claude) turns it on. Only targets directly under `/tmp` are supported — any other target makes redirection a no-op.

## Scoped destructive permissions

The point of one sandbox dir is that you can safely allow destructive operations *inside it*. The recommended way is [structured `arguments` rules](./structured-bash-rules.md), which are correct for multi-target commands:

```yaml
tools:
  bash:
    arguments:
      # Allow rm only when EVERY path arg is under the sandbox.
      - { command: rm, allArgsInside: ["/tmp/claude"], decision: allow }
      # Otherwise ask before mutating outside it.
      - command: "rm|rmdir|mkdir|touch"
        anyArgOutside: ["/tmp/claude", "."]
        decision: ask
    redirects:
      # Never redirect output outside the sandbox/project.
      - mode: write
        outside: ["/tmp/claude", "."]
        decision: deny
        description: "Writing outside the sandbox can clobber files."
```

`rm -rf /tmp/claude/build` is allowed; `rm -rf /tmp/claude/build /etc` is **not** (one argument escapes), so it falls through to `ask`/`default`.

:::note allowChecks alternative
An older approach uses a `$`-anchored [`allowChecks`](./bash-rules.md#allowchecks--smart-allow-scoped-exceptions) regex. It only confines a *single* target, so two-path commands (`cp`, `mv`) are intentionally excluded. Prefer the structured `arguments` rules above; the `claude` preset has migrated to them.
:::

## Limitations

- Redirection is **string-based**. An unusual command that embeds `/tmp` in a non-path context could be rewritten. Disable with `redirect: { tmp: false }` if that bites.
- Scoped allows sit **below** `deny`/`checks` in precedence. If another preset adds a recursive-delete *deny check*, it shadows the sandbox allow. Scope such checks to exclude `/tmp/claude` if you want both.
