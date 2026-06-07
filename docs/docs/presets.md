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
  ⨁ preset[0] ⨁ preset[1] ⨁ …      (preset base, in import order)
    ⨁ your config                   (your rules win)
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

| Name | Covers |
|------|--------|
| **`claude`** | Allows Claude's built-in tools (file tools included; web omitted); enables the `/tmp` → `/tmp/claude` [sandbox](./configuration/sandbox.md) and sandbox-scoped destructive ops. |
| **`claude-web`** | Allows the network built-ins `WebFetch` and `WebSearch` that `claude` leaves out. |
| **`git`** | Allows everyday porcelain; asks before history rewrites / branch deletes; denies force-push (steers to `--force-with-lease`) and `git clean -xfd`. |
| **`kubernetes`** | Normalises namespace/context/kubeconfig flags; allows read-only `kubectl`; asks before mutations; denies namespace / `--all` / node deletes. |
| **`helm`** | Allows list/status/template/lint/diff; asks before install/upgrade/uninstall; denies `helm upgrade --force`. |
| **`helmfile`** | Allows diff/template/lint; asks before apply/sync; denies `helmfile destroy`. |
| **`ansible`** | Normalises inventory/connection flags; allows read-only tooling; asks before playbook runs; denies ad-hoc shell/command/raw modules. |
| **`context7`** | Allows the read-only Context7 MCP doc-lookup tools (`mcp__*context7*`). |
| **`filesystem`** | Allows read-only/inspection shell commands (`ls`, `cat`, `grep`, `find`, `jq`, …); guards `find -delete`/`-exec` and `sed -i`. |
| **`python-safety`** | Conservative [inline-interpreter](./configuration/interpreters.md) defaults for Python and JS: ask on subprocess/eval/exec, deny destructive deletes/writes outside the sandbox. |

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
