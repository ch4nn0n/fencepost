---
title: Secrets protection
description: Deny tool inputs that contain credentials and redact secrets from tool output using gitleaks, trufflehog, or detect-secrets.
---

# Secrets protection

Without protection, a secret can cross the model boundary in either direction: Claude reads a `.env` file and the credentials land in the conversation transcript, or Claude writes a hardcoded API key into a file. Secrets protection guards both directions:

- **Inputs (PreToolUse)** — `Write`, `Edit`, `NotebookEdit` content and `Bash` commands are scanned before the tool runs. A hit is **denied** with the rule name (never the value) and guidance to reference the secret from its source instead.
- **Outputs (PostToolUse)** — `Read`, `Bash`, `Grep`, and `WebFetch` results are scanned after the tool runs but **before the output reaches the model**. Each secret is replaced in place with `[FENCEPOST:REDACTED <scanner>:<rule>]` and Claude is told the placeholder is not recoverable.

Fencepost deliberately does **not** maintain its own detection rules. It shells out to whichever supported scanner is installed:

| Scanner | Speed | Redaction quality | Notes |
|---|---|---|---|
| [gitleaks](https://github.com/gitleaks/gitleaks) (recommended) | ~200 ms | Exact spans | Needs v8.19+ (`stdin` subcommand). `brew install gitleaks` |
| [trufflehog](https://github.com/trufflesecurity/trufflehog) | ~2 s | Exact spans | Runs with `--no-verification` (no network calls). `brew install trufflehog` |
| [detect-secrets](https://github.com/Yelp/detect-secrets) | ~0.5 s | Whole line | Reports only line numbers, so the entire flagged line is replaced. `pipx install detect-secrets` |

With `scanner: auto` (the default), the first installed scanner in the order above is used.

## Enabling

Import the bundled preset:

```yaml
# .claude/fencepost.yaml
import:
  - secrets
```

Or set it directly:

```yaml
secrets:
  enabled: true
```

## Options

```yaml
secrets:
  enabled: true
  scanner: auto        # auto | gitleaks | trufflehog | detect-secrets
  scanInputs: true     # PreToolUse: deny secret-bearing inputs
  scanOutputs: true    # PostToolUse: redact secrets from output
  inputTools: [Write, Edit, NotebookEdit, Bash]
  outputTools: [Read, Bash, Grep, WebFetch]
  allow:
    paths:             # path globs exempt from INPUT scanning
      - "**/.env.example"
      - "test/fixtures/**"
    rules:             # "<scanner>:<rule>" globs to ignore everywhere
      - "gitleaks:generic-api-key"
  maxScanBytes: 1048576  # skip scanning content larger than this
  timeoutMs: 3000        # per scanner invocation; on timeout the scan is skipped
```

The `secrets` block merges **field by field**: a preset can set `enabled: true` and your config can add `allow.paths` entries without re-declaring (or accidentally disabling) the rest. `allow.paths` and `allow.rules` concatenate across files; scalars are last-set-wins.

## Failure posture

The posture depends on whether you **pinned** a scanner:

- **`scanner: auto` (default) fails open.** A missing scanner deactivates scanning, a scanner error/timeout lets the tool call proceed unscanned, and output larger than `maxScanBytes` is skipped. Onboarding is never blocked; session-start guidance warns when protection is inactive, with install hints.
- **`scanner: <name>` fails closed.** Pinning a scanner is a deliberate choice, so if that scanner can't run (not installed, spawn error, or timeout) fencepost treats it as a misconfiguration: **inputs are denied** and **tool output is withheld** (replaced with a notice) until the scanner is installed or `scanner` is set back to `auto`. Session-start guidance says so loudly.

In both modes, output larger than `maxScanBytes` is skipped rather than withheld — that limit is a deliberate size policy, not scanner unavailability, so a single huge output never wedges the session.

A *broken config*, as always, [fails closed](../concepts/failure-posture.md).

## What gets logged

Audit entries record the scanner, rule ids, and counts — **never** secret values. For a secrets-denied `Write`/`Edit`, the audit input summary is reduced to the file path; for a secrets-denied `Bash` command, the command itself is omitted (it embeds the value).

## Limitations

- `Edit.old_string` is not scanned, by design: it is copied from the file, and scanning it would block the very edit that removes a secret.
- Redacted outputs longer than 10,000 characters are saved to a file with a preview by Claude Code (the saved file contains the *redacted* text).
- Scanners only find what their rules match. Entropy-based and keyword rules catch most real credentials, but no scanner is exhaustive.
