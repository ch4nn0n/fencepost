---
title: Introduction
slug: /intro
description: What fencepost is and why you'd run it in front of Claude Code.
---

# Introduction

**fencepost** is a configurable permission gate for [Claude Code](https://docs.claude.com/en/docs/claude-code). It installs as a plugin and runs on the `PreToolUse` hook, so it sees **every tool call Claude tries to make** before it happens, and evaluates it against a YAML rule set you control.

For each call it returns one of three decisions:

| Decision | What happens | Who sees the reason |
|----------|--------------|---------------------|
| **allow** | The tool runs, silently. The fast path. | — |
| **ask** | Claude Code prompts you to approve. | You |
| **deny** | The tool is blocked, with an actionable alternative. | Claude |

The goal is not just to block things. A bare denial leaves Claude to retry the same wall or thrash around it. fencepost denials carry an **alternative** and steer Claude toward it — turning a hard stop into a redirection.

## Why run it

Claude Code already has a permission system. fencepost sits alongside it for the cases where you want **policy as code**:

- **Curated, shareable rules.** Import a battle-tested ruleset for `git`, `kubernetes`, `helm`, `ansible` and more with a single line, instead of hand-writing allow-lists.
- **Real bash understanding.** Commands are parsed with tree-sitter, not pattern-matched as strings. fencepost reasons about redirections, every argument, compound commands, and even inline `python -c`/`node -e` snippets.
- **A scratch sandbox.** Funnel Claude's temp files into `/tmp/claude` and grant destructive permissions *scoped to that directory* — the rest of the filesystem stays gated.
- **Fail-closed safety.** A broken security config denies everything until a human fixes it, rather than silently degrading.
- **An audit trail.** Every decision is logged, and the `/audit` skill turns real usage into concrete config suggestions.

## How a call flows

```
Claude Code  ──tool call──▶  PreToolUse hook  ──▶  fencepost
                                                      │
                          read config (.claude/fencepost*)
                                                      │
                                  ┌───────────────────┴───────────────────┐
                                  │   redirect → evaluate → format → log   │
                                  └───────────────────┬───────────────────┘
                                                      ▼
                                          allow │ ask │ deny
```

fencepost ships as a small JS bundle (~280 KB plus the tree-sitter grammars) that runs on Node or Bun — no build step for users, no large binary to download, and the same code on every platform.

## Where to go next

- **[Installation](./getting-started/installation.md)** — add the plugin and build the binary.
- **[Quick start](./getting-started/quick-start.md)** — a working config in two minutes.
- **[The decision model](./concepts/decision-model.md)** — how the tiers resolve.
- **[Presets](./presets.md)** — the curated rule sets you can import.

:::note
fencepost is a **guard rail, not a sandbox.** It prevents accidental damage and enforces a policy you choose. It does not contain a determined adversary: dynamic or obfuscated commands have the same ceiling here as anywhere else.
:::
