---
title: Permission modes
description: Why fencepost is meant to run with Claude Code in bypassPermissions, so the YAML ruleset is the single gate.
---

# Permission modes

fencepost is designed to **be** your permission layer, not to sit behind Claude Code's. To get that, run Claude Code in `bypassPermissions` mode and let the YAML ruleset be the single source of truth for what's allowed, asked, and denied.

## Why not the default mode

In Claude Code's `default` mode, two gates fire on every tool call: fencepost's `PreToolUse` hook **and** Claude's own permission prompts. fencepost's `allow` does suppress the native prompt for calls it explicitly allows, but anything it doesn't allow still falls through to Claude's prompt. The result is double-gating, and your `fencepost.yaml` is not actually authoritative.

Running Claude in `bypassPermissions` removes Claude's native prompts while leaving fencepost's decisions fully in force, so the ruleset you wrote is exactly the policy that runs.

## How a hook decision survives bypass mode

A `PreToolUse` hook decision sits **above** Claude Code's prompt layer. Claude Code's own docs put it plainly:

> Exit code 0 with no output means the hook has no decision to report, so the tool call continues through the normal permission flow.

So when fencepost *does* report a decision, that decision takes effect regardless of the active mode. And per the [permission-modes documentation](https://code.claude.com/docs/en/permission-modes), "Deny rules and explicit ask rules apply in every mode, including `bypassPermissions`." `bypassPermissions` only turns off the *native prompt* for calls nobody has an opinion about.

What each fencepost decision does, by mode:

| fencepost decision | `default` / `acceptEdits` | `bypassPermissions` |
|--------------------|---------------------------|---------------------|
| **allow** | Runs silently | Runs silently |
| **deny** | Blocked | **Blocked** (deny is honored in every mode) |
| **ask** | Claude prompts you | **Claude still prompts you** (ask is honored in every mode) |
| silent (no decision) | Falls through to Claude's prompt | Falls through to Claude's flow → **auto-approved** |

The last row is the one that matters for how you write config: in bypass mode, anything fencepost stays silent about is auto-approved. fencepost is never silent for a call it evaluates — it emits `default` for unmatched calls — so keep `default: ask` or `default: deny` (never `allow`), and likewise for [`onError`](./failure-posture.md). That way nothing slips through unjudged.

## How to enable it

Start Claude Code with the flag:

```bash
claude --permission-mode bypassPermissions
```

`--dangerously-skip-permissions` is the equivalent flag. The same works with `--plugin-dir` when trying fencepost from a clone:

```bash
claude --permission-mode bypassPermissions --plugin-dir ./fencepost
```

A few constraints, all from Claude Code itself:

- It is a **launch-time** choice. A session not started with an enabling flag cannot switch into bypass mode, and `defaultMode: "bypassPermissions"` in project settings is not honored for [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web) — so a checked-in config cannot turn it on for you. fencepost cannot enable it on your behalf.
- Claude Code **refuses to start in this mode as root or under `sudo`** (outside a recognized sandbox).
- An administrator can block the mode entirely with `permissions.disableBypassPermissionsMode: "disable"` in managed settings.

## What you give up, and why fencepost has to be comprehensive

:::warning bypass removes Claude's *other* safety nets
`bypassPermissions` disables more than the prompts. It also turns off Claude Code's [protected-path](https://code.claude.com/docs/en/permission-modes#protected-paths) write guards (for `.git`, shell rc files, `.claude`, and the like), and Claude's docs state it "offers no protection against prompt injection." Upstream scopes the mode to "isolated environments like containers, VMs, or dev containers."

Once Claude's safety net is off, **fencepost is the only thing standing between Claude and your machine.** That is the intended design — but it means your ruleset has to be the comprehensive policy, and `default`/`onError` must be `ask` or `deny`, never `allow`. fencepost still [fails closed](./failure-posture.md) on a broken config, and Claude Code keeps a last-resort circuit breaker (`rm -rf /` and `rm -rf ~` still prompt even in bypass).
:::

fencepost is a **guard rail, not a sandbox** (see the [introduction](../intro.md)): it enforces the policy you chose and prevents accidental damage, but it does not contain a determined adversary. Running in a container or VM, as Claude Code recommends for this mode, gives you real isolation underneath the policy.

## See also

- [The decision model](./decision-model.md) — how `allow` / `ask` / `deny` resolve.
- [Failure posture](./failure-posture.md) — why `default`/`onError` matter so much in bypass mode.
- [Permission modes (Claude Code docs)](https://code.claude.com/docs/en/permission-modes) — the upstream reference.
