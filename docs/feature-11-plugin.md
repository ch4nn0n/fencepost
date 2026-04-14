# Feature 11: Claude Code Plugin Packaging

## Summary

Package fencepost as a Claude Code plugin using the official plugin structure. Compile to a standalone binary with `bun build --compile` so there's no runtime dependency on Bun being installed.

## Plugin Directory Structure

```
fencepost/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest
├── hooks/
│   └── pre-tool-use.sh      # Thin wrapper that calls the compiled binary
├── skills/
│   └── audit.md             # /audit skill definition
├── bin/
│   └── fencepost            # Compiled Bun binary (built artifact)
├── src/                     # Source code
├── test/                    # Tests
├── package.json
└── README.md
```

## Plugin Manifest (`.claude-plugin/plugin.json`)

```json
{
  "name": "fencepost",
  "version": "0.1.0",
  "description": "Configurable permission checker for Claude Code tools",
  "hooks": {
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "{{PLUGIN_DIR}}/bin/fencepost evaluate",
            "timeout": 5
          }
        ]
      }
    ]
  },
  "skills": ["skills/audit.md"]
}
```

## Compiled Binary

Build with:
```bash
bun build --compile src/index.ts --outfile bin/fencepost
```

The binary is self-contained - no Bun, Node, or npm required at runtime. This is important for:
- Fast cold start (no JS runtime boot)
- Simple distribution (single binary)
- No dependency conflicts

## CLI Interface

The binary supports subcommands:

```bash
# Hook mode (default) - reads stdin, writes stdout
fencepost evaluate

# Audit mode - reads log, prints analysis
fencepost audit [--path .claude/fencepost-audit.jsonl]

# Config validation - loads and prints resolved config
fencepost config [--cwd /path/to/project]
```

## Hook Wrapper (`hooks/pre-tool-use.sh`)

Thin shell wrapper in case the plugin system needs a script rather than a direct binary:

```bash
#!/bin/bash
exec "$(dirname "$0")/../bin/fencepost" evaluate
```

## Audit Skill (`skills/audit.md`)

The skill definition file that registers `/audit` as a slash command:

```markdown
---
name: audit
description: Analyse fencepost permission decisions and suggest config improvements
---

Run the fencepost audit tool to analyse recent permission decisions.
Execute: {{PLUGIN_DIR}}/bin/fencepost audit
```

(Exact skill format TBD - depends on Claude Code skill registration spec.)

## Build & Distribution

```bash
# Build the binary
bun build --compile src/index.ts --outfile bin/fencepost

# Install as a plugin (mechanism TBD)
# Option A: clone/copy to ~/.claude/plugins/fencepost/
# Option B: claude plugin install ./fencepost
```

The `bin/` directory is gitignored. CI builds the binary for distribution.

## package.json Scripts

```json
{
  "scripts": {
    "build": "bun build --compile src/index.ts --outfile bin/fencepost",
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "audit": "bun run src/audit/skill.ts"
  }
}
```

During development, `bun run src/index.ts` is used directly. The compiled binary is for distribution.

## Acceptance Criteria

- [ ] `bun run build` produces a standalone binary at `bin/fencepost`
- [ ] Binary works without Bun installed
- [ ] `fencepost evaluate` reads stdin and writes stdout (hook mode)
- [ ] `fencepost audit` prints audit analysis (skill mode)
- [ ] `fencepost config` prints resolved config (debug mode)
- [ ] Plugin manifest is valid and registers the PreToolUse hook
- [ ] Plugin structure follows the Claude Code plugin convention
