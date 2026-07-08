---
title: Bash rules
description: Gate shell commands with normalisation, prefix lists, and regex checks.
---

# Bash rules

Everything under `tools.bash` governs `Bash` tool calls. Commands are parsed with tree-sitter, normalised, split into their simple commands, and each is evaluated against the bash tiers.

This page covers the **string and regex** rules. The richer structured rules — reasoning about redirections and every argument — live in [Structured bash rules](./structured-bash-rules.md), and inline code in [Nested interpreters](./interpreters.md). All of them participate in the same tiers.

## The tiers

```
deny  >  checks  >  allowChecks  >  ask  >  allow  >  default
```

| Tier | Rule | Match style |
|------|------|-------------|
| 1 | `bash.deny` | prefix |
| 1 | `bash.checks` | regex (with metadata) |
| 2 | `bash.allowChecks` | regex (scoped allow) |
| 3 | `bash.ask` | prefix |
| 4 | `bash.allow` | prefix |
| 5 | `config.default` | — |

The most restrictive matching tier wins, and **deny is never bypassed** by a lower tier.

## `normalise` — strip noise first

Before matching, you can strip volatile flags so a rule doesn't have to anticipate every permutation. Each rule targets a command `prefix` and removes matching substrings via regex:

```yaml
tools:
  bash:
    normalise:
      - prefix: kubectl
        strip:
          - '-n \S+'
          - '--namespace \S+'
          - '--context \S+'
```

Now `kubectl -n prod delete pod foo` normalises to `kubectl delete pod foo`, so your `kubectl delete` rule matches regardless of namespace flags. The normalised form is what every tier sees (and what the [audit log](../reference/cli-and-audit.md) records when it differs from the original).

## `deny` and `allow` and `ask` — prefix lists {#prefix-matching}

These three are lists of command **prefixes**. A rule matches when the (normalised) command equals the rule, or starts with the rule **followed by a space**:

```ts
command === rule || command.startsWith(rule + " ")
```

That word boundary is what makes prefixes safe:

```yaml
tools:
  bash:
    allow:
      - git status
      - git log
    ask:
      - git push
    deny:
      - git branch -D
```

| Command | Matches | Result |
|---------|---------|--------|
| `git status` | `git status` (exact) | allow |
| `git status --short` | `git status ` (prefix + space) | allow |
| `git push origin main` | `git push ` | ask |
| `git branch -D feature` | `git branch -D ` | deny |
| `git branchless` | nothing (`git branch` ≠ prefix of `branchless`) | falls through |

Because tiers resolve deny → … → allow, listing `git branch` in `allow` does **not** prevent `git branch -D` in `deny` from firing.

## `checks` — smart deny with an alternative

`checks` are regex rules tested against the whole command. They always deny, but carry the rich `description` + `alternative` that fencepost feeds back to Claude:

```yaml
tools:
  bash:
    checks:
      - test: 'git\s+push\b.*\s(--force(?!-with-lease)|-f)\b'
        description: "Force-pushing overwrites remote history and can clobber others' work."
        alternative: "Use 'git push --force-with-lease', which refuses to overwrite changes you haven't seen."
      - test: '\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive)'
        description: "Recursive delete is dangerous."
        alternative: "Delete specific files individually."
```

A matched check denies with that exact message. Invalid regex is skipped with a warning rather than failing the whole config.

## `allowChecks` — smart allow (scoped exceptions)

The mirror image of `checks`: a regex that **allows**. Because it matches the whole command (not a prefix), a `$`-anchored pattern can confine an allow to a single path — for example, permitting destructive ops only inside the [sandbox](./sandbox.md):

```yaml
tools:
  bash:
    allowChecks:
      - '^rm\s+(-\S+\s+)*/tmp/claude(/\S*)?$'
```

`allowChecks` sits **above** `ask`/`allow` (so an explicit exception wins over a broad ask) but **below** `deny`/`checks` (so it can never bypass a denial).

:::tip Prefer structured rules for paths
`allowChecks` only confines a *single* target (`rm /tmp/claude/x /etc` slips a one-path regex). For multi-target safety — "every path argument of `rm` must be under an allowed root" — use the [`arguments` rules](./structured-bash-rules.md) instead. The `claude` preset already does.
:::

## Compound commands

A command joined with `&&`, `||`, `;`, or `|` is split into simple commands; each is evaluated, and the **most restrictive** decision wins. The denial reason names the specific offending sub-command. See [discourage chaining](./guidance-and-chaining.md) for how *ask*-level chains are converted to denials that ask Claude to run each step separately.

## Manual-run escape hatch

When fencepost denies a Bash command, it can also hand you the exact command to run yourself — turning a flat wall into "I won't run this for the agent, but here it is for you." This keeps the destructive action (if it happens at all) under direct human intent.

```yaml
tools:
  bash:
    offerManualRun: true   # default true
```

With this on, a Bash deny appends an instruction for Claude to offer the **verbatim original command** in a copyable code block after the alternative, runnable via `! <command>` (a user shell command that bypasses the hook). See [Evaluation & output → manual-run escape hatch](../concepts/evaluation.md#deny-offers-a-manual-run-escape-hatch) for the full behaviour, rationale, and caveats.
