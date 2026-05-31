# Feature 06: Audit Logger

## Summary

Append a JSONL entry for every tool evaluation to `.claude/fencepost/logs/audit.jsonl`. The audit log enables the `/audit` skill to analyse patterns and suggest config improvements.

## Interface

```typescript
function writeAuditEntry(entry: AuditEntry, logPath: string): Promise<void>;
```

## Log Location

Under the fencepost data dir: `.claude/fencepost/logs/audit.jsonl` relative to the project root (resolved from the hook input's `cwd`). The `logs/` directory is created on first write.

## Entry Schema

```typescript
interface AuditEntry {
  ts: string;              // ISO 8601 timestamp
  sid: string;             // session_id
  tool: string;            // tool_name
  input: string;           // For Bash: the command. For others: summary of tool_input
  decision: Decision;      // allow, deny, ask
  reason: string;          // Human-readable explanation
  rule: string | null;     // Config path that matched (e.g., "bash.deny: git branch -D")
  tid: string;             // tool_use_id for correlation
  normalised?: string;     // Only for Bash, only if normalisation changed the command
}
```

## Example Entries

```jsonl
{"ts":"2026-04-14T21:30:00.000Z","sid":"sess-1","tool":"Bash","input":"kubectl -n prod delete pod foo","normalised":"kubectl delete pod foo","decision":"ask","reason":"Command requires approval: kubectl delete","rule":"bash.ask: kubectl delete","tid":"toolu_01"}
{"ts":"2026-04-14T21:30:01.000Z","sid":"sess-1","tool":"Read","input":"{file_path:\"/src/index.ts\"}","decision":"allow","reason":"Tool allowed by rule","rule":"tools.allow: Read","tid":"toolu_02"}
{"ts":"2026-04-14T21:30:02.000Z","sid":"sess-1","tool":"Bash","input":"rm -rf /tmp/build","decision":"deny","reason":"Recursive delete is dangerous","rule":"bash.checks: \\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*\\s+|--recursive)","tid":"toolu_03"}
```

## What Gets Logged

**All decisions** are logged, including allows. This enables the audit skill to identify:
- Frequently asked tools that could be promoted to allow
- Deny rules that never fire (dead rules)
- Allow rules covering tools that are never used

## Input Summary for Non-Bash Tools

For non-Bash tools, the `input` field contains a summary of `tool_input`:
- Truncated to 200 characters
- Sensitive fields (if any) should be redacted in future iterations
- Format: JSON stringification of tool_input, truncated

## Error Handling

- **Fire-and-forget**: if the audit write fails (permissions, disk full, etc.), swallow the error silently
- Never block or delay the permission decision for audit logging
- The hook must always return the decision promptly

## Log Rotation

Out of scope for v1. The JSONL file will grow unbounded. Future work could add:
- Size-based rotation
- Time-based rotation
- A `fencepost log prune` command

## Acceptance Criteria

- [ ] Appends valid JSONL to the audit file
- [ ] Creates the audit file if it doesn't exist
- [ ] Includes all required fields in each entry
- [ ] Never blocks or delays the permission decision
- [ ] Handles write failures gracefully (no crash, no error output)
- [ ] Bash commands include normalised form when different from original
