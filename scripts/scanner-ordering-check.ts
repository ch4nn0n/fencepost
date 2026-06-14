#!/usr/bin/env bun
/**
 * Guards the "gitleaks is the recommended scanner because it is the fastest"
 * claim in docs/docs/configuration/secrets.md.
 *
 * The absolute latency numbers in the docs are measured on real hardware and
 * are not asserted in CI (shared runners are too noisy). What IS stable enough
 * to assert — even on a noisy runner — is the *ordering*: gitleaks should be
 * the fastest installed scanner. If another scanner overtakes it, the
 * recommendation is stale and this exits non-zero so CI fails loudly.
 *
 * Uses the minimum observed latency per scanner (the least contention-polluted
 * sample) and only compares scanners that are actually installed. Skips quietly
 * if gitleaks itself is not installed (nothing to validate).
 *
 *   bun run scripts/scanner-ordering-check.ts
 */
import { collectResults } from "./scanner-bench.js";

const PROBE_SIZE = "1 KB"; // startup cost dominates; the smallest input is the cleanest signal.

const report = await collectResults();
const timed = report.results.filter((r) => r.ok && r.sizes.length > 0);

function minAt(name: string): number | undefined {
  const r = timed.find((x) => x.name === name);
  return r?.sizes.find((s) => s.label === PROBE_SIZE)?.min;
}

const gitleaks = minAt("gitleaks");
if (gitleaks === undefined) {
  console.log("gitleaks not installed/timed — skipping ordering check (nothing to validate).");
  process.exit(0);
}

console.log(`Ordering check (host: ${report.host}, min latency @ ${PROBE_SIZE}):`);
const others = timed.filter((r) => r.name !== "gitleaks");
const violations: string[] = [];
for (const r of others) {
  const other = r.sizes.find((s) => s.label === PROBE_SIZE)?.min;
  if (other === undefined) continue;
  const faster = other < gitleaks;
  console.log(`  gitleaks ${gitleaks.toFixed(0)}ms  vs  ${r.name} ${other.toFixed(0)}ms  ${faster ? "← FASTER than gitleaks" : "ok"}`);
  if (faster) {
    violations.push(`${r.name} (${other.toFixed(0)}ms) is faster than gitleaks (${gitleaks.toFixed(0)}ms)`);
  }
}

if (violations.length > 0) {
  console.error(
    `\n✗ The docs recommend gitleaks as the fastest scanner, but:\n  - ${violations.join("\n  - ")}\n` +
      `Update the recommendation in docs/docs/configuration/secrets.md (and the auto-detect order in src/secrets/detect.ts) or re-confirm the measurement.`,
  );
  process.exit(1);
}

console.log("\n✓ gitleaks is the fastest installed scanner — recommendation holds.");
