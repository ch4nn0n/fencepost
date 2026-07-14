---
title: Structured bash rules
description: Reason about redirections and every argument, not just the command prefix.
---

# Structured bash rules

Prefix and regex rules can't reason about two things that matter for safety:

1. **Redirections.** `echo ok > /etc/hosts` matches an `echo` allow — the write to `/etc/hosts` is invisible to a prefix rule.
2. **All arguments.** Prefix matching only sees the start of a command, so `rm -rf /tmp/claude/x /etc` slips past a `/tmp/claude` allow.

Because fencepost parses Bash into an AST, it already extracts the command name, every argument, and each redirect's operator and target. The `redirects` and `arguments` rules are policy over those structures. They slot into the [same tiers](./bash-rules.md#the-tiers) as everything else, bucketed by their `decision`.

## `redirects`

Each rule matches a single redirect by **mode** and **target**, and carries a decision.

```yaml
tools:
  bash:
    redirects:
      # Deny writes/appends to absolute paths outside the sandbox & project.
      - mode: write                       # read | write | append | any
        outside: ["/tmp/claude", "."]     # fires if target is outside ALL roots
        decision: deny
        description: "Redirecting output outside the sandbox can clobber files."
        alternative: "Write under /tmp/claude/ or a path inside the project."

      # Always ask before touching anything under /etc.
      - mode: any
        glob: "/etc/**"                   # fires if target matches this path glob
        decision: ask
        description: "This writes or reads under /etc."
```

**Mode** is derived from the redirect operator:

| Mode | Matches operators |
|------|-------------------|
| `write` | `>`, `>|`, `&>`, and (as a subtype) `>>`, `&>>` |
| `append` | only `>>`, `&>>` |
| `read` | `<` only. Heredocs (`<<`) and herestrings (`<<<`) have no file target, so no rule can fire on them. |
| `any` | all redirects |

**Target** — provide **exactly one** matcher:

- `outside: [roots]` — fires when the target resolves outside **all** the listed roots.
- `glob: "<pathglob>"` — fires when the target matches the path glob (`**` crosses path separators, `*` stays within a segment).

## `arguments`

Each rule matches a command by name and applies a predicate over its arguments:

```yaml
tools:
  bash:
    arguments:
      # Allow rm when EVERY path arg is inside the sandbox (multi-target safe).
      - command: rm
        allArgsInside: ["/tmp/claude"]
        decision: allow

      # Deny rm if ANY path arg escapes the sandbox / project.
      - command: rm
        anyArgOutside: ["/tmp/claude", "."]
        decision: deny
        description: "rm targeting paths outside the sandbox is blocked."
        alternative: "Delete within /tmp/claude/ or the project tree."

      # Deny the catastrophic flag regardless of target.
      - command: rm
        anyArgMatches: '^--no-preserve-root$'
        decision: deny
        description: "--no-preserve-root removes the / guard."
```

`command` is a name glob (`rm`, `git`, `*`, or `rm|rmdir|mkdir` alternation). Provide **exactly one** predicate:

| Predicate | Fires when |
|-----------|-----------|
| `anyArgOutside: [roots]` | any path-like arg resolves outside all roots |
| `allArgsInside: [roots]` | there's ≥1 path-like arg and **every** one is under some root |
| `anyArgMatches: <regex>` | any raw arg matches the regex |
| `allArgsMatch: <regex>` | there's ≥1 arg and **every** raw arg matches the regex |

## Path semantics

Targets and path-like arguments are resolved against the project `cwd` before testing, so relative and `..` escapes are caught:

- Roots and targets are normalised against `cwd`. `.` means the project directory; `~` expands to home. So `> ../../etc/x` is correctly seen as *outside*.
- `--output=/etc/x` is split on `=` and the value half (`/etc/x`) is tested.
- Bare flags (`-rf`, `--recursive`) are **not** treated as paths and are skipped.

## Precedence

These rules join the existing tiers, bucketed by `decision`:

| Tier | Sources |
|------|---------|
| **1 · deny** | `bash.deny`, `bash.checks`, `arguments`(deny), `redirects`(deny) |
| **2 · allow** (scoped) | `bash.allowChecks`, `arguments`(allow), `redirects`(allow) |
| **3 · ask** | `bash.ask`, `arguments`(ask), `redirects`(ask) |
| **4 · allow** | `bash.allow` |
| **5 · default** | `config.default` |

The key property holds: **deny (tier 1) always beats a scoped allow (tier 2)** — you can't allow your way past a deny — but a scoped allow like `allArgsInside` beats a broad `ask`.

Redirects on a compound or subshell (with no single owning command) are evaluated independently and folded into the most-restrictive result.

## A complete sandbox policy

Together these express "destructive ops only inside `/tmp/claude`, and never redirect outside it":

```yaml
tools:
  bash:
    arguments:
      - { command: rm, allArgsInside: ["/tmp/claude"], decision: allow }
      - command: "rm|rmdir|mkdir|touch"
        anyArgOutside: ["/tmp/claude", "."]
        decision: ask
    redirects:
      - mode: write
        outside: ["/tmp/claude", "."]
        decision: deny
        description: "Writing outside the sandbox can clobber files."
```

The [`claude` preset](../presets.md#claude) ships a policy in this shape (an `allArgsInside` allow covering the common file commands, plus the write-outside redirect deny), correct for multi-target commands in a way the old single-path regex couldn't be.

## Validation

- `redirects[]`: `mode` in the enum; **exactly one** of `outside`/`glob`; `decision` in the enum; invalid rules are skipped with a warning. `description` and `alternative` are always optional.
- `arguments[]`: `command` required; **exactly one** predicate; `decision` required; invalid regex skipped with a warning.

Both lists merge by concatenation, so presets compose cleanly.
