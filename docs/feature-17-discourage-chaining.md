# Feature 17: Discourage Command Chaining

## Summary

When a Bash command joins multiple steps with **sequencing** operators (`&&`, `||`, `;`) and the overall decision would be `ask`, deny it instead with guidance to run each step as its own tool call. This makes every approval prompt a single, easy-to-parse command rather than a chain.

This builds on compound splitting (`feature-08`), which already evaluates each sub-command and steers Claude to split on a *denial*. Feature 17 closes the gap for the `ask` case.

## Why sequencing only (not pipes)

A pipe (`a | b`) is a single data-flow operation; splitting it into separate calls changes its meaning. So pipes are **exempt** — they are still split for evaluation (security), but a pipe alone never triggers the chaining deny. Only `&&`, `||`, and `;` do.

## Behaviour

For a Bash command:

1. Split into parts and record the joining operators (`splitCommandDetailed`).
2. Evaluate each part; take the most restrictive decision.
3. If `discourageChaining` is on, the command contains a sequencing operator, and the winning decision is `ask` → return `deny` with `chained: true`.
   - `allow` chains (every part allowed) pass through untouched — no needless friction.
   - `deny` chains are already denied (with the existing compound guidance).

The denial reason and `additionalContext` tell Claude to re-issue each step as a separate Bash call.

## Config

```yaml
tools:
  bash:
    discourageChaining: true   # default: true
```

Default is **on**. It is a scalar that only overrides when explicitly set, so setting `false` in one config file is not clobbered by a later file that omits it. To turn it off:

```yaml
tools:
  bash:
    discourageChaining: false
```

## Example

```
git push origin main && git status
```

`git push` requires approval, so the chain resolves to `ask`. With `discourageChaining` on, fencepost denies it:

> Fencepost: this chained command needs approval — run each step (split on && / ; / ||) as a separate command so it can be reviewed individually.

Claude then issues `git push origin main` and `git status` as two separate calls; only the first prompts.
