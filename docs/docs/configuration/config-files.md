---
title: Config files
description: Where fencepost looks for config, and how multiple files merge.
---

# Config files

fencepost reads its configuration from your project's `.claude/` directory. There are two layouts, plus bundled [presets](../presets.md) you can import.

## Resolution order

For a given project (`cwd` comes from the hook input), fencepost resolves config in this order:

1. **`.claude/fencepost/` directory** with `*.yaml`/`*.yml` files → load all, merge alphabetically (`conf.d` style).
2. Else **`.claude/fencepost.yaml`** single file → load it.
3. Else → **fail open** with `default: ask` and empty rule lists.

The directory form wins if it exists, so you can migrate from a single file to a directory without losing anything.

## Single file

The simplest setup. Everything in one place:

```yaml title=".claude/fencepost.yaml"
import:
  - claude
  - git

default: ask
onError: ask

tools:
  bash:
    allow:
      - bun test
```

## conf.d directory

As rules grow, split them by domain. fencepost loads every `*.yaml`/`*.yml` in `.claude/fencepost/`, sorted alphabetically, and merges them into one config:

```
.claude/
  fencepost/
    00-base.yaml      # import, default, onError
    10-tools.yaml     # general tool rules
    20-bash-core.yaml # rm, chmod, …
    30-kubectl.yaml   # kubernetes rules
    50-git.yaml       # git rules
```

Numeric prefixes are just a convention for ordering — not required. Each file can contain **any subset** of the schema; it only needs to define the sections it cares about:

```yaml title=".claude/fencepost/30-kubectl.yaml"
tools:
  bash:
    normalise:
      - prefix: kubectl
        strip: ['-n \S+', '--namespace \S+', '--context \S+']
    deny:
      - kubectl delete namespace
    ask:
      - kubectl delete
      - kubectl apply
    allow:
      - kubectl get
      - kubectl describe
```

## Merge semantics

Whether merging conf.d files or layering presets under your config, the rule is the same:

| Kind | Merge behaviour |
|------|-----------------|
| **Arrays** (`tools.allow`, `bash.deny`, `bash.checks`, …) | **Concatenated** — all rules from all files apply. |
| **Scalars** (`default`, `onError`) | **Last wins** — a later file overrides an earlier one. |
| **Blocks** (`guidance`, `redirect`) | **Block-level last-wins** — the whole block from the last file that sets it. |
| **`bash.discourageChaining`** | Scalar that only overrides when *explicitly* set, so `false` in one file isn't clobbered by a later file that omits it. |

In short: **scalars = last wins, arrays = concatenate.** Duplicate entries in concatenated arrays are harmless — a command matching two `allow` rules is still just allowed.

:::tip Imports merge as the base
[Presets](../presets.md) you `import:` are merged *first*, as a base layer; your own config is applied **on top**, so your rules and your `default` always win. Tier precedence (`deny > checks > ask > allow`) then decides outcomes at evaluation time.
:::

## Provenance

The resolved config tracks **which file each rule came from**. This powers debugging ("why is this denied?") and makes the [`/audit`](../reference/cli-and-audit.md) output actionable ("dead rule in `30-kubectl.yaml`"). Imported preset paths are recorded too, listed before your own files.

Inspect it any time:

```bash
fencepost config    # prints sources + effective config
```

## Schema overview

The full config shape:

```yaml
import: [ ... ]            # preset names to layer in as a base
default: ask              # allow | deny | ask — fallthrough decision
onError: ask              # allow | deny | ask — when a command can't be checked

guidance: { ... }         # SessionStart guidance — see Guidance & chaining
redirect: { ... }         # /tmp sandbox — see The sandbox

tools:
  deny:  [ { tool, description, alternative? } ]   # glob, with metadata
  ask:   [ "<glob>" ]
  allow: [ "<glob>" ]
  bash:
    normalise:   [ { prefix, strip: [regex] } ]
    deny:        [ "<prefix>" ]
    checks:      [ { test: regex, description, alternative? } ]
    allowChecks: [ "<regex>" ]
    ask:         [ "<prefix>" ]
    allow:       [ "<prefix>" ]
    discourageChaining: true
    offerManualRun: true    # offer a `! <command>` escape hatch on deny
    redirects:    [ ... ]   # structured — see Structured bash rules
    arguments:    [ ... ]   # structured — see Structured bash rules
    interpreters: { ... }   # inline code — see Nested interpreters
```

Each section has its own page:

- **[Tool rules](./tool-rules.md)** — `tools.deny/ask/allow`
- **[Bash rules](./bash-rules.md)** — `tools.bash.*` string/regex rules
- **[Structured bash rules](./structured-bash-rules.md)** — `redirects`, `arguments`
- **[Nested interpreters](./interpreters.md)** — `interpreters`
- **[The sandbox](./sandbox.md)** — `redirect`
- **[Guidance & chaining](./guidance-and-chaining.md)** — `guidance`, `discourageChaining`
