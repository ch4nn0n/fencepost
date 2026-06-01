# Feature 14: SessionStart Guidance

## Summary

Inject a short set of guidance lines into Claude's context at the start of each session via a `SessionStart` hook. The guidance steers Claude toward behaviours that work well in a permission-gated environment (use the suggested alternative on a denial, stop and ask the user to authenticate when a tool needs credentials, write scratch files to the sandbox, avoid chaining and gratuitous destructive operations).

## Hook

Registered in `plugin.json` under `SessionStart`, pointing at `hooks/session-start.sh`, which:
1. Sets `FENCEPOST_PRESETS_DIR` (plugin-relative) so imports resolve.
2. Best-effort `mkdir -p /tmp/claude` (see `feature-15-claude-files.md`).
3. Execs `fencepost sessionstart`.

## Subcommand

`fencepost sessionstart` reads the SessionStart hook JSON from stdin (it carries `cwd`), resolves the config for that directory, builds the guidance string, and emits:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Fencepost guidance for this session:\n- …"
  }
}
```

If guidance is disabled or empty, it writes nothing and exits 0. Any error is swallowed (fail-open): a guidance hook must never block a session from starting.

## Config

```yaml
guidance:
  enabled: true          # emit SessionStart context at all (default true)
  includeDefaults: true  # include fencepost's built-in lines (default true)
  extra:                 # additional lines appended after the defaults
    - "Use bun, not npm, in this repo."
```

`guidance` is block-level last-wins when merged across files/presets. When the block is absent, all defaults apply.

## Built-in guidance lines

Defined in `src/guidance.ts` (`defaultGuidance`):

1. This project is protected by fencepost; some calls are denied or need approval.
2. On a denial with an alternative, use the alternative; don't retry or work around the rule.
3. If a tool/command fails for missing auth (login, credentials, expired token), **stop and ask the user to authenticate** rather than retrying or working around it.
4. Write scratch/temp files under `/tmp/claude` (phrasing adapts to whether `redirect.tmp` is on).
5. Prefer one command per tool call over chaining with `&&`/`;`.
6. Avoid destructive operations unless explicitly asked.

## Notes

- The temp-files line changes wording depending on `redirect.tmp`: if redirection is active it says paths are *automatically* redirected; otherwise it asks Claude to use the sandbox directly.
