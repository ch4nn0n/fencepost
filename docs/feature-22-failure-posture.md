# Feature 22: Failure Posture & Config Verification

Fencepost distinguishes two kinds of failure and treats them oppositely:

| Failure | Posture | Why |
|---------|---------|-----|
| Can't reach a decision for a *command* (parser can't understand it, or an unexpected error) | **`onError`**, default **`ask`** | A human is usually present; ask is safe and non-blocking. |
| The *config* itself is present but unparseable/invalid | **Fail closed (deny)** | Better for a human to notice and fix than to run unguarded. |
| No config at all | Defaults (`default: ask`) | Absence is normal, not an error. |

## `onError`

Top-level config knob:

```yaml
onError: ask   # allow | ask | deny (default: ask)
```

Applied when:
- A Bash command can't be parsed/extracted (`evaluateBashAst` → `onError`).
- An unexpected exception is thrown mid-evaluation (the `runEvaluate` catch → `onError`).

The default is **`ask`**, optimised for interactive use: when fencepost can't check something, the human decides. Headless/CI users who can't answer a prompt should set `onError: allow` so an un-checkable command doesn't block an automated run. `onError: deny` is the strict option (un-checkable ⇒ blocked).

> The one case still left as a silent allow is genuinely unidentifiable input — if stdin isn't valid hook JSON we have no tool/command/cwd to gate or to read config from, so there's nothing meaningful to ask about.

## Fail closed on a broken config

A *present* config file that fails to parse or is structurally invalid makes fencepost **deny every tool call** until it's fixed. This is deliberately the opposite of `onError`: a broken security config is exactly when you want a human in the loop, not silent degradation.

- **Fatal (fail closed):** YAML syntax error; top-level not a mapping; invalid `default` or `onError` value.
- **Non-fatal (warning, rule skipped):** a single bad rule — invalid regex, missing field, etc. The rest of the config still applies.
- **Not an error:** no config file present (built-in defaults).

The deny carries the file and reason (shown to Claude, which relays it to the user), and the **SessionStart hook prepends a loud warning** so the human sees it immediately rather than only on the next blocked call.

Note the implied deadlock-by-design: while failing closed, even `Read`/`Write` are denied, so Claude can't fix the config for you — a human edits the file directly. That's the intended "intercept."

## `CompiledConfig` + `fencepost verify`

`compileConfig(cwd)` is now the canonical loader. It returns a `CompiledConfig`:

```typescript
class CompiledConfig {
  config: ResolvedConfig;     // the merged, effective config
  issues: ConfigIssue[];      // { level: "error" | "warning", file, message }
  get errors / warnings;
  get ok: boolean;            // no errors -> safe to enforce
  render(): string;           // human-readable verify + effective-config report
}
```

- `resolveConfig(cwd)` is a thin wrapper returning just `.config` for the hot path.
- `fencepost config` prints the report (sources, errors, warnings, effective JSON).
- `fencepost verify` prints the same report and **exits non-zero if there are errors** — suitable for CI or a pre-commit hook.

Example:

```
# Fencepost config

Sources (1):
  - /repo/.claude/fencepost.yaml

## Errors (1) — config will FAIL CLOSED until fixed
  ✖ [/repo/.claude/fencepost.yaml] invalid 'onError' value: "sometimes" (expected allow|deny|ask)

## Effective config
```json
{ "default": "ask", "onError": "ask", ... }
```
```
