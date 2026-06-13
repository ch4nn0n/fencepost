# fencepost

**A configurable permission gate for every Claude Code tool call.**

[![CI](https://github.com/ch4nn0n/fencepost/actions/workflows/ci.yml/badge.svg)](https://github.com/ch4nn0n/fencepost/actions/workflows/ci.yml)
[![Docs](https://github.com/ch4nn0n/fencepost/actions/workflows/docs.yml/badge.svg)](https://ch4nn0n.github.io/fencepost/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)

fencepost installs as a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin and runs on the `PreToolUse` hook (plus `PostToolUse` for secrets redaction), so it sees **every tool call before it happens** and evaluates it against a YAML rule set you control. Each call resolves to one of three decisions:

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
- **Secrets protection.** Using whichever of gitleaks / trufflehog / detect-secrets you have installed, fencepost denies tool inputs that embed credentials and redacts secrets from tool output before they reach the model.
- **Fail-closed safety.** A broken security config denies everything until a human fixes it, rather than silently degrading.
- **An audit trail.** Every decision is logged; the `/audit` skill turns real usage into concrete config suggestions.

fencepost ships as a small committed JS bundle (~280 KB plus the tree-sitter grammars), so there's no build step for users and no large binary to download. It runs on **Node** (which you already have if you run Claude Code via npm) or **Bun**.

## Install

The repository doubles as a single-plugin marketplace:

```text
/plugin marketplace add ch4nn0n/fencepost
/plugin install fencepost@fencepost
```

The hooks register and the gate is live on the next tool call. To try it against a clone without installing:

```bash
git clone https://github.com/ch4nn0n/fencepost.git
claude --plugin-dir ./fencepost
```

See the [installation guide](https://ch4nn0n.github.io/fencepost/docs/getting-started/installation) for details.

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

`claude` · `claude-web` · `git` · `gh` · `kubernetes` · `helm` · `helmfile` · `ansible` · `context7` · `playwright` · `filesystem` · `python-safety` · `secrets`

See the [preset reference](https://ch4nn0n.github.io/fencepost/docs/presets).

## Development

```bash
bun install
bun test             # run the test suite
bun run typecheck    # tsc --noEmit
bun run build        # bundle src/ → dist/index.js (+ wasm grammars)
bun run dev          # run the entry point directly
```

`dist/` is committed on purpose — it's the artifact the plugin ships — so rebuild and commit it whenever you change `src/`.

The documentation site lives in [`docs/`](./docs) (Docusaurus):

```bash
cd docs
bun install
bun start            # dev server with HMR
bun run build        # static site → docs/build/
```

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please). Write [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, …); release-please maintains a **release PR** that bumps the version (in both `package.json` and `.claude-plugin/plugin.json`) and updates `CHANGELOG.md`. Merging that PR tags the release and publishes a ready-to-install plugin archive.

## License

[GNU General Public License v3.0](./LICENSE) or later.
