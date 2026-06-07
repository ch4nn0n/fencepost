# fencepost

**A configurable permission gate for every Claude Code tool call.**

[![CI](https://github.com/ch4nn0n/fencepost/actions/workflows/ci.yml/badge.svg)](https://github.com/ch4nn0n/fencepost/actions/workflows/ci.yml)
[![Docs](https://github.com/ch4nn0n/fencepost/actions/workflows/docs.yml/badge.svg)](https://ch4nn0n.github.io/fencepost/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

fencepost installs as a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin and runs on the `PreToolUse` hook, so it sees **every tool call before it happens** and evaluates it against a YAML rule set you control. Each call resolves to one of three decisions:

| Decision | What happens | Reason shown to |
|----------|--------------|-----------------|
| **allow** | The tool runs, silently (fast path). | — |
| **ask** | Claude Code prompts you to approve. | You |
| **deny** | The tool is blocked, with an actionable alternative. | Claude |

A denial isn't a dead end: fencepost steers Claude toward the suggested alternative instead of letting it retry the same wall.

> 📖 **Full documentation: [ch4nn0n.github.io/fencepost](https://ch4nn0n.github.io/fencepost/)**

## Why

- **Curated, shareable rules.** Import battle-tested rule sets for `git`, `kubernetes`, `helm`, `ansible`, `filesystem` and more with one line.
- **Real bash understanding.** Commands are parsed with tree-sitter, not pattern-matched — fencepost reasons about redirections, every argument, compound commands, and even inline `python -c` / `node -e` snippets.
- **A scratch sandbox.** Funnel temp files into `/tmp/claude` and scope destructive permissions to it; the rest of the filesystem stays gated.
- **Fail-closed safety.** A broken security config denies everything until a human fixes it, rather than silently degrading.
- **An audit trail.** Every decision is logged; the `/audit` skill turns real usage into concrete config suggestions.

No runtime dependencies — fencepost compiles to a single self-contained binary.

## Install

### From a release (no Bun required)

Download the archive for your platform from the [Releases](https://github.com/ch4nn0n/fencepost/releases) page. Each archive is a ready-to-install plugin (binary + manifest + hooks + presets). Point Claude Code at the extracted directory.

### From source

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/ch4nn0n/fencepost.git
cd fencepost
bun install
bun run build        # → bin/fencepost (standalone)
```

Then point Claude Code at the repository directory; the plugin manifest registers the `PreToolUse` and `SessionStart` hooks.

## Quick start

Create `.claude/fencepost.yaml` in your project:

```yaml
import:
  - claude        # allow Claude's built-in tools + enable the /tmp sandbox
  - git           # sensible git porcelain rules

default: ask      # what to do when nothing matches
onError: ask      # what to do when a command can't be checked
```

That's enough to be useful:

```bash
git status            # → allow (silent)
git push origin main  # → ask   (you approve)
git push --force      # → deny  (steered to --force-with-lease)
```

Layer your own rules on top — imports are the base, your rules always win. See the [configuration guide](https://ch4nn0n.github.io/fencepost/docs/configuration/config-files).

## Bundled presets

`claude` · `claude-web` · `git` · `kubernetes` · `helm` · `helmfile` · `ansible` · `context7` · `filesystem` · `python-safety`

See the [preset reference](https://ch4nn0n.github.io/fencepost/docs/presets).

## Development

```bash
bun install
bun test             # run the test suite
bun run typecheck    # tsc --noEmit
bun run build        # compile the binary
bun run dev          # run the entry point directly
```

The documentation site lives in [`docs/`](./docs) (Docusaurus):

```bash
cd docs
bun install
bun start            # dev server with HMR
bun run build        # static site → docs/build/
```

## Releases

Pushing a `v*` tag triggers the [release workflow](./.github/workflows/release.yml), which cross-compiles binaries for Linux, macOS, and Windows (x64 + arm64) and attaches per-platform plugin archives to a GitHub Release.

```bash
git tag v0.1.0
git push origin v0.1.0
```

## License

[GNU General Public License v3.0](./LICENSE) or later.
