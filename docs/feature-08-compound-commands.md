# Feature 08: Compound Command Splitting

## Summary

When a Bash command contains compound operators (`&&`, `||`, `|`, `;`), split the command into sub-commands and evaluate each independently. The most restrictive decision wins.

## Why

Without splitting, a compound command like `ls && rm -rf /` would match the `ls` allow rule and be permitted, bypassing the `rm` deny rule entirely. This is a security hole.

## Interface

```typescript
function splitCommand(command: string): string[];
```

Returns an array of individual sub-commands, trimmed.

## Splitting Rules

Split on these operators:
- `&&` - logical AND
- `||` - logical OR
- `|` - pipe
- `;` - sequential

### Quoting Awareness

Operators inside quotes or escaped should NOT cause a split:

- `echo "hello && world"` -> single command (operator inside double quotes)
- `echo 'hello | world'` -> single command (operator inside single quotes)
- `echo hello \&\& world` -> single command (escaped operator)

### Subshell / Command Substitution

For v1, treat `$(...)` and backtick content as opaque (don't split inside them). This is a pragmatic simplification - full shell parsing is out of scope.

## Evaluation

After splitting:

```typescript
function evaluateBashCompound(
  rawCommand: string,
  bashConfig: BashConfig,
  defaultDecision: Decision
): EvalResult {
  const parts = splitCommand(rawCommand);
  const results = parts.map(part => {
    const normalised = normaliseCommand(part.trim(), bashConfig.normalise);
    return evaluateBash(normalised, bashConfig, defaultDecision);
  });
  // Most restrictive wins: deny > ask > allow
  return mostRestrictive(results);
}
```

Decision precedence: **deny > ask > allow**

If any sub-command is denied, the whole compound is denied. The reason should reference the specific sub-command that triggered the deny.

> Note: `feature-17-discourage-chaining.md` builds on this. When enabled, a chain joined by sequencing operators (`&&`, `||`, `;`) that resolves to `ask` is instead denied with guidance to run the steps separately. The splitter also reports the joining operators (`splitCommandDetailed`) so pipes can be distinguished from sequencing.

## Examples

| Command | Parts | Result |
|---------|-------|--------|
| `ls && git push` | `ls`, `git push` | ask (git push is ask) |
| `cat foo \| grep bar` | `cat foo`, `grep bar` | allow (both allowed) |
| `npm test && rm -rf /` | `npm test`, `rm -rf /` | deny (rm -rf denied) |
| `echo "a && b"` | `echo "a && b"` | allow (no split inside quotes) |
| `git status; git push --force` | `git status`, `git push --force` | deny (force push denied) |

## Integration with Existing Pipeline

This feature inserts between the entry point and the bash evaluator:

```
raw command -> splitCommand() -> for each part:
  normalise() -> evaluateBash()
-> mostRestrictive(results)
```

The `feature-05-bash-eval.md` pipeline remains unchanged - it evaluates a single normalised command. This feature wraps it to handle compounds.

## Acceptance Criteria

- [ ] Splits on `&&`, `||`, `|`, `;`
- [ ] Respects single and double quotes (no split inside)
- [ ] Respects escaped operators
- [ ] Most restrictive sub-command decision wins
- [ ] Deny reason references the specific offending sub-command
- [ ] Single commands (no operators) pass through unchanged
