---
title: The decision model
description: How fencepost resolves a tool call into allow, ask, or deny.
---

# The decision model

Every tool call resolves to exactly one decision: **allow**, **ask**, or **deny**. How fencepost gets there depends on whether the tool is `Bash` or anything else.

## The three decisions

| Decision | Effect | Reason shown to |
|----------|--------|-----------------|
| **allow** | Tool runs. An explicit allow is emitted, suppressing Claude Code's native prompt. | — |
| **ask** | Claude Code prompts the user to approve. | The user |
| **deny** | Tool is blocked. | Claude (so it can adapt) |

The "shown to" column matters. On a **deny**, the reason is delivered *to Claude*, not the user — which is how fencepost steers Claude toward the alternative instead of leaving it to retry. On an **ask**, the reason is shown to *you*, as context for your approval. See [Evaluation & output](./evaluation.md) for the exact phrasing.

## Non-Bash tools: glob tiers

For any tool that isn't `Bash`, fencepost matches the tool **name** against your glob lists in tier order:

```
deny  >  ask  >  allow  >  default
```

1. **`tools.deny`** — if any `tool` glob matches, deny (with its `description`/`alternative`).
2. **`tools.ask`** — if any glob matches, ask.
3. **`tools.allow`** — if any glob matches, allow.
4. Otherwise, return `default`.

The most restrictive matching tier wins. There's no specificity ranking within a tier — first match wins. Globs support `*` (any characters) and `?` (single character), e.g. `mcp__plugin_slack_*`.

See **[Tool rules](../configuration/tool-rules.md)** for details.

## Bash: parsed, then tiered

`Bash` is special. It is **never** matched by the tool-name path — even if you list `Bash` in `tools.allow`, fencepost ignores that and always routes the command through the bash pipeline. This prevents accidentally waving every command through.

The command is parsed into an AST (tree-sitter), normalised, split into its simple commands, and each is evaluated against a richer set of tiers:

```
deny  >  allow-checks  >  ask  >  allow  >  default
```

| Tier | Sources (first match wins) |
|------|----------------------------|
| **1 · deny** | `bash.deny` (prefix), `bash.checks` (regex), `arguments`(deny), `redirects`(deny), nested-interpreter denies |
| **2 · allow-checks** | `bash.allowChecks` (regex), `arguments`(allow), `redirects`(allow), nested-interpreter allows (honoured only if no nested ask fired) — *scoped exceptions* |
| **3 · ask** | `bash.ask` (prefix), `arguments`(ask), `redirects`(ask), interpreter asks |
| **4 · allow** | `bash.allow` (prefix) |
| **5 · default** | `config.default` |

The key invariant:

:::tip Deny always beats allow
Tier 1 runs before tier 2, so a **smart-allow can never override a deny**. You cannot "allow" your way past a block. But a scoped allow (e.g. "every argument is inside the sandbox") *does* beat a broad `ask`.
:::

Across the simple commands of a compound command (`a && b`, `a | b`), the **most restrictive** decision wins.

## Worked example

```yaml
tools:
  bash:
    allow:
      - git branch          # allow listing branches
    deny:
      - git branch -D       # but never force-delete
```

- `git branch` → matches `allow` → **allow**
- `git branch -D feature` → matches `deny` (tier 1, evaluated first) → **deny**

The `allow` on `git branch` does *not* shield `git branch -D`, because deny is a higher tier and prefix matching respects word boundaries (`git branch -D` is a distinct prefix). See [Bash rules → prefix matching](../configuration/bash-rules.md#prefix-matching).

## Next

- **[Evaluation & output](./evaluation.md)** — the pipeline and the exact JSON fencepost emits.
- **[Failure posture](./failure-posture.md)** — what happens when something breaks.
