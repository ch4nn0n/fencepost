# Feature 04: Bash Command Normalisation

## Summary

Normalise bash commands before rule matching by stripping irrelevant flags/arguments. This allows rules to match the semantic intent of a command regardless of environment-specific flags like `--namespace` or `--context`.

## Interface

```typescript
function normaliseCommand(command: string, rules: NormaliseRule[]): string;
```

## How It Works

1. For each normalise rule, check if the command starts with `rule.prefix` (followed by a space or end-of-string)
2. If the prefix matches, apply each `rule.strip` pattern as a regex replacement (replace with empty string)
3. Collapse multiple spaces to single space
4. Trim leading/trailing whitespace

Only the first matching prefix rule is applied (a command starting with `kubectl` won't also match a `docker` rule).

## Example

Config:
```yaml
normalise:
  - prefix: kubectl
    strip:
      - '-n \S+'
      - '--namespace \S+'
      - '--context \S+'
```

Input: `kubectl -n production get pods --context staging`

Steps:
1. Command starts with `kubectl` -> apply strip rules
2. Strip `-n production` -> `kubectl  get pods --context staging`
3. Strip `--context staging` -> `kubectl  get pods`
4. Collapse spaces -> `kubectl get pods`

Output: `kubectl get pods`

## Edge Cases

- Command doesn't match any prefix -> return unchanged
- Strip pattern not found in command -> no-op for that pattern
- Multiple matches of same strip pattern -> all occurrences removed
- Empty command after normalisation -> return empty string (will likely fall to default)

## Why Prefix-Scoped?

Normalise rules only apply when the command starts with the specified prefix. This prevents a kubectl strip rule from accidentally modifying an unrelated command that happens to contain `-n`.

## Acceptance Criteria

- [ ] Strips matching patterns from commands with matching prefix
- [ ] Does not modify commands that don't match any prefix
- [ ] Collapses whitespace after stripping
- [ ] Handles multiple strip patterns per prefix
- [ ] Only applies the first matching prefix rule
