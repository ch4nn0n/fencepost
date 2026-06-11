---
title: Presets
description: Curated rule sets you can import with a single line.
---

# Presets

Presets are **bundled, curated rule sets** that ship with the fencepost plugin (in `presets/`). Instead of copy-pasting allow/ask/deny rules for common tools, you import them by name and layer your own config on top.

## Importing

Add a top-level `import:` list of bare preset names:

```yaml title=".claude/fencepost.yaml"
import:
  - claude
  - git
  - kubernetes

default: ask
tools:
  allow:
    - Read
    - Edit
```

Each name resolves to `<presets-dir>/<name>.yaml`. Presets deliberately **do not set `default`** — that belongs to your config.

## How merging works

```
DEFAULT_CONFIG
  + preset[0] + preset[1] + ...     (preset base, in import order)
    + your config                   (your rules win)
```

1. Your config is resolved as usual (single file or `conf.d`).
2. Every `import:` entry is collected and the named presets are merged **in listed order**, starting from the built-in defaults, to form a *preset base*.
3. Your own config is merged **on top**.

Because your config is applied last, your rules layer over the presets and your `default` overrides theirs. Within list sections, preset and user rules are **concatenated**; tier precedence (`deny > checks > ask > allow > default`) then decides outcomes at evaluation time. See [Config files → merge semantics](./configuration/config-files.md#merge-semantics).

## Safety & resolution

- **Names are sandboxed.** A preset name must match `^[a-zA-Z0-9_-]+$`. Anything with a path separator or `.` (e.g. `../../etc/passwd`) is rejected, so `import:` can never escape the presets directory.
- **Typos never lock you out.** An unknown or missing preset is logged at `warn` and skipped — consistent with the fail-open posture for *missing* config.
- **One level deep.** Nested imports (a preset importing another) are not processed.
- **Lookup order** for the presets directory: `$FENCEPOST_PRESETS_DIR` (set by the plugin hook wrapper) → `<binary dir>/../presets` → `<src>/../presets` (development).

Imported preset paths show up in [provenance](./reference/cli-and-audit.md), listed before your own files, so `fencepost config` and `/audit` show exactly which preset contributed each rule.

## Bundled presets

Each preset has its own page, generated straight from the YAML in `presets/` — what you see is exactly what you import.

```mdx-code-block
import DocCardList from '@theme/DocCardList';

<DocCardList />
```

## The `claude` preset in detail {#claude}

The one most projects want. It makes routine work with Claude Code quiet:

**Allows the built-in tools** — `Read`, `Glob`, `Grep`, `Edit`, `Write`, `NotebookEdit`, `TodoWrite`, `Task`, `ExitPlanMode`, `BashOutput`, `KillShell`. Two deliberate exclusions:

- **`Bash`** is absent — fencepost always routes Bash through the [command pipeline](./configuration/bash-rules.md), so listing it would do nothing.
- **`WebFetch` / `WebSearch`** are not allowed — they reach external services, so they fall through to your `default`. Add the `claude-web` preset if you want them.

**Enables the sandbox** — turns on `/tmp` redirection and ships the [structured rules](./configuration/structured-bash-rules.md) that scope destructive ops to `/tmp/claude`.

A common starting point:

```yaml
import:
  - claude
  - git
  - kubernetes
default: ask
```

## Generating rules for a new tool

Don't hand-write rules for a tool from memory — subcommands differ between versions. Two skills automate the method the bundled presets were built with:

- **`/preset <tool>`** reads a tool's *actual* command surface (from the installed binary, or a connected MCP server's live tool list), classifies each command into allow / ask / deny, and merges the result into your own `.claude/fencepost.yaml`. It never sets `default`, and anything it's unsure about is left to fall through.
- **`/contribute-preset <name>`** packages a rule set as a bundled `presets/*.yaml`, updates the docs, validates it, and opens a pull request — the path the presets above came in through.
