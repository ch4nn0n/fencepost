---
name: contribute-preset
description: Package a fencepost rule set as a shareable bundled preset and open a pull request to the fencepost repository (fork, branch, commit, gh pr create). Use when a user wants to share their permission rules with others or contribute a preset upstream.
---

Turn a rule set the user has (authored with `/preset`, or an existing preset they point at) into a bundled preset under `presets/` and open a pull request to `ch4nn0n/fencepost`. This is the sharing counterpart to `/preset`, which only writes the user's own local config.

Requires the `gh` CLI to be authenticated (`gh auth status`).

## 1. Gather the rules and pick a name

- Source the rules from the user's `.claude/fencepost.yaml` (the rules for the tool being shared) or an existing `presets/*.yaml` they name.
- Choose a preset `name` matching `^[a-zA-Z0-9_-]+$` (one tool per preset, e.g. `gh`, `terraform`).
- If the rules were generated from a binary, note the tool version they were verified against — it belongs in the PR body.

## 2. Get a working clone of the repo

- If the current directory is already a clone of `ch4nn0n/fencepost`, work there on a fresh branch.
- Otherwise fork and clone: `gh repo fork ch4nn0n/fencepost --clone` (this is a write, so it will prompt). Then `bun install`.

## 3. Create `presets/<name>.yaml`

- Open with the standard header comment used by the other presets: the title, an `# Import with:` example, and a short note on what the preset allows / asks / denies.
- Convert the user's `tools.bash.*` (or `tools.*` for MCP) rules into the preset body.
- **Do not set `default`** — presets never do; that belongs to the importing user's config.
- Keep it focused on the single tool.

## 4. Update the docs

Per `CONTRIBUTING.md`, document the new preset:

- Add a row to the "Bundled presets" table in `docs/docs/presets.md`.
- Add the name to the `## Bundled presets` list in `README.md`.

## 5. Validate before opening the PR

Follow the checks in `CONTRIBUTING.md`:

```bash
bun test          # add a test asserting the preset resolves (mirror test/config-import.test.ts)
bun run typecheck
bun run build     # commit the updated dist/ only if it actually changed
```

Add a small test that imports the new preset and asserts a representative rule resolves, alongside the existing import tests in `test/config-import.test.ts`.

## 6. Open the pull request

- Branch off `main`, e.g. `feat/preset-<name>`.
- The repo lints PR titles as Conventional Commits, so use a conforming title: `feat: add <name> preset`.
- `gh pr create` (a write — it will prompt) with a body that covers: what the preset gates, the **tool version** its command surface was verified against, and the allow/ask/deny rationale.
- Share the resulting PR URL with the user.
