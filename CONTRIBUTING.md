# Contributing to fencepost

Thanks for your interest in improving fencepost! This guide covers the basics.

## Development setup

fencepost uses [Bun](https://bun.sh). Node is not required.

```bash
git clone https://github.com/ch4nn0n/fencepost.git
cd fencepost
bun install
```

## Workflow

```bash
bun test             # run the test suite (bun:test)
bun run typecheck    # tsc --noEmit
bun run build        # bundle src/ → dist/index.js (+ wasm grammars)
bun run dev          # run the entry point directly
```

Before opening a pull request, make sure:

- `bun test` passes (and add tests for new behaviour — the suite lives in [`test/`](./test)).
- `bun run typecheck` is clean.
- `bun run build` succeeds, and you've **committed the updated `dist/`** (it's the artifact the plugin ships, so CI fails if it's stale).

CI runs all of these on every push and pull request.

## Project layout

| Path | What |
|------|------|
| `src/` | The evaluation engine (config loader, tool matcher, bash AST pipeline, audit). |
| `presets/` | Bundled importable rule sets (`git`, `kubernetes`, …). |
| `hooks/` | Thin shell wrappers the plugin manifest points at. |
| `skills/` | The `/audit`, `/preset`, and `/contribute-preset` slash commands. |
| `test/` | `bun:test` suites and fixtures. |
| `docs/` | The Docusaurus documentation site. |

## Adding or changing a preset

Presets are plain YAML in [`presets/`](./presets). Keep them focused on a single tool, and **do not set `default`** — that belongs to the user's own config. Every preset needs a `meta:` block (`title` + `description`); the docs site generates a page per preset from it (plus the full YAML source) at build time, so there is no docs table to maintain.

The fastest path is the `/contribute-preset` skill: it reads a tool's real command surface, classifies it, writes the preset and docs, validates, and opens the PR for you. (Use `/preset` to generate rules for your own config without contributing them.) Either way, **verify subcommands against the installed binary rather than from memory** — they vary by version.

## Documentation

User-facing docs live in [`docs/`](./docs) (Docusaurus). To preview changes:

```bash
cd docs
bun install
bun start
```

Merges to `main` that touch `docs/**` auto-deploy to GitHub Pages.

## License

By contributing, you agree that your contributions are licensed under the project's [GNU GPL v3](./LICENSE).
