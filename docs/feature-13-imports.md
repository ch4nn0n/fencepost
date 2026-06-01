# Feature 13: Importable Presets (`import:`)

## Summary

Let a config pull in **bundled preset rule sets** by name via a top-level `import:` list. Presets ship with the fencepost plugin (in `presets/`) and cover common tools: `git`, `kubernetes`, `helm`, `helmfile`, `ansible`, `context7`. This lets a user keep a small `fencepost.yaml` that composes curated rules instead of copy-pasting them.

## Config Syntax

```yaml
# .claude/fencepost.yaml
import:
  - git
  - kubernetes
  - context7

default: ask
tools:
  allow:
    - Read
    - Edit
```

`import` is a list of bare preset names. Each name resolves to `<presets-dir>/<name>.yaml` (or `.yml`).

## Resolution & Merge Semantics

1. Resolve the user's config as usual (conf.d dir or single file — see Features 02 & 09).
2. Collect every `import:` entry across the loaded file(s).
3. Load each named preset and merge them in listed order, starting from the default config, to form a **preset base**.
4. Merge the user's own config **on top of** the preset base.

Because the user's config is applied last and `default` is last-wins, the user's rules layer on top of (and their `default` overrides) anything a preset provides. Within the list/`checks` sections, preset rules and user rules are concatenated; tier precedence (`deny > checks > ask > allow > default`) then decides the outcome at evaluation time.

Preset files intentionally **do not set `default`** — that belongs to the user's own config.

```
DEFAULT_CONFIG
  ⨁ preset[0] ⨁ preset[1] ⨁ …      (preset base, in import order)
    ⨁ user config                   (user rules win)
```

## Preset Lookup

The presets directory is resolved in this order:

1. `$FENCEPOST_PRESETS_DIR` (the plugin hook wrapper sets this to `{{PLUGIN_DIR}}/presets`)
2. `<dir of the compiled binary>/../presets`
3. `<src>/../presets` (development)

The first directory containing `<name>.yaml`/`.yml` wins.

## Safety

- Preset names must match `^[a-zA-Z0-9_-]+$`. Anything containing a path separator or `.` (e.g. `../../etc/passwd`) is rejected, so `import:` can never escape the presets directory.
- Unknown / missing preset names are logged at `warn` and skipped — consistent with the project's fail-open posture. A typo never locks the user out.
- Nested imports (a preset importing another preset) are **not** processed; imports are resolved one level deep from the user's config.

## Provenance

Imported preset paths are recorded in `ResolvedConfig._sources`, listed before the user's own files. The `/audit` skill and `fencepost config` command therefore show exactly which presets contributed rules.

## Bundled Presets

| Name | Covers |
|------|--------|
| `git` | Allows everyday porcelain; asks before history rewrites/branch deletes; denies force-push (steers to `--force-with-lease`) and `git clean -xfd`. |
| `kubernetes` | Normalises namespace/context/kubeconfig flags; allows read-only `kubectl`; asks before mutations; denies namespace / `--all` / node deletes. |
| `helm` | Allows list/status/template/lint/diff; asks before install/upgrade/uninstall; denies `helm upgrade --force`. |
| `helmfile` | Allows diff/template/lint; asks before apply/sync; denies `helmfile destroy`. |
| `ansible` | Normalises inventory/connection flags; allows read-only tooling; asks before playbook runs; denies ad-hoc shell/command/raw modules. |
| `context7` | Allows the read-only Context7 MCP doc-lookup tools (`mcp__*context7*`). |
| `claude` | Allows Claude's built-in tools (file tools incl.; web omitted); enables `/tmp` → `/tmp/claude` redirect and sandbox-scoped destructive ops. See `feature-16`. |
| `claude-web` | Allows the network built-ins `WebFetch` and `WebSearch` that `claude` omits. |
| `filesystem` | Allows read-only/inspection shell commands (ls, cat, grep, find, jq, …); guards `find -delete/-exec` and `sed -i`. |
