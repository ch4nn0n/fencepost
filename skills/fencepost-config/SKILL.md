---
name: fencepost-config
description: Set up and maintain a user's fencepost config file(s) across their whole lifecycle — scaffold a new .claude/fencepost.yaml (project or user-level), choose preset imports and single-file vs conf.d layout, tune top-level knobs (default, onError, guidance, redirect, secrets), and on an ongoing basis promote noisy ask-rules to allow, tighten rules that are too loose, prune dead rules, and debug why a specific command was allowed/asked/denied. Use for first-time setup and for day-to-day rule tuning alike, including "fencepost keeps asking me about X", "why did fencepost block this", or "apply what the audit suggested". For generating a full rule set for one CLI/MCP tool from its command surface, use fencepost-preset instead.
---

Own the fencepost config file across its whole life: creating it (day 1) and continuously tuning it as rules prove too noisy, too loose, or dead (day 2). Both halves edit the same file with the same validation loop, which is why they live together here.

**Boundaries.** Adding or changing a rule or two, promoting an ask to allow, tightening something risky — that is this skill. Generating a whole rule set for a tool by enumerating its command surface is `/fencepost-preset` (heavy discovery flow; don't invoke it just to allow one command). Reading the audit report is `/fencepost-audit`; *acting* on what it suggests is this skill.

## 1. See what is actually active

Never infer the active config from a file you happened to find — run the resolver:

```bash
node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js config
# dev clone: bun run src/index.ts config
```

It prints the source files, errors/warnings, and the fully-merged effective config.

**Resolution is first-match-wins, not additive.** Fencepost checks `{cwd}/.claude/fencepost/config/` → `{cwd}/.claude/fencepost.yaml` → `~/.claude/fencepost/config/` → `~/.claude/fencepost.yaml` and uses **only the first one found**. Layers do not merge with each other. Creating a project config therefore silently disables the user's `~/.claude` rules for that project — they are not inherited. Flag this to the user before creating a project config over an existing user-level one; it is the single most common surprise.

The additive mechanism is `import:` — bundled presets (or the reserved `user` token, or `all` for every bundled preset) merge as a base layer beneath the host file's own rules, which win on conflict. If the user wants their personal rules plus project rules, add `import: [user]` to the project file instead of copying rules in by hand.

## 2. Day 1 — scaffold

**Scope.** Project (`.claude/fencepost.yaml`, committable, shared with the team) or user-level (`~/.claude/fencepost.yaml`, personal, applies wherever no project config exists). Ask if not obvious.

**Layout.** Single file until it covers more than a couple of concerns; then a `fencepost/config/` directory whose `*.yaml` files all merge (e.g. `presets.yaml`, `git.yaml`, `secrets.yaml`). Converting: create the directory, split the sections out, then delete the old single file — a conf.d directory outranks it at the same level, so a leftover file is dead weight that misleads the next reader.

**Presets.** Enumerate them rather than reciting from memory (the set grows):

```bash
ls "${CLAUDE_PLUGIN_ROOT}"/presets/*.yaml   # dev clone: ls presets/*.yaml
```

`import: [all]` takes every bundled preset. Start there if the user wants broad coverage, then narrow. `import: [user]` pulls in the user's own `~/.claude` config as a base layer, for a project config that should extend personal rules rather than shadow them.

**Knobs.** Touch only what the user asks for or what is needed for a working config:

- `default` — fallthrough when nothing matches. Leave at `ask`. **Never change this as a side effect of an unrelated request**; it is the user's core posture decision.
- `onError` — posture when fencepost itself fails (e.g. unparseable Bash). `ask` normally; `allow` only for headless/CI setups the user names. An *invalid* config always fails closed regardless.
- `guidance.extra` — extra lines injected into Claude's SessionStart context.
- `redirect.tmp` / `redirect.tmpTarget` — sandbox bare `/tmp` writes.
- `secrets.*` — enable via `secrets.enabled: true` or `import: [secrets]`. Prefer `secrets.allow.paths` / `secrets.allow.rules` for known-safe exemptions (test fixtures) over disabling scanning.

## 3. Day 2 — tune

**"Fencepost keeps asking me about X."** Confirm the frequency with `/fencepost-audit` (its promotion candidates are ranked by ask-count across sessions), then move the prefix into `tools.bash.allow` — narrowest form that covers the real usage. Prefer `docker compose ps` over `docker`. Read-only/idempotent commands are safe to promote; anything that mutates remote state, spends money, or executes arbitrary code should stay `ask` even when it is noisy.

**"Why did fencepost do that?"** Replay the exact decision:

```bash
node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js evaluate < payload.json
```

where `payload.json` is `{"tool_name":"Bash","tool_input":{"command":"<cmd>"},"cwd":"<abs path>"}`. The output names the decision and the matched rule.

> **Use a file, not `echo '...' | evaluate`.** The command text sits on your shell command line as an argument, so fencepost's own rules match it and block the probe — testing a force-push rule trips the force-push rule. Writing the payload to a file keeps the text off the command line. This bites hardest on exactly the dangerous commands most worth testing.

Note that `evaluate` prints a decision for **every** outcome including `allow`; empty output means something went wrong, not that the command was permitted.

**Dead and over-broad rules.** `/fencepost-audit` lists rules that have never matched. Before deleting one, check it is genuinely dead rather than merely guarding something rare — a `checks` rule for `rm -rf /` *should* never fire. Delete stale prefixes for tools no longer used; keep dormant safety rules.

**Tightening.** When a rule proved too loose, prefer a `tools.bash.checks` regex entry with a `description` (why it is dangerous) and an `alternative` (the safer path) over a bare `deny` — the model gets actionable feedback instead of a wall.

## 4. Validate every change

```bash
node "${CLAUDE_PLUGIN_ROOT}"/dist/index.js verify   # non-zero exit if the config has errors
```

Check `ok`, confirm the effective config matches intent, and re-run the `evaluate` probe for the specific command that prompted the change. Never leave a config that fails `verify` — an invalid config fails closed and blocks every tool call.

## 5. Hand off

- Full rule set for one CLI/MCP tool from its real command surface → `/fencepost-preset`
- Report on how existing rules have been firing → `/fencepost-audit`
- Share a rule set upstream as a bundled preset → `/fencepost-contribute`
