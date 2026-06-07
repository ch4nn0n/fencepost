---
title: Installation
description: Install fencepost as a Claude Code plugin and build the binary.
---

# Installation

fencepost ships as a Claude Code plugin: a small manifest that registers the hooks, a compiled binary, and a bundled set of presets.

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code)
- [Bun](https://bun.sh) — only to **build** the binary. Once compiled, the binary is self-contained and needs no runtime.

## 1. Get the source

```bash
git clone https://github.com/ch4nn0n/fencepost.git
cd fencepost
bun install
```

## 2. Build the binary

```bash
bun run build
# → bin/fencepost  (standalone, no Bun/Node required at runtime)
```

The build uses `bun build --compile`, producing a single executable. Keeping it dependency-free matters: the hook runs on *every* tool call, so cold-start time is part of the budget.

## 3. Install as a plugin

fencepost follows the standard Claude Code plugin layout:

```
fencepost/
├── .claude-plugin/
│   └── plugin.json          # registers PreToolUse + SessionStart hooks
├── hooks/
│   ├── pre-tool-use.sh      # thin wrapper → bin/fencepost evaluate
│   └── session-start.sh     # → bin/fencepost sessionstart
├── bin/fencepost            # the compiled binary
├── presets/                 # bundled importable rule sets
└── skills/audit.md          # the /audit slash command
```

Point Claude Code at the plugin directory (clone location). The manifest registers two hooks:

- **`PreToolUse`** → evaluates each tool call.
- **`SessionStart`** → injects [session guidance](../configuration/guidance-and-chaining.md) and prepares the `/tmp/claude` sandbox.

The hook entries call thin shell wrappers rather than the binary directly. Each wrapper resolves the binary relative to its own location and exports `FENCEPOST_PRESETS_DIR` so bundled presets resolve no matter where the plugin lives:

```bash title="hooks/pre-tool-use.sh"
#!/usr/bin/env bash
HERE="$(dirname "$0")"
export FENCEPOST_PRESETS_DIR="${FENCEPOST_PRESETS_DIR:-$HERE/../presets}"
exec "$HERE/../bin/fencepost" evaluate
```

## 4. Verify it works

With no config present, fencepost is a no-op (it [fails open](../concepts/failure-posture.md) to `default: ask`). Confirm the binary runs:

```bash
echo '{"tool_name":"Read","tool_input":{},"session_id":"t","cwd":"/tmp","hook_event_name":"PreToolUse","tool_use_id":"x"}' \
  | ./bin/fencepost evaluate
# (no output = allow)
```

Then add a config and check it compiles cleanly:

```bash
./bin/fencepost verify
# exits non-zero if the config has errors — suitable for CI / pre-commit
```

## Next

Head to the **[Quick start](./quick-start.md)** to write your first config.
