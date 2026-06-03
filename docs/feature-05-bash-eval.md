# Feature 05: Bash Command Evaluator

## Summary

Evaluate a normalised bash command against the bash-specific rules: deny list, checks (regex), ask list, and allow list. Returns a decision with reason and optional alternative.

## Interface

```typescript
function evaluateBash(
  normalisedCommand: string,
  bashConfig: BashConfig,
  defaultDecision: Decision
): EvalResult;
```

> **Updated for the AST (features 19/20/21).** Bash is parsed by tree-sitter and
> each extracted simple command is evaluated by this matcher. The structured
> `arguments`/`redirects` rules (feature 20) and nested interpreter findings
> (feature 21) participate in the same tiers below, bucketed by their `decision`:
> deny-rules join tier 1, allow-rules join the allowChecks tier, ask-rules join
> the ask tier. See `feature-20`/`feature-21` for the full ordering.

## Evaluation Pipeline

Tier precedence: **deny > checks > allowChecks > ask > allow > default**

### 1. Deny List (prefix match)

For each entry in `bash.deny`, check if the normalised command starts with the rule string. Use safe prefix matching: `command === rule || command.startsWith(rule + " ")`.

Example: rule `git branch -D` matches `git branch -D main` but NOT `git branch -Dfoo` (no space separator).

If matched: return `{ decision: "deny", reason: "Command denied: <rule>" }`

### 2. Checks (regex match)

For each entry in `bash.checks`, test the regex against the full normalised command.

Checks are "smart deny" - they always produce deny decisions but carry rich metadata (description + alternative) in the shellfirm style.

If matched: return `{ decision: "deny", reason: check.description, alternative: check.alternative }`

### 3. Allow Checks (regex match)

For each entry in `bash.allowChecks`, test the regex against the full normalised command. These are "smart allow" rules: the mirror image of `checks`. Because they match the whole command (not a prefix), a `$`-anchored pattern can confine an allow to a single path, e.g. confining destructive ops to a sandbox dir (see `feature-15-claude-files.md`).

They sit **above** `ask`/`allow` so an explicit regex exception wins over a broader ask rule, but **below** `deny`/`checks` so a denial is never bypassed.

If matched: return `{ decision: "allow" }`. Invalid regexes are skipped.

### 4. Ask List (prefix match)

Same prefix matching as deny. If matched: return `{ decision: "ask", reason: "Command requires approval: <rule>" }`

### 5. Allow List (prefix match)

Same prefix matching. If matched: return `{ decision: "allow" }`

### 6. Default

If no rule matches: return `{ decision: config.default }`

## Prefix Matching Semantics

A rule string `git branch` matches:
- `git branch` (exact match)
- `git branch -D main` (command starts with rule + space)

It does NOT match:
- `git branchless` (no word boundary)
- `  git branch` (leading space - should be trimmed by normalisation)

Implementation:
```typescript
function prefixMatch(command: string, rule: string): boolean {
  return command === rule || command.startsWith(rule + " ");
}
```

## Full Pipeline (with normalisation)

The top-level bash evaluation flow (orchestrated by `evaluate.ts`):

```
raw command -> normaliseCommand(command, config.bash.normalise) -> evaluateBash(normalised, config.bash, config.default)
```

## Acceptance Criteria

- [ ] Deny rules block matching commands
- [ ] Deny rules use prefix matching with word boundary
- [ ] Checks use regex and return description + alternative
- [ ] Ask rules prompt for matching commands
- [ ] Allow rules permit matching commands
- [ ] Unmatched commands fall to config.default
- [ ] More restrictive tiers always win (deny > checks > ask > allow)
- [ ] `git branch` in allow does not prevent `git branch -D` in deny from firing
