---
title: Configuration reference
description: Every fencepost.yaml key — type, default, and merge behaviour.
---

# Configuration reference

Every key fencepost understands, with its type, default, and how it merges across config layers. For guided introductions, see the [Configuration](../configuration/config-files.md) section; this page is the complete map.

## JSON Schema

A machine-readable schema ships with fencepost at [`schema/fencepost.schema.json`](https://github.com/ch4nn0n/fencepost/blob/main/schema/fencepost.schema.json) and is published at `https://ch4nn0n.github.io/fencepost/fencepost.schema.json`. Point your editor at it for completion, hover docs, and validation — with the YAML language server (VS Code YAML extension, coc-yaml, …), add a modeline at the top of your config:

```yaml title=".claude/fencepost.yaml"
# yaml-language-server: $schema=https://ch4nn0n.github.io/fencepost/fencepost.schema.json
import:
  - claude
default: ask
```

## Resolution order

fencepost loads the **first** layer that exists; later layers are not consulted:

1. `{project}/.claude/fencepost/config/*.yaml` — project conf.d directory, merged alphabetically
2. `{project}/.claude/fencepost.yaml` — project single file
3. `~/.claude/fencepost/config/*.yaml` — user-level conf.d directory
4. `~/.claude/fencepost.yaml` — user-level single file
5. Built-in defaults (no config is not an error)

Presets named in `import:` are merged first, as a base; the host config is applied on top. A present-but-broken config file records an error and the run **fails closed** (deny). Run `fencepost config` to see the sources, issues, and effective config.

## Top level

```yaml
import: [claude, git]   # presets to layer in as a base
default: ask            # fallthrough decision
onError: ask            # posture when a command can't be checked
tools: { ... }
guidance: { ... }
redirect: { ... }
secrets: { ... }
```

| Key | Type | Default | Merge | Notes |
|-----|------|---------|-------|-------|
| `import` | list of preset names | `[]` | n/a | Bare identifiers only (`[a-zA-Z0-9_-]+`), resolved against the bundled [presets](../presets.md). `all` expands to every bundled preset; `user` pulls in your user-level `~/.claude` config as a base layer. Nested imports (inside a preset or the user-level file) are ignored. |
| `default` | `allow` \| `deny` \| `ask` | `ask` | set-wins | Decision when no rule matches. The last explicitly set value wins; a layer that omits `default` inherits it (mirrors `onError`). |
| `onError` | `allow` \| `deny` \| `ask` | `ask` | set-wins | Used when fencepost runs but can't reach a decision (e.g. unparseable Bash). A broken *config* always fails closed regardless. See [Failure posture](../concepts/failure-posture.md). |
| `tools` | object | see below | per-field | Tool and Bash rules. |
| `guidance` | object | see below | block last-wins | SessionStart guidance. |
| `redirect` | object | see below | block last-wins | `/tmp` sandbox redirection. |
| `secrets` | object | see below | field-level | Secrets scanning. |
| `meta` | `{title, description}` | — | n/a | Preset metadata for the docs catalog; ignored at evaluation time. |

## `tools`

See [Tool rules](../configuration/tool-rules.md).

| Key | Type | Default | Merge | Notes |
|-----|------|---------|-------|-------|
| `tools.deny` | list of `{tool, description, alternative?}` | `[]` | concat | `tool` is a name glob (e.g. `mcp__dangerous_*`); `description`/`alternative` are shown to the model. |
| `tools.ask` | list of name globs | `[]` | concat | Require user approval. |
| `tools.allow` | list of name globs | `[]` | concat | Allow without prompting. Listing `Bash` here has no effect — Bash always goes through the bash pipeline. |

## `tools.bash`

String and regex rules over the normalised command — see [Bash rules](../configuration/bash-rules.md).

| Key | Type | Default | Merge | Notes |
|-----|------|---------|-------|-------|
| `bash.normalise` | list of `{prefix, strip: [regex]}` | `[]` | concat | Strips noise (e.g. `-n <ns>`) from commands with the prefix before any matching. |
| `bash.deny` | list of command prefixes | `[]` | concat | |
| `bash.checks` | list of `{test: regex, description, alternative?}` | `[]` | concat | Smart deny: regex over the whole normalised command. |
| `bash.allowChecks` | list of regexes | `[]` | concat | Smart allow: regex over the whole normalised command, so an anchored pattern can confine an allow to a path. Evaluated above `ask`/`allow`. |
| `bash.ask` | list of command prefixes | `[]` | concat | |
| `bash.allow` | list of command prefixes | `[]` | concat | |
| `bash.discourageChaining` | boolean | `true` | set-wins | Deny `&&`/`;`/`\|\|` chains that would need approval, with guidance to run the parts separately. Pipes and control-flow constructs (`if`, `for`, `while`, ...) are exempt: any control-flow node exempts the whole command. See [Guidance & chaining](../configuration/guidance-and-chaining.md). |
| `bash.offerManualRun` | boolean | `true` | set-wins | On deny, offer the verbatim command for the user to run via `! <command>`. |
| `bash.redirects` | list of redirect rules | `[]` | concat | See below. |
| `bash.arguments` | list of argument rules | `[]` | concat | See below. |
| `bash.interpreters` | map keyed by `python` / `javascript` | `{}` | per-language | See below. |

### `bash.redirects[]`

Structured rules over redirection targets (`>`, `>>`, `<`) — see [Structured bash rules](../configuration/structured-bash-rules.md).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mode` | `read` \| `write` \| `append` \| `any` | yes | Which redirections the rule applies to. |
| `outside` | list of roots | exactly one of `outside`/`glob` | Fires if the target is outside **all** roots. |
| `glob` | path glob | | Fires if the target matches. |
| `decision` | `allow` \| `deny` \| `ask` | yes | |
| `description`, `alternative` | string | no | Shown to the model when the rule fires. |

### `bash.arguments[]`

Rules that reason about **every** argument of a command, not a prefix.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `command` | command-name glob | yes | e.g. `"rm\|rmdir\|mkdir"`. |
| `anyArgOutside` | list of roots | exactly one predicate | Any path-like arg outside all roots. |
| `allArgsInside` | list of roots | | ≥1 path-like arg, all under some root. |
| `anyArgMatches` | regex | | Any raw arg matches. |
| `allArgsMatch` | regex | | Every raw arg matches. |
| `decision` | `allow` \| `deny` \| `ask` | yes | |
| `description`, `alternative` | string | no | |

### `bash.interpreters.<lang>`

Inline interpreter analysis (`python -c`, `node -e`, heredocs) for `python` and `javascript` — see [Nested interpreters](../configuration/interpreters.md). Merge: `names` union, `calls`/`imports` concat, `writes` last-wins.

| Field | Type | Notes |
|-------|------|-------|
| `names` | list of strings | Bash command names that invoke this interpreter, e.g. `[python, python3]`. |
| `calls` | list of `{match, argMatches?, pathArgsOutside?, decision, description?, alternative?}` | `match` is a qualified callee glob (`shutil.rmtree`, `subprocess.*`); `argMatches` narrows to calls whose argument text matches the regex; `pathArgsOutside` fires only when a string path argument is outside all roots. |
| `imports` | list of `{match, decision, description?}` | `match` is a module-name glob. |
| `writes` | `{outside: [roots], decision, description?, alternative?}` | Sugar for "a file is opened for writing" outside the roots. |

## `guidance`

SessionStart guidance injected into Claude's context — see [Guidance & chaining](../configuration/guidance-and-chaining.md). The whole block is last-wins on merge.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `true` | Emit SessionStart context at all. |
| `includeDefaults` | boolean | `true` | Include fencepost's built-in guidance lines. |
| `extra` | list of strings | `[]` | Additional lines appended after the defaults. |

## `redirect`

Tool-input redirection — see [The sandbox](../configuration/sandbox.md). Off by default; the `claude` preset turns it on. The whole block is last-wins on merge.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `tmp` | boolean | `false` | Rewrite bare/prefixed `/tmp` paths in tool inputs to `tmpTarget`. |
| `tmpTarget` | string | `/tmp/claude` | Destination directory. |

## `secrets`

Secrets scanning — see [Secrets protection](../configuration/secrets.md). Off by default; the `secrets` preset turns it on. Merged **field-by-field** (a preset's `enabled: true` survives a user config that only adds allowlist entries); the `allow` lists concatenate.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `enabled` | boolean | `false` | |
| `scanner` | `auto` \| `gitleaks` \| `betterleaks` \| `trufflehog` \| `detect-secrets` | `auto` | `auto` probes `PATH` in preference order; a name pins one scanner. |
| `scanInputs` | boolean | `true` | PreToolUse: deny tool inputs that contain secrets. |
| `scanOutputs` | boolean | `true` | PostToolUse: redact secrets from tool output. |
| `inputTools` | list of tool names | `[Write, Edit, NotebookEdit, Bash]` | |
| `outputTools` | list of tool names | `[Read, Bash, Grep, WebFetch]` | |
| `allow.paths` | list of path globs | `[]` | File inputs exempt from scanning (e.g. `.env.example`). |
| `allow.rules` | list of `<scanner>:<ruleId>` globs | `[]` | Findings to ignore (e.g. `gitleaks:generic-api-key`). |
| `maxScanBytes` | number > 0 | `5242880` (5 MiB) | Content larger than this is not scanned. |
| `timeoutMs` | number > 0 | `10000` | Hang ceiling per scanner invocation. |

## Validation behaviour

Config problems come in two severities, both reported by `fencepost config`:

- **Errors** (wrong top-level shape, invalid `default`/`onError`, unreadable file, YAML parse failure) — the config **fails closed**: everything is denied until fixed.
- **Warnings** (a malformed rule, an invalid regex, an unknown scanner name) — the offending rule is skipped; the rest of the config still applies.

Unknown keys are ignored at runtime, which is exactly why editor validation via the [JSON Schema](#json-schema) is worth setting up: a typo like `dney:` silently does nothing otherwise.
