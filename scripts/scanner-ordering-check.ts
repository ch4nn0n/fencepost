#!/usr/bin/env bun
/**
 * Guards the "gitleaks is the recommended scanner because it is the fastest"
 * claim in docs/docs/configuration/secrets.md.
 *
 * Two modes, because timing reliability depends on where you run it:
 *
 *   (default, strict — run LOCALLY on quiet hardware)
 *     gitleaks must be the fastest installed scanner. This is the real
 *     recommendation check (it catches betterleaks/detect-secrets overtaking
 *     gitleaks) but it is only trustworthy on an unloaded machine. Run it
 *     alongside `bun run bench:docs` when you refresh the latency numbers.
 *
 *   --ci (coarse — safe on noisy shared runners)
 *     Only asserts the gap that survives scheduling noise: gitleaks must be
 *     clearly faster than trufflehog, the multi-second outlier. A single
 *     process spawn on a shared CI runner can absorb hundreds of ms of jitter,
 *     so the sub-second scanners are indistinguishable there — but if gitleaks
 *     ever regressed into trufflehog's territory (e.g. an adapter retry loop),
 *     this still catches it. The fine gitleaks-vs-betterleaks ordering is left
 *     to the local strict run.
 *
 *   bun run scripts/scanner-ordering-check.ts        # strict (local)
 *   bun run scripts/scanner-ordering-check.ts --ci   # coarse (CI)
 */
import { collectResults } from "./scanner-bench.js";

const PROBE_SIZE = "1 KB"; // startup cost dominates; the smallest input is the cleanest signal.
const SLOW = "trufflehog"; // the known multi-second outlier
const ci = process.argv.slice(2).includes("--ci");

const report = await collectResults();
const timed = report.results.filter((r) => r.ok && r.sizes.length > 0);

function minAt(name: string): number | undefined {
  return timed.find((x) => x.name === name)?.sizes.find((s) => s.label === PROBE_SIZE)?.min;
}

const gitleaks = minAt("gitleaks");
if (gitleaks === undefined) {
  console.log("gitleaks not installed/timed — skipping ordering check (nothing to validate).");
  process.exit(0);
}

console.log(`Ordering check (${ci ? "coarse/CI" : "strict/local"}, host: ${report.host}, min latency @ ${PROBE_SIZE}):`);

if (ci) {
  // Coarse, noise-robust: gitleaks must be clearly faster than trufflehog.
  const slow = minAt(SLOW);
  if (slow === undefined) {
    console.log(`${SLOW} not installed/timed — skipping coarse check (no slow-tier baseline).`);
    process.exit(0);
  }
  console.log(`  gitleaks ${gitleaks.toFixed(0)}ms  vs  ${SLOW} ${slow.toFixed(0)}ms`);
  if (gitleaks >= slow) {
    console.error(
      `\n✗ gitleaks (${gitleaks.toFixed(0)}ms) is not faster than ${SLOW} (${slow.toFixed(0)}ms) — ` +
        `gitleaks has regressed out of the fast tier. Investigate the gitleaks adapter (src/secrets/gitleaks.ts).`,
    );
    process.exit(1);
  }
  console.log(`\n✓ gitleaks is clearly in the fast tier (well under ${SLOW}).`);
  process.exit(0);
}

// Strict (local): gitleaks must be the fastest installed scanner.
const violations: string[] = [];
for (const r of timed) {
  if (r.name === "gitleaks") continue;
  const other = r.sizes.find((s) => s.label === PROBE_SIZE)?.min;
  if (other === undefined) continue;
  const faster = other < gitleaks;
  console.log(`  gitleaks ${gitleaks.toFixed(0)}ms  vs  ${r.name} ${other.toFixed(0)}ms  ${faster ? "← FASTER than gitleaks" : "ok"}`);
  if (faster) violations.push(`${r.name} (${other.toFixed(0)}ms) is faster than gitleaks (${gitleaks.toFixed(0)}ms)`);
}

if (violations.length > 0) {
  console.error(
    `\n✗ The docs recommend gitleaks as the fastest scanner, but:\n  - ${violations.join("\n  - ")}\n` +
      `Re-confirm on quiet hardware; if it holds, update the recommendation in docs/docs/configuration/secrets.md ` +
      `and the auto-detect order in src/secrets/detect.ts.`,
  );
  process.exit(1);
}

console.log("\n✓ gitleaks is the fastest installed scanner — recommendation holds.");
