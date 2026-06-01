# Feature 15: Claude Temp-File Management

## Summary

Keep Claude's scratch/temporary files in a per-machine sandbox directory (`/tmp/claude`) instead of scattered across `/tmp`. Funnelling temp files into one place lets you grant **destructive permissions scoped to that directory** with confidence, while leaving the rest of the filesystem gated.

Three cooperating mechanisms:

1. **Sandbox creation** — the SessionStart hook (`feature-14`) runs `mkdir -p /tmp/claude`.
2. **Guidance** — a SessionStart line tells Claude to use the sandbox.
3. **Input redirection** — fencepost rewrites `/tmp` paths to the sandbox in tool inputs, and the `claude` preset (`feature-16`) allows destructive ops confined to it.

## Redirection

`src/redirect.ts` rewrites references to the system temp root in tool inputs:

```
/tmp/foo        -> /tmp/claude/foo
/tmp            -> /tmp/claude        (bare, at a boundary)
/tmp/claude/foo -> unchanged          (already in the sandbox)
/var/tmp/x      -> unchanged          (not the system temp root)
/tmpfile        -> unchanged          (not a /tmp path)
```

It is a pragmatic string rewrite with a path-boundary lookbehind, not a full shell parser. Rewritten fields per tool:

| Tool | Field |
|------|-------|
| Bash | `command` |
| Read / Write / Edit | `file_path` |
| NotebookEdit | `notebook_path` |

### Flow in the hook

Redirection happens **before** evaluation, so rules and the audit log see the path the tool will actually use:

```
tool_input -> redirectToolInput -> evaluate(rewritten) -> formatOutput(result, updatedInput)
```

When the input changed, the decision JSON carries `updatedInput` so the tool runs against the sandbox path (applied on `allow` and `ask`; irrelevant on `deny`). On `allow` with a rewrite, fencepost emits an explicit allow output (instead of the usual empty-stdout fast path) to carry `updatedInput`.

## Config

```yaml
redirect:
  tmp: true              # rewrite /tmp -> tmpTarget (default false at the core level)
  tmpTarget: /tmp/claude # destination dir (must be under /tmp)
```

`redirect` is block-level last-wins. The core default is **off**; the `claude` preset turns it on. Only targets directly under `/tmp` are supported; any other target makes redirection a no-op.

## Scoped destructive permissions

Prefix-matching can't express "allow operations on paths under X" (a path continues past the rule without a space boundary). So the `claude` preset uses **`allowChecks`** (regex allow, see `feature-05`) anchored with `$`:

```yaml
tools:
  bash:
    allowChecks:
      - '^(rm|rmdir|mkdir|touch|cat|ls|head|tail|stat|wc|file)\s+(-\S+\s+)*/tmp/claude(/\S*)?$'
```

The trailing `$` confines the allow to a **single** sandbox target: `rm -rf /tmp/claude/build` is allowed, but `rm -rf /tmp/claude/build /etc` is not (it falls through to your default). Two-path commands (`cp`, `mv`) are intentionally excluded.

## Limitations

- Redirection is string-based; an unusual command that embeds `/tmp` in a non-path context could be rewritten. Disable with `redirect: { tmp: false }`.
- `allowChecks` sits below `deny`/`checks` in precedence. If another preset adds a recursive-delete **deny check**, it will shadow the sandbox allow; scope such checks to exclude `/tmp/claude` if you want both.
