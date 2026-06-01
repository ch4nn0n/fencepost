# Feature 02: Config Loader and Schema

## Summary

Load, parse, validate, and merge YAML configuration files. Supports both a conf.d directory (`.claude/fencepost/`) and a single-file fallback (`.claude/fencepost.yaml`). See also `feature-09-composable-config.md` for full conf.d merge semantics, and `feature-13-imports.md` for pulling in bundled presets via `import:`.

## Config Resolution Order

1. If `{cwd}/.claude/fencepost/` exists with `*.yaml`/`*.yml` files -> load all, merge alphabetically
2. Else if `{cwd}/.claude/fencepost.yaml` exists -> load single file
3. Else -> fail-open with `default: ask` and empty rule lists

The `cwd` comes from the hook input JSON.

## YAML Schema

```yaml
# Optional: pull in bundled preset rule sets by name (see feature-13-imports.md).
# Presets are merged as the base; rules below layer on top.
import:
  - git
  - kubernetes

# Default decision for tools/commands that match no rule.
# One of: allow, deny, ask
default: ask

# Optional: guidance injected at session start (see feature-14-session-guidance.md).
guidance:
  enabled: true
  includeDefaults: true
  extra:
    - "Use bun, not npm, in this repo."

# Optional: rewrite /tmp paths to a sandbox dir (see feature-15-claude-files.md).
redirect:
  tmp: true
  tmpTarget: /tmp/claude

tools:
  # Tools to always deny. Objects with metadata.
  deny:
    - tool: "mcp__dangerous_*"        # glob pattern
      description: "Blocked by policy"
      alternative: "Use safe_tool instead"

  # Tools to prompt the user about. Plain glob strings.
  ask:
    - "mcp__plugin_slack_*"

  # Tools to silently allow. Plain glob strings.
  allow:
    - "Read"
    - "Edit"
    - "Glob"

  # Bash-specific rules. Only applies when tool_name is "Bash".
  bash:
    normalise:
      - prefix: "kubectl"
        strip:
          - '-n \S+'
          - '--namespace \S+'

    deny:
      - "git branch -D"
      - "git push --force"

    checks:
      - test: '\brm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive)'
        description: "Recursive delete is dangerous"
        alternative: "Delete specific files individually"

    # Regex "smart allow" — matches the whole command, so a $-anchored pattern
    # can confine an allow to a sandbox path (see feature-15-claude-files.md).
    allowChecks:
      - '^rm\s+(-\S+\s+)*/tmp/claude(/\S*)?$'

    ask:
      - "git push"

    allow:
      - "ls"
      - "git status"

    # Deny a sequenced chain that would need approval, asking Claude to run the
    # steps separately (see feature-17-discourage-chaining.md). Default: true.
    discourageChaining: true
```

## TypeScript Types

```typescript
type Decision = "allow" | "deny" | "ask";

interface FencepostConfig {
  default: Decision;
  tools: {
    deny: ToolDenyRule[];
    ask: string[];
    allow: string[];
    bash: BashConfig;
  };
  guidance?: GuidanceConfig;   // feature 14
  redirect?: RedirectConfig;   // feature 15
}

interface ToolDenyRule {
  tool: string;           // glob pattern
  description: string;
  alternative?: string;
}

interface BashConfig {
  normalise: NormaliseRule[];
  deny: string[];
  checks: BashCheck[];
  allowChecks?: string[];      // regex "smart allow" (feature 15)
  ask: string[];
  allow: string[];
  discourageChaining?: boolean; // feature 17, default true
}

interface GuidanceConfig {
  enabled: boolean;            // default true
  includeDefaults: boolean;    // default true
  extra: string[];
}

interface RedirectConfig {
  tmp: boolean;                // default false (claude preset enables)
  tmpTarget: string;           // default "/tmp/claude"
}

interface NormaliseRule {
  prefix: string;
  strip: string[];        // regex patterns to remove
}

interface BashCheck {
  test: string;           // regex pattern
  description: string;
  alternative?: string;
}
```

## Validation Rules

- `default` must be one of `allow`, `deny`, `ask`
- All sections under `tools` are optional (default to empty arrays)
- `bash` section is optional (defaults to empty sub-sections)
- `deny` entries must have `tool` and `description` fields
- `checks` entries must have `test` and `description` fields
- Regex patterns in `checks`, `allowChecks`, and `normalise.strip` must be valid RegExp (invalid ones are skipped)
- `guidance` and `redirect` are block-level last-wins; `bash.discourageChaining` is a scalar that only overrides when explicitly set

## Edge Cases

- **Missing config**: return a config with `default: "ask"` and empty rule lists. Log a warning to audit.
- **Malformed YAML**: fail-open. Return default config, log error to audit.
- **Partial config**: missing sections default to empty. E.g., no `bash` section means no bash-specific rules (fall through to `default`).

## Resolved Config

The config loader exposes a `resolveConfig(cwd: string): FencepostConfig` function that returns the fully merged config after all conf.d files (or single file) are loaded and validated. This is the single source of truth used by:

- The hook entry point (for evaluation)
- The audit skill (for dead rule detection and displaying effective rules)

The resolved config should also track **provenance** - which file each rule came from. This helps debugging ("why is this denied?") and makes the audit skill's output actionable ("dead rule in `30-kubectl.yaml`").

```typescript
interface ResolvedConfig extends FencepostConfig {
  _sources: Record<string, string>;  // rule path -> source file, e.g. "bash.deny[0]" -> "30-kubectl.yaml"
}
```

## Acceptance Criteria

- [ ] Loads config from `.claude/fencepost/` directory (conf.d) or `.claude/fencepost.yaml` (single file)
- [ ] Returns sensible defaults when config is missing or malformed
- [ ] Validates all fields and reports clear errors for invalid config
- [ ] Parses regex patterns and catches invalid ones at load time
- [ ] `resolveConfig()` returns fully merged config with source provenance
- [ ] Merges per conf.d semantics: arrays concatenate, scalars last-wins
