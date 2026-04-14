# Feature 09: Composable Config (conf.d Style)

## Summary

Auto-load all YAML files from `.claude/fencepost/` directory and merge them into a single config. This allows users to organise rules by domain (kubectl, gcp, git, etc.) and share/reuse rule sets.

## Config Resolution

1. Scan `.claude/fencepost/` directory for `*.yaml` and `*.yml` files
2. Sort files alphabetically for deterministic load order
3. Parse each file
4. Merge all files into a single `FencepostConfig`

If the directory doesn't exist or is empty, fall-open with default config (same as no config).

## Directory Structure Example

```
.claude/
  fencepost/
    00-defaults.yaml     # Base settings (default: ask)
    10-tools.yaml        # General tool allow/deny/ask
    20-bash-core.yaml    # Core bash rules (rm, chmod, etc.)
    30-kubectl.yaml      # Kubernetes-specific rules
    40-gcp.yaml          # GCP CLI rules
    50-git.yaml          # Git-specific rules
```

Numeric prefixes are a convention for ordering, not a requirement.

## Individual File Format

Each file can contain any subset of the full config schema. Files don't need to be complete - they only need to define the sections they care about.

```yaml
# 30-kubectl.yaml
tools:
  bash:
    normalise:
      - prefix: kubectl
        strip:
          - '-n \S+'
          - '--namespace \S+'
          - '--context \S+'
    deny:
      - kubectl delete namespace
      - kubectl drain
    ask:
      - kubectl delete
      - kubectl apply
      - kubectl scale
    allow:
      - kubectl get
      - kubectl describe
      - kubectl logs
```

```yaml
# 00-defaults.yaml
default: ask
tools:
  allow:
    - Read
    - Glob
    - Grep
```

## Merge Strategy

Files are merged in alphabetical order. Later files add to earlier files.

### Rules for merging:

- **`default`**: last value wins (later file overrides earlier)
- **`tools.deny`**: arrays are concatenated (all deny rules from all files)
- **`tools.ask`**: arrays are concatenated
- **`tools.allow`**: arrays are concatenated
- **`tools.bash.normalise`**: arrays are concatenated
- **`tools.bash.deny`**: arrays are concatenated
- **`tools.bash.checks`**: arrays are concatenated
- **`tools.bash.ask`**: arrays are concatenated
- **`tools.bash.allow`**: arrays are concatenated

In short: **scalar values = last wins, arrays = concatenate**.

Duplicates in concatenated arrays are fine - they don't change behaviour (a tool matching two allow rules is still just allowed).

## Shareable Presets

Users can share rule files by copying them into the directory. Future work could support:
- An `fencepost add <preset>` command that downloads community presets
- Git submodules for shared rule sets
- npm packages that export YAML files

For v1, the sharing mechanism is simply "copy the YAML file into `.claude/fencepost/`".

## Migration from Single File

If a user has the old `.claude/fencepost.yaml` single file, it should still work. Resolution order:

1. If `.claude/fencepost/` directory exists with YAML files -> use conf.d loading
2. Else if `.claude/fencepost.yaml` exists -> use single file (backward compat)
3. Else -> fail-open with defaults

This keeps backward compatibility while encouraging the new directory approach.

## Acceptance Criteria

- [ ] Loads all `*.yaml` and `*.yml` files from `.claude/fencepost/`
- [ ] Files are loaded in alphabetical order
- [ ] Arrays are concatenated across files
- [ ] Scalar values use last-wins
- [ ] Missing directory falls back to single-file config
- [ ] Empty directory falls back to defaults
- [ ] Individual files can contain partial config (only the sections they define)
- [ ] Invalid files are skipped with a warning (don't break the whole config)
