# Feature 07: Audit Skill (`/audit`)

## Summary

A Claude Code skill that reads the audit log, analyses decision patterns, and suggests concrete YAML config changes. Helps users tune their fencepost config based on real usage data.

## How It's Invoked

Registered as a Claude Code custom slash command: `/audit`. When invoked, it reads `.claude/fencepost-audit.jsonl` and outputs a markdown analysis.

## Entry Point

`src/audit/skill.ts` - separate from the hook entry point. Can be run as:
```
bun run src/audit/skill.ts [--path .claude/fencepost-audit.jsonl]
```

## Analysis Outputs

### 0. Resolved Config Summary

Display the fully merged effective config so the user can see exactly what rules are active and where each rule came from (using provenance from `resolveConfig()`).

```
## Effective Config

Source files:
  - 00-defaults.yaml
  - 10-tools.yaml
  - 30-kubectl.yaml
  - 50-git.yaml

default: ask (from 00-defaults.yaml)

tools.allow (4 rules):
  - Read                              (10-tools.yaml)
  - Glob                              (10-tools.yaml)
  - Grep                              (10-tools.yaml)
  - Edit                              (10-tools.yaml)

tools.deny (1 rule):
  - mcp__dangerous_* — "Blocked"      (10-tools.yaml)

bash.deny (2 rules):
  - git branch -D                     (50-git.yaml)
  - kubectl delete namespace          (30-kubectl.yaml)

bash.checks (1 rule):
  - \brm\s+... — "Recursive delete"   (00-defaults.yaml)

bash.ask (2 rules):
  - git push                          (50-git.yaml)
  - kubectl delete                    (30-kubectl.yaml)

bash.allow (4 rules):
  - ls                                (00-defaults.yaml)
  - git status                        (50-git.yaml)
  - kubectl get                       (30-kubectl.yaml)
  - kubectl describe                  (30-kubectl.yaml)
```

This section appears first so the user has context for the analysis that follows.

### 1. Decision Frequency Table

Group by `(tool, decision)`, count occurrences, sort descending.

```
| Tool           | Allow | Ask | Deny | Total |
|----------------|-------|-----|------|-------|
| Bash           | 142   | 23  | 7    | 172   |
| Read           | 89    | 0   | 0    | 89    |
| Edit           | 45    | 0   | 0    | 45    |
| mcp__slack_*   | 0     | 12  | 0    | 12    |
```

### 2. Promotion Candidates (ask -> allow)

Tools/commands that were "ask" decisions repeatedly. These are candidates for promotion to the allow list.

Heuristic: if a tool/command was asked 5+ times across sessions, suggest promotion.

```
Suggestion: Move `git push` from bash.ask to bash.allow
  - Asked 23 times across 8 sessions
  - Never denied by user

Suggestion: Move `mcp__plugin_slack_slack_send_message` from tools.ask to tools.allow
  - Asked 12 times across 5 sessions
```

### 3. Bash Command Breakdown

For Bash specifically, show the most frequent commands and their decisions:

```
| Command (normalised) | Allow | Ask | Deny |
|---------------------|-------|-----|------|
| git status          | 34    | 0   | 0    |
| npm test            | 28    | 0   | 0    |
| git push origin     | 0     | 15  | 0    |
| rm -rf /tmp/build   | 0     | 0   | 3    |
```

### 4. Dead Rules

Rules in the config that never matched any tool call in the audit log. These may be stale.

```
Warning: These rules have never matched:
  - bash.deny: "git push --force" (0 matches)
  - tools.deny: "mcp__dangerous_*" (0 matches)
```

### 5. Suggested YAML Changes

Concrete YAML snippets the user can copy into their config:

```yaml
# Suggested additions to bash.allow:
allow:
  - npm test          # asked 28 times, always approved
  - git fetch         # asked 15 times, always approved

# Suggested additions to tools.allow:
allow:
  - mcp__plugin_slack_slack_send_message  # asked 12 times, always approved
```

## Architecture

```
src/audit/
  skill.ts      # Entry point: read log, call analyse, format markdown, print to stdout
  analyse.ts    # Pure analysis logic: parse entries, compute stats, generate suggestions
```

`analyse.ts` exports pure functions that take `AuditEntry[]` and `FencepostConfig` and return structured analysis results. `skill.ts` handles I/O and markdown formatting.

## Acceptance Criteria

- [ ] Reads and parses the JSONL audit log
- [ ] Produces a frequency table grouped by tool and decision
- [ ] Identifies promotion candidates (frequently asked, never denied)
- [ ] Identifies dead rules by cross-referencing config with log
- [ ] Outputs concrete YAML suggestions
- [ ] Handles empty or missing audit log gracefully
- [ ] Output is valid markdown suitable for Claude Code to display
