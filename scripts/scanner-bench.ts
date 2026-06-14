#!/usr/bin/env bun
/**
 * Benchmark + compatibility harness for the secret scanners fencepost supports.
 *
 * For every scanner found on PATH it:
 *  1. records the version,
 *  2. runs a correctness check (a known corpus must yield the expected finding)
 *     — this is the compatibility signal, and
 *  3. times the adapter end to end over N fresh invocations (each scan spawns a
 *     new process, matching how the one-shot hook actually runs), reporting
 *     median / p95 latency per input size.
 *
 * Output is a markdown table, so CI (which installs specific scanner versions)
 * and the docs can quote the same numbers. Run: `bun run scripts/scanner-bench.ts`.
 */
import { spawnSync } from "node:child_process";
import { binaryOnPath } from "../src/secrets/detect.js";
import { GitleaksScanner } from "../src/secrets/gitleaks.js";
import { BetterleaksScanner } from "../src/secrets/betterleaks.js";
import { TrufflehogScanner } from "../src/secrets/trufflehog.js";
import { DetectSecretsScanner } from "../src/secrets/detect-secrets.js";
import type { SecretScanner } from "../src/secrets/scanner.js";

// Assembled from fragments so the literal token never sits in a committed file.
const PAT = "ghp_" + "wWPw5k4aXcaT4fNP0UcnZwJUVFk6LO0pINUx";

const ITERS = Number(process.env["BENCH_ITERS"] ?? 9); // first run is dropped as war-up
const TIMEOUT_MS = 60_000;

interface Target {
  name: string;
  scanner: SecretScanner;
  version(): string;
}

const ALL_TARGETS: Target[] = [
  { name: "gitleaks", scanner: new GitleaksScanner(), version: () => run("gitleaks", ["version"]) },
  { name: "betterleaks", scanner: new BetterleaksScanner(), version: () => run("betterleaks", ["version"]) },
  { name: "trufflehog", scanner: new TrufflehogScanner(), version: () => run("trufflehog", ["--version"]) },
  { name: "detect-secrets", scanner: new DetectSecretsScanner(), version: () => run("detect-secrets", ["--version"]) },
];

// BENCH_SCANNERS=gitleaks,detect-secrets restricts the run (handy when one
// scanner is slow or you are validating a single pinned version).
const ONLY = (process.env["BENCH_SCANNERS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const TARGETS = ONLY.length ? ALL_TARGETS.filter((t) => ONLY.includes(t.name)) : ALL_TARGETS;

function run(bin: string, args: string[]): string {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  return `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n")[0]?.trim() ?? "?";
}

/** A corpus of roughly `bytes` size with one embedded secret. */
function corpus(bytes: number): string {
  const header = `# config sample\napi_token = "${PAT}"\n`;
  const filler = "const value = computeSomethingReasonable(a, b, c); // benign line\n";
  let body = header;
  while (Buffer.byteLength(body, "utf8") < bytes) body += filler;
  return body;
}

function stats(samples: number[]): { median: number; p95: number; min: number } {
  const s = [...samples].sort((a, b) => a - b);
  const at = (q: number) => s[Math.min(s.length - 1, Math.floor(q * s.length))]!;
  return { median: at(0.5), p95: at(0.95), min: s[0]! };
}

async function bench(scanner: SecretScanner, content: string): Promise<number[]> {
  const samples: number[] = [];
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    await scanner.scan(content, TIMEOUT_MS);
    const dt = performance.now() - t0;
    if (i > 0) samples.push(dt); // drop warm-up
  }
  return samples;
}

const SIZES: Array<{ label: string; bytes: number }> = [
  { label: "1 KB", bytes: 1024 },
  { label: "50 KB", bytes: 50 * 1024 },
];

async function main(): Promise<void> {
  const rows: string[] = [];
  const compat: string[] = [];

  for (const target of TARGETS) {
    if (!binaryOnPath(target.name)) {
      compat.push(`| ${target.name} | _not installed_ | skipped |`);
      continue;
    }
    const version = target.version();

    // Compatibility: the known corpus must produce at least one finding.
    const probe = corpus(512);
    let ok = false;
    let detail = "";
    try {
      const findings = await target.scanner.scan(probe, TIMEOUT_MS);
      ok = findings.length > 0;
      detail = `${findings.length} finding(s)`;
    } catch (err) {
      detail = `error: ${(err as Error).message.slice(0, 60)}`;
    }
    compat.push(`| ${target.name} | \`${version}\` | ${ok ? "✅ " : "❌ "}${detail} |`);
    if (!ok) continue;

    for (const size of SIZES) {
      const samples = await bench(target.scanner, corpus(size.bytes));
      const { median, p95, min } = stats(samples);
      rows.push(
        `| ${target.name} | \`${version}\` | ${size.label} | ${median.toFixed(0)} | ${p95.toFixed(0)} | ${min.toFixed(0)} |`,
      );
    }
  }

  const node = run("uname", ["-sm"]);
  console.log(`\n## Scanner compatibility (host: ${node}, iters: ${ITERS})\n`);
  console.log("| Scanner | Version | Correctness |");
  console.log("|---|---|---|");
  console.log(compat.join("\n"));
  console.log("\n## Scan latency (ms, end to end per invocation)\n");
  console.log("| Scanner | Version | Input size | Median | p95 | Min |");
  console.log("|---|---|---|---|---|---|");
  console.log(rows.join("\n"));
  console.log("");
}

await main();
