---
title: Installation
description: Install fencepost as a Claude Code plugin.
---

# Installation

fencepost ships as a Claude Code plugin: a manifest that registers the hooks, a small prebuilt JS bundle (committed on the `dist` branch that installs are served from, while `main` stays source-only), the tree-sitter grammars, and a set of presets. There's **no build step for users** and no 100 MB binary to download.

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code)
- A JavaScript runtime on your `PATH` — **Node** (which you already have if you run Claude Code via npm) or **Bun**. The hook wrapper uses whichever it finds.

## Install from the marketplace (recommended)

fencepost's repository doubles as a single-plugin marketplace, so you can add it and install in two commands:

```text
/plugin marketplace add ch4nn0n/fencepost
/plugin install fencepost@fencepost
```

That's it — the plugin is fetched and cached, the `PreToolUse`, `PostToolUse` and `SessionStart` hooks register, and the gate is live on the next tool call. Update later with `/plugin marketplace update fencepost`.

## Run Claude with fencepost as the gate (recommended)

fencepost is meant to be your permission layer: run Claude Code with `claude --permission-mode bypassPermissions` so its native prompts stand down and fencepost's `allow`/`ask`/`deny` decide every call. See **[Permission modes](../concepts/permission-modes.md)** for why, and for the safety caveats that come with that mode.

## Try it locally without installing

To test against a clone (for development, or before committing to installing), build the bundle first (`main` is source-only, so a fresh clone has no `dist/`; this needs [Bun](https://bun.sh)), then point Claude Code at the directory:

```bash
git clone https://github.com/ch4nn0n/fencepost.git
cd fencepost
bun install
bun run build     # produces dist/index.js and the wasm grammars
cd ..
claude --permission-mode bypassPermissions --plugin-dir ./fencepost
```

## What's in the plugin

```
fencepost/
├── .claude-plugin/
│   ├── plugin.json          # registers the PreToolUse, PostToolUse + SessionStart hooks
│   └── marketplace.json     # lets the repo be added as a marketplace
├── hooks/
│   ├── pre-tool-use.sh      # wrapper → node dist/index.js evaluate
│   ├── post-tool-use.sh     # wrapper → node dist/index.js posttooluse
│   └── session-start.sh     # → node dist/index.js sessionstart
├── dist/
│   ├── index.js             # the prebuilt JS bundle (~300 KB)
│   └── *.wasm               # tree-sitter grammars
├── presets/                 # bundled importable rule sets
└── skills/                  # /audit, /preset and /contribute-preset
    ├── audit/SKILL.md
    ├── preset/SKILL.md
    └── contribute-preset/SKILL.md
```

The three hooks:

- **`PreToolUse`** → evaluates each tool call.
- **`PostToolUse`** → redacts [secrets](../configuration/secrets.md) from tool output.
- **`SessionStart`** → injects [session guidance](../configuration/guidance-and-chaining.md) and prepares the `/tmp/claude` sandbox.

The manifest points at thin shell wrappers rather than the bundle directly. Each wrapper finds a runtime, resolves the bundle relative to its own location, and exports `FENCEPOST_PRESETS_DIR` so bundled presets resolve no matter where the plugin is installed:

```bash title="hooks/pre-tool-use.sh"
#!/usr/bin/env bash
HERE="$(cd "$(dirname "$0")" && pwd)"
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
RUNNER="$(command -v node || command -v bun || true)"
if [ -z "$RUNNER" ]; then
  echo "fencepost: no 'node' or 'bun' runtime found on PATH; skipping check" >&2
  exit 0 # fail open: never block Claude Code just because we can't run
fi
exec "$RUNNER" "$HERE/../dist/index.js" evaluate
```

## Verify it works

With no config present, everything falls through to `default: ask` (see [failure posture](../concepts/failure-posture.md)). You can run the bundle directly to confirm:

```bash
echo '{"tool_name":"Read","tool_input":{},"session_id":"t","cwd":"/tmp","hook_event_name":"PreToolUse","tool_use_id":"x"}' \
  | node dist/index.js evaluate
```

which prints an explicit `ask` decision:

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Fencepost: 'Read' requires approval."}}
```

fencepost always emits an explicit decision, even for `allow`: an explicit allow is what suppresses Claude Code's native prompt.

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

`dist/` is generated and not committed: `main` is source-only. On each release, the release workflow builds the bundle and publishes it to the `dist` branch (latest, what plugin installs clone) and an immutable `dist-vX.Y.Z` tag per release.

### Pinning a version

Installs track the `dist` branch, i.e. the latest release. To pin a specific release, point a plugin source at its `dist-vX.Y.Z` tag instead:

```json
{
  "source": "github",
  "repo": "ch4nn0n/fencepost",
  "ref": "dist-v0.1.0"
}
```

## Next

Head to the **[Quick start](./quick-start.md)** to write your first config.
