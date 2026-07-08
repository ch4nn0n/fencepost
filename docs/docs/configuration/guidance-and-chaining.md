---
title: Guidance & chaining
description: Steer Claude at session start, and discourage command chaining.
---

# Guidance & chaining

Two smaller behaviours that make a gated environment pleasant to work in: injecting guidance when a session starts, and discouraging chained commands so each approval prompt stays simple.

## Session guidance

At the start of every session, fencepost can inject a short set of lines into Claude's context (via the `SessionStart` hook). These steer Claude toward behaviours that work well behind a gate — use the alternative on a denial, stop and ask you to authenticate when a tool needs credentials, write scratch files to the sandbox, avoid needless chaining and destruction.

### Config

```yaml
guidance:
  enabled: true          # emit SessionStart context at all (default true)
  includeDefaults: true  # include fencepost's built-in lines (default true)
  extra:                 # additional lines appended after the defaults
    - "Use bun, not npm, in this repo."
```

`guidance` is block-level last-wins when merged across files and presets. When the block is absent, all defaults apply. If guidance is disabled or empty, the hook writes nothing and exits 0 — and any error is swallowed, because a guidance hook must never block a session from starting.

### Built-in lines

When `includeDefaults` is on, Claude is told:

1. This project is protected by fencepost; some calls are denied or need approval.
2. On a denial with an alternative, **use the alternative** — don't retry or work around the rule.
3. If a tool fails for missing auth (login, credentials, expired token), **stop and ask the user to authenticate** rather than working around it.
4. Write scratch/temp files under `/tmp/claude`. *(Wording adapts: if [`redirect.tmp`](./sandbox.md) is on it notes paths are redirected automatically; otherwise it asks Claude to use the sandbox directly.)*
5. Prefer one command per tool call over chaining with `&&`/`;`.
6. Avoid destructive operations unless explicitly asked.

Your `extra` lines are appended after these.

## Discourage chaining

When a Bash command joins multiple steps with **sequencing** operators (`&&`, `||`, `;`) and the overall decision would be **ask**, fencepost denies it instead — with guidance to run each step as its own tool call. This keeps every approval prompt a single, easy-to-read command rather than a chain.

```yaml
tools:
  bash:
    discourageChaining: true   # default: true
```

### Why, and what's exempt

- **Pipes are exempt.** `a | b` is a single data-flow operation; splitting it changes its meaning. Pipes are still split for *evaluation* (security), but a pipe alone never triggers the chaining deny — only `&&`, `||`, `;` do.
- **Allow chains pass through.** If every part is allowed, the chain is allowed — no needless friction.
- **Deny chains are already denied**, with the [compound guidance](./bash-rules.md#compound-commands) naming the offending sub-command.
- **Loops and conditionals are exempt.** Control-flow scaffolding is stripped first; a loop is one unit, not a chain to split.

So the rule only converts the **ask** case to a deny.

### Example

```bash
git push origin main && git status
```

`git push` requires approval, so the chain resolves to **ask**. With `discourageChaining` on, fencepost denies it and tells Claude to split:

> Fencepost: this chained command needs approval — run each step (split on `&&` / `;` / `||`) as a separate command so it can be reviewed individually.

Claude then issues `git push origin main` and `git status` as two calls; only the first prompts.

### Turning it off

`discourageChaining` is a scalar that only overrides when **explicitly** set, so `false` in one config file isn't clobbered by a later file that omits it:

```yaml
tools:
  bash:
    discourageChaining: false
```
