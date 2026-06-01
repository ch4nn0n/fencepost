# Feature 16: `claude` Preset

## Summary

A bundled preset (`presets/claude.yaml`) with sane defaults for working with Claude Code itself: allow Claude's built-in tools so routine work doesn't prompt, and enable the `/tmp/claude` sandbox workflow (`feature-15`).

## Import

```yaml
import:
  - claude
```

## What it sets

### Built-in tool allows

```yaml
tools:
  allow:
    - Read
    - Glob
    - Grep
    - Edit
    - Write
    - NotebookEdit
    - TodoWrite
    - Task
    - ExitPlanMode
    - BashOutput
    - KillShell
```

Notable exclusions:

- **`Bash`** is intentionally absent. Fencepost always routes Bash through the bash command pipeline regardless of `tools.allow`, so listing it would have no effect.
- **`WebFetch` / `WebSearch`** are not allow-listed; they reach external services, so they fall through to your `default` decision (per the chosen policy of "file tools yes, web → ask").

### Sandbox enablement

```yaml
redirect:
  tmp: true
  tmpTarget: /tmp/claude

tools:
  bash:
    allowChecks:
      - '^(rm|rmdir|mkdir|touch|cat|ls|head|tail|stat|wc|file)\s+(-\S+\s+)*/tmp/claude(/\S*)?$'
```

See `feature-15-claude-files.md` for the redirection and sandbox-permission mechanics.

## Recommended usage

Most projects will want the `claude` preset plus tool-specific presets:

```yaml
import:
  - claude
  - git
  - kubernetes
default: ask
```
