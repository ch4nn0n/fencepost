# Feature 01: Project Scaffold and Entry Point

## Summary

Initialize the Bun TypeScript project and create the main entry point that reads stdin from the Claude Code PreToolUse hook, runs the evaluation pipeline, and writes the decision to stdout.

## Requirements

- Bun project with `package.json`, `tsconfig.json` (strict mode), `bunfig.toml`
- `bin` entry in `package.json` pointing to `src/index.ts`
- Entry point reads JSON from stdin, calls the evaluation pipeline, writes JSON to stdout, exits 0
- **Fail-open**: any unhandled error exits 0 with no output (which means "allow" to Claude Code). A broken permission checker must not lock the user out.

## Entry Point Flow (`src/index.ts`)

```
stdin (JSON) -> parse HookInput -> loadConfig(cwd) -> evaluate(input, config) -> formatOutput(result) -> writeAudit(entry) -> stdout (JSON)
```

The entry point is deliberately thin. All logic lives in dedicated modules.

## Hook Input (from Claude Code)

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test", "description": "Run tests" },
  "tool_use_id": "toolu_01ABC123"
}
```

## Hook Output (to Claude Code)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Explanation",
    "additionalContext": "Context for Claude (optional)"
  }
}
```

- For `deny`: `permissionDecisionReason` is shown to Claude (include the alternative here)
- For `ask`: `permissionDecisionReason` is shown to the user
- For `allow`: `permissionDecisionReason` is shown to the user
- Exit 0 with no output = allow

## Project Structure

```
fencepost/
  package.json
  tsconfig.json
  bunfig.toml
  src/
    index.ts              # Entry point
    types.ts              # All TypeScript interfaces
    config.ts             # Config loader
    evaluate.ts           # Top-level evaluator
    tool-matcher.ts       # Non-Bash tool matching
    bash/
      normalise.ts        # Command normalisation
      evaluate.ts         # Bash command evaluation
    audit/
      logger.ts           # Audit log writer
      analyse.ts          # Audit log analyser
      skill.ts            # /audit skill entry point
    util/
      glob.ts             # Glob-to-regex for tool names
      prefix-match.ts     # Prefix matching with word boundary
      stdin.ts            # Read and parse stdin
  test/
    fixtures/
```

## Dependencies

- `js-yaml` - YAML parsing (runtime)
- `@types/js-yaml` - types (dev)
- `bun:test` - built-in test runner (dev)
- No other runtime dependencies. Keep it lean for a hook that runs on every tool call.

## Acceptance Criteria

- [ ] `echo '{"tool_name":"Read","tool_input":{},"session_id":"test","cwd":"/tmp","hook_event_name":"PreToolUse","tool_use_id":"x"}' | bun run src/index.ts` produces valid JSON output (or no output for allow)
- [ ] Invalid JSON on stdin exits 0 with no output (fail-open)
- [ ] Missing config file exits 0 with no output (fail-open)
- [ ] Process completes in under 100ms for typical invocations
