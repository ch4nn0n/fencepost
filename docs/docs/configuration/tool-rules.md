---
title: Tool rules
description: Gate non-Bash tools by name with glob patterns.
---

# Tool rules

`tools.deny`, `tools.ask`, and `tools.allow` gate **every tool except `Bash`** by matching the tool **name** against glob patterns. (`Bash` always goes through the [bash pipeline](./bash-rules.md) instead — see below.)

## The three lists

```yaml
tools:
  # Always deny. Objects carry metadata so the denial is actionable.
  deny:
    - tool: "mcp__dangerous_*"
      description: "Blocked by policy"
      alternative: "Use safe_tool instead"

  # Prompt the user. Plain glob strings.
  ask:
    - "mcp__plugin_slack_*"

  # Silently allow. Plain glob strings.
  allow:
    - "Read"
    - "Edit"
    - "Glob"
    - "Grep"
```

Note the shapes differ:

- **`allow`** and **`ask`** are lists of bare glob **strings**.
- **`deny`** is a list of **objects** with `tool` (the glob), a required `description`, and an optional `alternative`. Those become the reason Claude sees when it's blocked.

## Evaluation order

Tier precedence is **deny > ask > allow > default**:

1. `tools.deny` — first matching `tool` glob → **deny** (with its `description`/`alternative`).
2. `tools.ask` — first matching glob → **ask**.
3. `tools.allow` — first matching glob → **allow**.
4. No match → `config.default`.

The most restrictive matching tier wins. Within a tier there's no specificity ranking: **first match wins**.

## Glob syntax

Tool names are simple identifiers, so the glob is intentionally minimal:

| Pattern | Matches |
|---------|---------|
| `Read` | exactly `Read` |
| `mcp__plugin_slack_*` | `mcp__plugin_slack_send_message`, `mcp__plugin_slack_list_channels`, … |
| `mcp__*` | every MCP tool |
| `Notebook?dit` | `NotebookEdit` (`?` = one character) |

`*` expands to "any characters", `?` to "a single character"; everything else is matched literally. Patterns are anchored end-to-end.

## Bash is never matched here

:::warning
Listing `Bash` in `tools.allow` has **no effect**. fencepost always routes `Bash` through the command-level [bash pipeline](./bash-rules.md), regardless of the tool-name lists. This is deliberate — it prevents a single `allow: ["Bash"]` from waving every shell command through and bypassing your command rules.
:::

## Examples

**Allow Claude's read tools, ask before anything that reaches a network MCP, deny a known-bad one:**

```yaml
tools:
  allow:
    - Read
    - Glob
    - Grep
  ask:
    - "mcp__*"               # any MCP server → prompt
  deny:
    - tool: "mcp__legacy_*"
      description: "The legacy MCP server is deprecated and unsafe."
      alternative: "Use mcp__plugin_context7_* for docs instead."
```

Because tiers resolve deny → ask → allow, `mcp__legacy_foo` is denied even though it also matches the broader `mcp__*` ask rule.

:::tip Use a preset
The [`claude` preset](../presets.md#claude) already allow-lists Claude's built-in tools (file tools yes, `WebFetch`/`WebSearch` left to your `default`). Import it instead of hand-listing them.
:::
