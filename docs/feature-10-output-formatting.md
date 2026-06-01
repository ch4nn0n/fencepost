# Feature 10: Output Formatting

## Summary

Define how `EvalResult` maps to the Claude Code `hookSpecificOutput` JSON. The goal is to craft output that makes Claude act on the decision effectively - especially for denials with alternatives.

## Hook Output Schema (Claude Code)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "shown to user (allow/ask) or Claude (deny)",
    "additionalContext": "injected into Claude's context (optional)",
    "updatedInput": { "...": "rewritten tool input (optional)" }
  }
}
```

Key behaviours:
- **deny**: `permissionDecisionReason` is shown **to Claude** (not the user). This is how we steer Claude toward alternatives.
- **allow**: `permissionDecisionReason` is shown to the user. Keep it brief or omit.
- **ask**: `permissionDecisionReason` is shown to the user as context for their approval decision.
- **updatedInput**: when present, the tool runs against this rewritten input instead of the original. Used by the /tmp redirect (see `feature-15-claude-files.md`); applied on `allow`/`ask`, ignored on `deny`.

## Formatting by Decision Type

### Allow

No output needed. Exit 0 with empty stdout = allow. This is the fast path.

The one exception is an allow whose input was rewritten by redirection: then fencepost must emit an explicit allow output to carry `updatedInput`, since empty stdout would lose the rewrite:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": { "command": "rm -rf /tmp/claude/build" }
  }
}
```

### Deny (simple - no alternative)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: command 'git branch -D' is not permitted."
  }
}
```

Claude sees the reason and knows to stop. Prefix with "Fencepost:" for transparency.

### Deny (with alternative)

This is the critical case. The reason must guide Claude to retry with the alternative.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: blocked — Recursive delete is dangerous. Use this instead: Delete specific files individually",
    "additionalContext": "The previous command was blocked by a fencepost permission rule. Do not retry the same command. Use the suggested alternative approach."
  }
}
```

Format: `Fencepost: blocked — {description}. Use this instead: {alternative}`

The `additionalContext` reinforces that Claude should not retry the same command.

### Deny (compound command - specific sub-command blocked)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Fencepost: blocked — compound command contains 'rm -rf /tmp/build' which is not permitted (Recursive delete is dangerous). Use this instead: Delete specific files individually. Run commands separately rather than chaining with &&.",
    "additionalContext": "The previous compound command was blocked because one part violated a permission rule. Break compound commands into separate tool calls so each can be evaluated independently."
  }
}
```

The `additionalContext` nudges Claude to avoid compounds in future, making evaluation simpler.

### Ask

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Fencepost: 'git push origin main' requires approval."
  }
}
```

The user sees this and decides. Keep it factual.

### Ask (compound - one sub-command needs approval)

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "Fencepost: compound command contains 'git push' which requires approval."
  }
}
```

## Implementation

```typescript
function formatOutput(result: EvalResult): HookOutput | null {
  // Fast path: allow with no explicit match -> no output
  if (result.decision === "allow") return null;

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: result.decision,
      permissionDecisionReason: formatReason(result),
    }
  };

  if (result.decision === "deny" && result.alternative) {
    output.hookSpecificOutput.additionalContext =
      "The previous command was blocked by a fencepost permission rule. " +
      "Do not retry the same command. Use the suggested alternative approach.";
  }

  if (result.compound) {
    output.hookSpecificOutput.additionalContext =
      (output.hookSpecificOutput.additionalContext || "") +
      " Break compound commands into separate tool calls so each can be evaluated independently.";
  }

  return output;
}

function formatReason(result: EvalResult): string {
  const prefix = "Fencepost:";

  if (result.decision === "deny") {
    let reason = `${prefix} blocked — ${result.reason}`;
    if (result.alternative) {
      reason += `. Use this instead: ${result.alternative}`;
    }
    if (result.compound) {
      reason = `${prefix} blocked — compound command contains '${result.offendingPart}' which is not permitted (${result.reason}).`;
      if (result.alternative) reason += ` Use this instead: ${result.alternative}.`;
      reason += " Run commands separately rather than chaining with &&.";
    }
    return reason;
  }

  if (result.decision === "ask") {
    if (result.compound) {
      return `${prefix} compound command contains '${result.offendingPart}' which requires approval.`;
    }
    return `${prefix} '${result.matchedInput}' requires approval.`;
  }

  return "";
}
```

## Acceptance Criteria

- [ ] Allow decisions produce no output (fast path) or minimal JSON
- [ ] Deny reasons are prefixed with "Fencepost:" for transparency
- [ ] Deny with alternative includes the alternative in the reason text
- [ ] Deny with alternative includes `additionalContext` steering Claude away from retry
- [ ] Compound denials reference the specific offending sub-command
- [ ] Compound denials nudge Claude to use separate tool calls
- [ ] Ask decisions show factual reason to the user
- [ ] All output is valid JSON matching the hookSpecificOutput schema
