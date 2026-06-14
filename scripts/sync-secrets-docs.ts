#!/usr/bin/env bun
/**
 * Keeps the generated blocks in docs/docs/configuration/secrets.md in sync with
 * their sources of truth, so the version-compatibility and performance claims
 * never drift from what CI actually verifies.
 *
 *   bun run scripts/sync-secrets-docs.ts            # rewrite the compat matrix from scanner-floors.json
 *   bun run scripts/sync-secrets-docs.ts --check    # CI guard: fail if the compat matrix is out of sync (no write)
 *   bun run scripts/sync-secrets-docs.ts --bench     # also re-measure latency on THIS machine and rewrite that table
 *
 * The compat matrix is regenerated from `scanner-floors.json` (no scanners
 * needed, safe in CI). The latency table is only touched with `--bench`, which
 * runs the real scanners — do that on a quiet machine, never in CI, because
 * shared-runner contention makes absolute timings meaningless.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const floorsPath = resolve(repoRoot, "scanner-floors.json");
const docPath = resolve(repoRoot, "docs/docs/configuration/secrets.md");

interface ScannerFloor {
  floor: string;
  note: string;
}

function loadFloors(): Record<string, ScannerFloor> {
  const parsed = JSON.parse(readFileSync(floorsPath, "utf8")) as {
    scanners?: Record<string, ScannerFloor>;
  };
  if (!parsed.scanners) throw new Error(`${floorsPath} has no "scanners" object`);
  return parsed.scanners;
}

/** Replace the text between `<!-- BEGIN:name ... -->` and `<!-- END:name -->`. */
function replaceBlock(doc: string, name: string, body: string): string {
  const re = new RegExp(`(<!-- BEGIN:${name}[^>]*-->\\n)[\\s\\S]*?(\\n<!-- END:${name} -->)`);
  if (!re.test(doc)) throw new Error(`marker block "${name}" not found in ${docPath}`);
  return doc.replace(re, `$1${body}$2`);
}

function compatMatrix(floors: Record<string, ScannerFloor>): string {
  const rows = Object.entries(floors).map(
    ([name, f]) => `| ${name} | **${f.floor}** | latest 4 releases + floor | ${f.note} |`,
  );
  return ["| Scanner | Minimum supported | Tested in CI | Notes |", "|---|---|---|---|", ...rows].join("\n");
}

async function latencyTable(): Promise<string> {
  const { collectResults } = await import("./scanner-bench.js");
  const report = await collectResults();
  const rows: string[] = [];
  for (const r of report.results) {
    if (!r.ok) continue;
    for (const s of r.sizes) {
      rows.push(`| ${r.name} | ${r.version} | ${s.label} | ${s.median.toFixed(0)} | ${s.p95.toFixed(0)} |`);
    }
  }
  if (rows.length === 0) throw new Error("no scanners produced timings — install at least gitleaks before --bench");
  const date = new Date().toISOString().slice(0, 10);
  const absent = report.results.filter((r) => !r.ok).map((r) => r.name);
  const absentNote = absent.length ? ` ${absent.join(", ")} not installed on this host — row(s) omitted; rerun on a machine with all four for a complete table.` : "";
  const caption = `_Measured on ${report.host}, ${date} (median of ${report.iters - 1} runs, warm-up dropped). Regenerate with \`bun run bench:docs\`.${absentNote}_`;
  return [
    "| Scanner | Version | Input size | Median (ms) | p95 (ms) |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    caption,
  ].join("\n");
}

const args = new Set(process.argv.slice(2));
const floors = loadFloors();
const original = readFileSync(docPath, "utf8");
let updated = replaceBlock(original, "compat-matrix", compatMatrix(floors));

if (args.has("--check")) {
  if (updated !== original) {
    console.error(
      `✗ ${docPath} compat matrix is out of sync with scanner-floors.json.\n  Run: bun run scripts/sync-secrets-docs.ts`,
    );
    process.exit(1);
  }
  console.log("✓ secrets.md compat matrix is in sync with scanner-floors.json");
  process.exit(0);
}

if (args.has("--bench")) {
  updated = replaceBlock(updated, "bench-latency", await latencyTable());
}

if (updated === original) {
  console.log("secrets.md already up to date");
} else {
  writeFileSync(docPath, updated);
  console.log(`Updated ${docPath}`);
}
