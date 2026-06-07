---
title: Failure posture
description: How fencepost behaves when a command can't be checked or the config is broken.
---

# Failure posture

A permission gate has to decide what happens when *it* can't do its job. fencepost distinguishes two kinds of failure and treats them **oppositely**.

| Failure | Posture | Why |
|---------|---------|-----|
| Can't reach a decision for a *command* (unparseable, or an unexpected error) | **`onError`** — default **`ask`** | A human is usually present; asking is safe and non-blocking. |
| The *config itself* is present but invalid | **Fail closed (deny)** | Better for a human to notice and fix than to run unguarded. |
| No config at all | Defaults (`default: ask`) | Absence is normal, not an error. |

## `onError`: when a command can't be checked

```yaml
onError: ask   # allow | ask | deny  (default: ask)
```

This fires when fencepost genuinely cannot evaluate a command — the bash parser can't extract it, or an unexpected exception is thrown mid-evaluation.

- **`ask`** (default) — optimised for interactive use. When fencepost can't check something, *you* decide.
- **`allow`** — for headless/CI runs where no one can answer a prompt, so an un-checkable command doesn't block the pipeline.
- **`deny`** — the strict option: un-checkable means blocked.

:::note The one silent allow
If stdin isn't valid hook JSON at all, there's no tool, command, or `cwd` to gate or even to read config from — so there's nothing meaningful to ask about. That single case exits 0 (allow). Everything *identifiable* goes through `onError`.
:::

## Fail closed on a broken config

A config file that is *present* but won't parse or is structurally invalid makes fencepost **deny every tool call** until it's fixed. This is deliberately the opposite of `onError`: a broken security config is exactly when you want a human in the loop, not silent degradation.

| Severity | Examples | Effect |
|----------|----------|--------|
| **Fatal** (fail closed) | YAML syntax error; top-level isn't a mapping; invalid `default`/`onError` value | Deny everything |
| **Non-fatal** (warn, skip rule) | One bad rule — invalid regex, missing field | Skip that rule; the rest applies |
| **Not an error** | No config file present | Built-in defaults |

The denial carries the offending file and reason, and the `SessionStart` hook **prepends a loud warning** so you see the problem immediately rather than only on the next blocked call.

:::warning Deadlock by design
While failing closed, *every* tool is denied — including `Read` and `Write`. That means Claude can't edit the config to fix it for you; a human edits the file directly. That's the intended "intercept": a broken gate stops work rather than waving it through.
:::

## Verifying config

`compileConfig(cwd)` is the canonical loader. It returns a report you can inspect from the CLI:

```bash
# Print sources, errors, warnings, and the effective config:
fencepost config

# Same report, but exit non-zero if there are errors — for CI / pre-commit:
fencepost verify
```

Example output:

```
# Fencepost config

Sources (1):
  - /repo/.claude/fencepost.yaml

## Errors (1) — config will FAIL CLOSED until fixed
  ✖ [/repo/.claude/fencepost.yaml] invalid 'onError' value: "sometimes"
    (expected allow|deny|ask)

## Effective config
{ "default": "ask", "onError": "ask", ... }
```

Wire `fencepost verify` into a pre-commit hook or CI step so a typo in a security config is caught before it locks anyone out.
