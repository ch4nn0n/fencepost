# Feature 03: Tool Name Matcher

## Summary

Match non-Bash tool names against the config's deny/ask/allow lists using glob patterns. This is the evaluation path for all tools except Bash.

## Interface

```typescript
function matchTool(toolName: string, config: FencepostConfig): EvalResult;
```

## Matching Rules

Tool names are matched using simple glob patterns supporting `*` (any characters) and `?` (single character).

Examples:
- `Read` matches exactly "Read"
- `mcp__plugin_slack_*` matches "mcp__plugin_slack_send_message", "mcp__plugin_slack_list_channels", etc.
- `mcp__*` matches all MCP tools

## Evaluation Order

Tier precedence: **deny > ask > allow > default**

1. Check `tools.deny` - if any `rule.tool` glob matches, return deny with `rule.description` and `rule.alternative`
2. Check `tools.ask` - if any glob matches, return ask
3. Check `tools.allow` - if any glob matches, return allow
4. Return `config.default`

There is no specificity ranking within a tier. First match wins.

## Bash Routing

**Important**: When `tool_name === "Bash"`, this matcher is NOT called. Bash always goes through the bash pipeline (Feature 05), regardless of whether "Bash" appears in `tools.allow` or other lists. This prevents accidental bypass of command-level rules.

The top-level `evaluate()` function handles this routing.

## EvalResult Type

```typescript
interface EvalResult {
  decision: Decision;
  reason: string;
  alternative?: string;
  matchedRule?: string;    // e.g. "tools.deny: mcp__dangerous_*"
}
```

## Glob Implementation (`util/glob.ts`)

Minimal glob-to-regex converter:
- `*` -> `.*`
- `?` -> `.`
- All other regex metacharacters escaped
- Anchored: `^pattern$`

Tool names are simple identifiers (letters, numbers, underscores) so full glob semantics (brackets, braces) are unnecessary.

## Acceptance Criteria

- [ ] Exact tool name matches work (e.g., `Read` matches "Read")
- [ ] Wildcard patterns work (e.g., `mcp__plugin_*` matches MCP tools)
- [ ] Deny rules take precedence over allow rules for the same tool
- [ ] Unmatched tools fall through to `config.default`
- [ ] Bash tool name is never processed by this matcher
