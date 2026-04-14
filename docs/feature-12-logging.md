# Feature 12: Debug Logging

## Summary

Structured debug logging via Pino, writing to stderr so it never interferes with the stdout JSON output that Claude Code reads. Controlled by `LOG_LEVEL` env var or `--verbose` flag.

## Why Pino

- Fast (important for a hook that runs on every tool call)
- Structured JSON output (parseable, greppable)
- Minimal overhead when disabled
- Well-established in the Node/Bun ecosystem

## Log Levels

| Level | When |
|-------|------|
| `silent` | Production default. No logs. |
| `error` | Config parse failures, invalid regex, unexpected exceptions |
| `warn` | Missing config file (falling back to defaults), skipped invalid conf.d file |
| `info` | Decision made (tool, decision, matched rule) |
| `debug` | Full evaluation trace: config loaded, normalisation steps, each rule checked |

## Configuration

```bash
# Via environment variable
LOG_LEVEL=debug echo '...' | fencepost evaluate

# Via flag
echo '...' | fencepost evaluate --verbose  # sets LOG_LEVEL=debug
```

Default: `silent` (no logs in normal operation).

## Output Target

**Always stderr.** The hook protocol uses stdout for the JSON decision. Any log output on stdout would corrupt the response.

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "silent",
  transport: {
    target: "pino-pretty",  // dev only, use raw JSON in prod
  },
}, pino.destination(2)); // fd 2 = stderr
```

## What Gets Logged

### Error level
```
{"level":"error","msg":"invalid regex in bash.checks[0]","pattern":"[invalid","file":"30-kubectl.yaml"}
{"level":"error","msg":"config parse failed","file":".claude/fencepost/broken.yaml","error":"YAML syntax error at line 5"}
```

### Warn level
```
{"level":"warn","msg":"no config found, using defaults","cwd":"/home/user/project"}
{"level":"warn","msg":"skipping invalid config file","file":"broken.yaml","error":"missing 'default' field"}
```

### Info level
```
{"level":"info","msg":"decision","tool":"Bash","command":"git push origin main","decision":"ask","rule":"bash.ask: git push"}
{"level":"info","msg":"decision","tool":"Read","decision":"allow","rule":"tools.allow: Read"}
```

### Debug level
```
{"level":"debug","msg":"config loaded","files":["00-defaults.yaml","10-tools.yaml"],"ruleCount":24}
{"level":"debug","msg":"routing to bash pipeline","command":"kubectl -n prod get pods"}
{"level":"debug","msg":"normalised","before":"kubectl -n prod get pods","after":"kubectl get pods"}
{"level":"debug","msg":"checking bash.deny","rule":"git branch -D","match":false}
{"level":"debug","msg":"checking bash.allow","rule":"kubectl get","match":true}
```

## Debugging Workflow

```bash
# Test a specific command with full trace
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /tmp/build"},"session_id":"test","cwd":".","hook_event_name":"PreToolUse","tool_use_id":"x"}' \
  | LOG_LEVEL=debug bun run src/index.ts

# stderr shows the full evaluation trace
# stdout shows the decision JSON (or empty for allow)
```

## Dependencies

- `pino` - structured logger (runtime)
- `pino-pretty` - human-readable formatting (dev dependency only)

## Acceptance Criteria

- [ ] Logs go to stderr, never stdout
- [ ] Default level is `silent` (no output in normal operation)
- [ ] `LOG_LEVEL` env var controls verbosity
- [ ] `--verbose` flag sets debug level
- [ ] Error level captures config/regex failures
- [ ] Debug level shows full evaluation trace
- [ ] Log output is structured JSON (parseable)
