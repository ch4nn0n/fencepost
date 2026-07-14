---
title: Quick start
description: A working fencepost config in two minutes.
---

# Quick start

This walks you from nothing to a sensible perimeter for a typical project.

## 1. Create a config

fencepost reads config from your project's `.claude/` directory. The simplest form is a single file:

```yaml title=".claude/fencepost.yaml"
# Pull in curated rule sets as a base.
import:
  - claude        # allow Claude's built-in tools + enable the /tmp sandbox
  - git           # sensible git porcelain rules
  - secrets       # deny secret-bearing inputs, redact secrets from output

# What to do when nothing matches.
default: ask

# What to do when fencepost can't reach a decision (e.g. an unparseable command).
onError: ask
```

That's enough to be useful. `claude` allows routine file tools and turns on the scratch sandbox; `git` allows everyday porcelain, asks before history rewrites, and denies force-pushes; `secrets` scans tool calls with your installed secret scanner ([gitleaks recommended](../configuration/secrets.md)). Everything else falls through to `ask`.

## 2. Start a session

Open Claude Code in the project, running it in `bypassPermissions` mode so fencepost is the sole gate (see [permission modes](../concepts/permission-modes.md) for why):

```bash
claude --permission-mode bypassPermissions
```

On `SessionStart`, fencepost injects a short [guidance](../configuration/guidance-and-chaining.md) message so Claude knows it's behind a gate, and creates `/tmp/claude`.

Now watch the decisions:

```bash
$ git status            # → allow  (git preset)
$ git push origin main  # → ask    (no rule matches, so it falls through to default: ask)
$ git push --force      # → deny   (steered to --force-with-lease)
```

## 3. Layer your own rules on top

Imports are the *base*; your own rules always win. Add project-specific rules under `tools`:

```yaml title=".claude/fencepost.yaml"
import:
  - claude
  - git

default: ask
onError: ask

tools:
  # Non-Bash tools, matched by glob.
  allow:
    - "mcp__plugin_context7_*"   # let the docs MCP through
  deny:
    - tool: "mcp__dangerous_*"
      description: "Blocked by policy"
      alternative: "Use the safe equivalent"

  bash:
    allow:
      - bun test
      - bun run
    ask:
      - bun publish
    deny:
      - curl
```

See **[Tool rules](../configuration/tool-rules.md)** and **[Bash rules](../configuration/bash-rules.md)** for the full schema.

## 4. Split rules by domain (optional)

As your config grows, switch from one file to a config directory. fencepost loads every `*.yaml` in `.claude/fencepost/config/`, alphabetically, and merges them:

```
.claude/
  fencepost/
    config/
      00-base.yaml      # imports + default + onError
      10-tools.yaml     # general tool rules
      20-bash.yaml      # bash rules
      50-project.yaml   # project-specific overrides
```

See **[Config files](../configuration/config-files.md)** for merge semantics.

## 5. Tune from real usage

After a while, let fencepost tell you what to change:

```bash
/audit
```

(Plugin skills are namespaced, so use `/fencepost:audit` if another plugin also defines `/audit`; the same goes for `/preset` below.) The [audit skill](../reference/cli-and-audit.md) reads the decision log and suggests promotions (commands you keep approving → move to `allow`), flags dead rules, and prints the effective config with provenance.

To gate a tool that has no bundled preset, run `/preset <tool>` — it reads the tool's real command surface and builds the rules into your config. See [generating rules for a new tool](../presets.md#generating-rules-for-a-new-tool).

## What's next

- **[The decision model](../concepts/decision-model.md)** — exactly how a command resolves.
- **[Presets](../presets.md)** — every bundled rule set.
- **[The sandbox](../configuration/sandbox.md)** — scoped destructive permissions.
