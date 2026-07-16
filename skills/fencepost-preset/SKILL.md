---
name: fencepost-preset
description: Build fencepost permission rules for a CLI tool or MCP server by discovering its real command surface (from the installed binary or the live MCP tool list), classifying each command into allow/ask/deny, and merging the result into the user's own .claude/fencepost.yaml. Use when a user wants to gate a new tool, generate a permission file, or asks how to allow/ask/block a tool's commands.
---

Generate a fencepost rule set for a tool the user names, grounded in the tool's **actual** surface (never guessed from memory), and merge it into their own config. Tool versions add, rename, and remove subcommands, so a rule list invented from training data will be wrong; the whole point of this skill is to read the real surface first.

If the user did not name a target, ask which CLI tool or MCP server they want to gate.

## 1. Identify the target and its type

- **CLI binary** (e.g. `gh`, `docker`, `terraform`, `aws`) → rules live under `tools.bash` and match command **prefixes**.
- **MCP server** (tools named `mcp__<server>__<action>`) → rules live under `tools` (top level) and match tool **names** with globs.

## 2. Discover the real surface — do NOT rely on memory

**For a CLI binary:**

1. Confirm it is installed and record the version: `<tool> --version`.
2. Enumerate top-level commands: `<tool> --help`.
3. For every command group, enumerate its subcommands: `<tool> <group> --help`.
4. Collect the exact, verified command paths. When `--help` exits non-zero for a real subcommand (some pass `--help` through to a child), treat the parent group's listing as authoritative rather than the probe.

**For an MCP server:**

- The connected server's tool names are already visible to you this session (they appear as `mcp__<server>__<action>` in the tool list / system reminders). Enumerate them from there. If the server is not connected, ask the user to enable it or paste its tool list.
- Match with a glob that survives different namespacing, mirroring the bundled `context7` / `playwright` presets: `mcp__*<server>*<action>` (e.g. `mcp__*playwright*browser_click`).

## 3. Classify each command into a tier

Propose a tier for every discovered command, then **show the user the full classification for review before writing anything** — let them move items between tiers.

- **allow** — read-only / inspection / idempotent reads: `list`, `get`, `view`, `status`, `diff`, `describe`, `logs`, `search`, `verify`. Safe to run silently.
- **ask** — anything that writes or mutates remote/cluster/account state, spends money, runs workflows or jobs, changes local credentials or config, opens a session, or executes arbitrary code.
- **checks** (deny with guidance) — irreversible or catastrophic actions: deleting a repo / database / namespace, force operations, recursive wipes. Each entry is a regex `test:` with a `description` (why it's dangerous) and an `alternative` (the safer path to steer toward).

Use `tools.bash.normalise` to strip volatile flags (`-n <ns>`, `--context <x>`, `-R owner/repo`) so a prefix rule matches regardless of where the flag sits. For MCP, the dangerous-tool tier is `tools.deny` (objects with `tool` + `description` + optional `alternative`).

Anything you leave unlisted falls through to the user's `default`; prefer that over guessing a tier you are unsure about.

## 4. Write into the user's config

- Target `.claude/fencepost.yaml` (create it if absent). If the project already uses a `.claude/fencepost/config/` directory, add a focused file there instead (e.g. `config/<tool>.yaml`).
- **Merge** into the existing sections; do not clobber rules the user already has.
- **Never set `default`** — that is the user's to own.
- CLI rules go under `tools.bash` (`allow` / `ask` / `checks` / `normalise`). MCP rules go under `tools` (`allow` / `ask` / `deny`).

## 5. Validate

Use the bundled CLI to confirm the merge resolved cleanly and the decisions land as intended (in an installed plugin: `node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js`; in a development clone: `bun run src/index.ts` or `node dist/index.js`):

```bash
# Confirm the config is valid and see the effective merged rules + provenance.
node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js verify

# Spot-check specific commands. Empty output means "allow" (silent fast path);
# an "ask"/"deny" decision prints a JSON permissionDecision.
echo '{"tool_name":"Bash","tool_input":{"command":"<tool> <subcommand> ..."},"cwd":"'"$PWD"'"}' \
  | node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js evaluate
```

Run a representative command from each tier (one allow, one ask, one deny) and confirm the result.

## 6. Summarise

Report what was added per tier, the tool version the surface was read from, and the reminder that unlisted subcommands fall through to `default`. If the user wants to share these rules as a reusable preset for others, point them at the `/fencepost-contribute` skill.
