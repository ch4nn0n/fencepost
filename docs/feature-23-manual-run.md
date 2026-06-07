# Feature 23: Manual-Run Escape Hatch on Deny

When fencepost denies a Bash command, it can also hand the user the exact command to run themselves — turning a flat wall into "I won't run this for the agent, but here it is for you." This keeps the human in control: the destructive action, if it happens, happens under direct human intent rather than via the agent.

## Why not the clipboard

The original idea was to copy the blocked command to the clipboard. A `PreToolUse` hook is the wrong place for that:

- A hook is a short-lived subprocess with **no reliable clipboard channel** — `pbcopy`/`xclip`/`wl-copy`/`clip.exe` may be missing or unreachable over SSH, in containers, on the web app, or in CI.
- Silently **clobbering the clipboard** is a surprising side effect for a security tool.
- On `deny`, the reason is shown to **Claude, not the user**, so fencepost can't present an interactive "copy?" prompt anyway.

Instead we use the channel that always works: text in the conversation. Every Claude Code surface renders fenced code blocks with a one-click copy button, so the client provides the "copy" affordance and fencepost stays portable and side-effect-free.

## Behaviour

On a **Bash deny**, when `offerManualRun` is on, fencepost appends to the deny's `additionalContext` an instruction for Claude to:

1. lead with the rule reason / suggested alternative (the preferred path), then
2. offer the **verbatim original command** in a copyable code block, noting the user can run it themselves by typing it in the prompt prefixed with `!`.

`! <command>` runs as a *user* shell command, not a tool call, so it does not pass back through the `PreToolUse` hook — a genuine in-session escape hatch (no second terminal, no clipboard).

The command offered is the **original** command from the tool input (before any `/tmp` redirect), since that is what the user intends to run. It's omitted for non-Bash denials (there is no `!`-equivalent) and for the fail-closed config-error deny (the fix there is to repair the config, not to bypass).

## Config

```yaml
tools:
  bash:
    offerManualRun: true   # default true
```

Default **on**, consistent with optimising for an interactive human. Set `false` for a stricter posture where denies don't advertise a bypass, or for headless use where `!` isn't available.

## Precedence with alternatives

The alternative is always presented first; the manual run is a secondary "if you still want the original" fallback. This avoids undercutting the safer path — e.g. a denied `git push --force` still steers Claude to suggest `git push --force-with-lease` before offering the original for manual execution.

## Caveats / future work

- **It is, by design, a bypass.** Reserve hard `deny` for things you never want the agent doing; the human escape hatch is intentional. If you find yourself routing around a particular deny often, that rule probably wants to be `ask` instead.
- **Blunt granularity (v1).** `offerManualRun` is a single Bash-wide flag. A truly catastrophic rule (say a `/`-wipe) will still offer the command — which a human could trivially run anyway, so it doesn't expand their capability, but the optics aren't ideal. Per-rule `offerManualRun` overrides are a possible refinement if needed.
- The hint assumes an interactive session where the user can type `!`. In headless runs it's harmless text but inert; such users should set `offerManualRun: false`.
