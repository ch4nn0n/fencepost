---
title: Secrets protection
description: Deny tool inputs that contain credentials and redact secrets from tool output using gitleaks, betterleaks, trufflehog, or detect-secrets.
---

# Secrets protection

Without protection, a secret can cross the model boundary in either direction: Claude reads a `.env` file and the credentials land in the conversation transcript, or Claude writes a hardcoded API key into a file. Secrets protection guards both directions:

- **Inputs (PreToolUse)** — `Write`, `Edit`, `NotebookEdit` content and `Bash` commands are scanned before the tool runs. A hit is **denied** with the rule name (never the value) and guidance to reference the secret from its source instead.
- **Outputs (PostToolUse)** — `Read`, `Bash`, `Grep`, and `WebFetch` results are scanned after the tool runs but **before the output reaches the model**. Each secret is replaced in place with `[FENCEPOST:REDACTED <scanner>:<rule>]` and Claude is told the placeholder is not recoverable.

Fencepost deliberately does **not** maintain its own detection rules. It shells out to whichever supported scanner is installed:

| Scanner | Speed (see [below](#scanner-compatibility-and-performance)) | Redaction quality | Notes |
|---|---|---|---|
| [gitleaks](https://github.com/gitleaks/gitleaks) **(recommended)** | fastest (~0.1 s) | Exact spans | Needs the `stdin` command (v8.19.3+). `brew install gitleaks` |
| [betterleaks](https://github.com/betterleaks/betterleaks) | ~1.2 s | Exact spans | gitleaks successor by the same team (re2/aho-corasick, fewer false positives), but ~10× higher per-call startup. Drop-in compatible. |
| [trufflehog](https://github.com/trufflesecurity/trufflehog) | slowest (seconds) | Exact spans | Runs with `--no-verification` (no network calls). `brew install trufflehog` |
| [detect-secrets](https://github.com/Yelp/detect-secrets) | ~0.6 s | Whole line | Reports only line numbers, so the entire flagged line is replaced. `pipx install detect-secrets` |

### Recommended scanner

**gitleaks is the recommended scanner** and the default, for three reasons:

1. **Per-call latency.** Fencepost runs the scanner on every gated tool call as a fresh process, so startup cost dominates. gitleaks scans in ~0.1 s; betterleaks ~1.2 s, detect-secrets ~0.6 s, trufflehog several seconds (see [latency](#latency)). On a per-tool-call hook, gitleaks' ~10× lead over betterleaks matters more than anything else.
2. **Ubiquity.** gitleaks is packaged in Homebrew, apt, and most CI images; it is the easiest to install on any machine.
3. **Maturity.** It is widely deployed and battle-tested.

If you have no preference, install gitleaks and leave `scanner: auto`.

**[betterleaks](https://github.com/betterleaks/betterleaks)** is a fully supported drop-in alternative — a gitleaks successor from the same team with re2/aho-corasick matching and lower false-positive rates. Its trade-off today is a higher per-invocation startup (~1.2 s here), which is why it is not the default for a per-call hook. If its accuracy improvements matter more to you than latency, pin `scanner: betterleaks` (fencepost never enables its network secret-validation, so scans stay offline).

With `scanner: auto` (the default), fencepost uses the first installed scanner in this order: **gitleaks → betterleaks → trufflehog → detect-secrets**. Pin `scanner: <name>` to force a specific one (which also makes it [fail closed](#failure-posture) if unavailable).

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
  scanner: auto        # auto | gitleaks | betterleaks | trufflehog | detect-secrets
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
  timeoutMs: 10000       # per scanner invocation; on timeout the scan is skipped
                         # (generous so trufflehog can finish; gitleaks/detect-secrets
                         # return in well under a second)
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

## Scanner compatibility and performance

Fencepost's adapters are verified against multiple versions of each scanner by the [`scanner-compat` workflow](https://github.com/ch4nn0n/fencepost/actions/workflows/scanner-compat.yml). It does **not** hard-code versions: a setup job resolves the **latest 4 releases** of each scanner live (from the GitHub Releases API, or PyPI for detect-secrets) and appends the documented minimum floor, then installs each and runs the real-binary integration tests.

The release feeds and minimum floors below live in [`scanner-floors.json`](https://github.com/ch4nn0n/fencepost/blob/main/scanner-floors.json) — the single source of truth that both the workflow and this page read, so the matrix can't drift from what CI actually tests. A CI guard (`bun run docs:floors:check`) fails the build if this table falls out of sync with that file.

<!-- BEGIN:compat-matrix (generated from scanner-floors.json by scripts/sync-secrets-docs.ts — do not edit by hand) -->
| Scanner | Minimum supported | Tested in CI | Notes |
|---|---|---|---|
| gitleaks | **8.19.3** | latest 4 releases + floor | 8.19.0–8.19.2 ship the `stdin` command but reject our report flags; 8.18.x has no `stdin` command at all. |
| betterleaks | **1.5.0** | latest 4 releases + floor | Shares gitleaks' `stdin -f json` interface and report shape. |
| trufflehog | **3.63.7** | latest 4 releases + floor | Older releases use the same `filesystem --json` interface; line numbers are absent before later 3.6x builds, which only affects the (advisory) reported line. |
| detect-secrets | **1.4.0** | latest 4 releases + floor | The `scan` baseline JSON shape has been stable across 1.2–1.5. |
<!-- END:compat-matrix -->

### Version support policy

- CI tests the **latest four releases** of each scanner — the current release plus the three before it — resolved live so the set tracks upstream, plus the documented **minimum supported version** (the oldest release the adapter still works with).
- This is the **N-3** window: the current release and the three preceding it are continuously verified.
- A **weekly scheduled run** re-resolves the latest releases, so a new scanner release that breaks an adapter is caught within a week (and on the next change to the adapters).
- Versions between the minimum and the tested window are supported on a best-effort basis. A minimum only moves **forward**, and only when a scanner's CLI or output format changes in a way the adapter cannot bridge; such a change is called out in the release notes.

You can reproduce the numbers below with `bun run scripts/scanner-bench.ts` (set `BENCH_SCANNERS=` / `BENCH_ITERS=` to narrow or lengthen the run).

### Latency

End-to-end per invocation (each scan spawns a fresh process, matching how the one-shot hook runs). These numbers are regenerated on real hardware with `bun run bench:docs` (not in CI, where shared-runner contention would make absolute timings unreliable); the [`scanner-compat` workflow](https://github.com/ch4nn0n/fencepost/actions/workflows/scanner-compat.yml) instead asserts only the *ordering* (gitleaks fastest) so the recommendation can't silently go stale.

<!-- BEGIN:bench-latency (generated by `bun run bench:docs` — do not edit by hand) -->
| Scanner | Version | Input size | Median (ms) | p95 (ms) |
|---|---|---|---|---|
| gitleaks | 8.28.0 | 1 KB | 95 | 100 |
| gitleaks | 8.28.0 | 50 KB | 194 | 238 |
| trufflehog | 3.91.1 | 1 KB | 6193 | 6854 |
| trufflehog | 3.91.1 | 50 KB | 5807 | 6300 |
| detect-secrets | 1.5.0 | 1 KB | 531 | 551 |
| detect-secrets | 1.5.0 | 50 KB | 572 | 650 |

_Measured on Linux x86_64, 2026-06-14 (median of 8 runs, warm-up dropped). Regenerate with `bun run bench:docs`. betterleaks not installed on this host — row(s) omitted; rerun on a machine with all four for a complete table._
<!-- END:bench-latency -->

Takeaways:

- **gitleaks is the clear default** — about an order of magnitude faster than the others and effectively free per call.
- **betterleaks reports the same exact spans as gitleaks** but currently carries a much higher per-call startup (~1.2 s), so it sits behind gitleaks in the `auto` order.
- **The cost is per-invocation startup, not input size** — every scanner is roughly flat from 1 KB to 50 KB, because each scan spawns a fresh process.
- **trufflehog's cost is detector initialization**; it stays in the multi-second range even for tiny inputs. The exact figure depends on the platform and trufflehog's self-update check.
- The **PreToolUse hook has a 5 s timeout** (the PostToolUse hook has 15 s). gitleaks and detect-secrets finish comfortably within both. **trufflehog can exceed the 5 s input-scanning window**, so prefer gitleaks (or detect-secrets) for input scanning, and reserve trufflehog for output scanning. The default `secrets.timeoutMs` is 10 s so trufflehog can complete on the output path.

## Limitations

- `Edit.old_string` is not scanned, by design: it is copied from the file, and scanning it would block the very edit that removes a secret.
- Redacted outputs longer than 10,000 characters are saved to a file with a preview by Claude Code (the saved file contains the *redacted* text).
- Scanners only find what their rules match. Entropy-based and keyword rules catch most real credentials, but no scanner is exhaustive.
