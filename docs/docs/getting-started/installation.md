---
title: Installation
description: Install fencepost as a Claude Code plugin.
---

# Installation

fencepost ships as a Claude Code plugin: a manifest that registers the hooks, a small committed JS bundle, the tree-sitter grammars, and a set of presets. There's **no build step for users** and no 100 MB binary to download.

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code)
- A JavaScript runtime on your `PATH` — **Node** (which you already have if you run Claude Code via npm) or **Bun**. The hook wrapper uses whichever it finds.

## Install from the marketplace (recommended)

fencepost's repository doubles as a single-plugin marketplace, so you can add it and install in two commands:

```text
/plugin marketplace add ch4nn0n/fencepost
/plugin install fencepost@fencepost
```

That's it — the plugin is fetched and cached, the `PreToolUse` and `SessionStart` hooks register, and the gate is live on the next tool call. Update later with `/plugin marketplace update fencepost`.

## Run Claude with fencepost as the gate (recommended)

fencepost is meant to be your permission layer, so run Claude Code in `bypassPermissions` mode:

```bash
claude --permission-mode bypassPermissions
```

This stands down Claude's own permission prompts and lets fencepost's `allow`/`ask`/`deny` decide every call — no double-prompting, and your `fencepost.yaml` is the single source of truth. fencepost's `deny` and `ask` are still enforced in this mode; only the calls fencepost would let through stop prompting.

:::warning Use an isolated environment
`bypassPermissions` also disables Claude Code's *other* safety nets (protected-path write guards, and it offers no protection against prompt injection), so Claude recommends it only in containers, VMs, or dev containers. With those nets off, fencepost is your sole gate — keep `default`/`onError` set to `ask` or `deny` (never `allow`). See **[Permission modes](../concepts/permission-modes.md)** for the full picture.
:::

## Try it locally without installing

To test against a clone (for development, or before committing to installing), point Claude Code at the directory (the same `--permission-mode` flag applies):

```bash
git clone https://github.com/ch4nn0n/fencepost.git
claude --permission-mode bypassPermissions --plugin-dir ./fencepost
```

## What's in the plugin

```
fencepost/
├── .claude-plugin/
│   ├── plugin.json          # registers PreToolUse + SessionStart hooks
│   └── marketplace.json     # lets the repo be added as a marketplace
├── hooks/
│   ├── pre-tool-use.sh      # wrapper → node dist/index.js evaluate
│   └── session-start.sh     # → node dist/index.js sessionstart
├── dist/
│   ├── index.js             # the committed JS bundle (~280 KB)
│   └── *.wasm               # tree-sitter grammars
├── presets/                 # bundled importable rule sets
└── skills/audit.md          # the /audit slash command
```

The two hooks:

- **`PreToolUse`** → evaluates each tool call.
- **`SessionStart`** → injects [session guidance](../configuration/guidance-and-chaining.md) and prepares the `/tmp/claude` sandbox.

The manifest points at thin shell wrappers rather than the bundle directly. Each wrapper finds a runtime, resolves the bundle relative to its own location, and exports `FENCEPOST_PRESETS_DIR` so bundled presets resolve no matter where the plugin is installed:

```bash title="hooks/pre-tool-use.sh"
#!/usr/bin/env bash
HERE="$(cd "$(dirname "$0")" && pwd)"
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
RUNNER="$(command -v node || command -v bun || true)"
[ -z "$RUNNER" ] && exit 0   # fail open if no runtime is available
exec "$RUNNER" "$HERE/../dist/index.js" evaluate
```

## Verify it works

With no config present, fencepost is a no-op (it [fails open](../concepts/failure-posture.md) to `default: ask`). You can run the bundle directly to confirm:

```bash
echo '{"tool_name":"Read","tool_input":{},"session_id":"t","cwd":"/tmp","hook_event_name":"PreToolUse","tool_use_id":"x"}' \
  | node dist/index.js evaluate
# (no output = allow)
```

Then add a config and check it compiles cleanly:

```bash
node dist/index.js verify
# exits non-zero if the config has errors — suitable for CI / pre-commit
```

## Building from source (contributors)

Only needed if you're changing fencepost itself. Requires [Bun](https://bun.sh):

```bash
git clone https://github.com/ch4nn0n/fencepost.git
cd fencepost
bun install
bun run build     # bundles src/ → dist/index.js and copies the wasm grammars
bun test
```

`dist/` is generated and not committed: `main` is source-only. On each release, the release workflow builds the bundle and publishes it to the `dist` branch, which is what plugin installs clone.

## Next

Head to the **[Quick start](./quick-start.md)** to write your first config.
