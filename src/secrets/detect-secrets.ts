import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ScanUnavailableError, runScanner } from "./scanner.js";
import type { SecretFinding, SecretScanner } from "./scanner.js";

/**
 * detect-secrets adapter. Lowest preference: Python startup costs ~0.5s and
 * the baseline output carries only hashed secrets plus line numbers, so
 * redaction degrades to replacing the whole flagged line.
 */

interface DetectSecretsResult {
  type?: string;
  line_number?: number;
}

/** Parse `detect-secrets scan <file>` baseline JSON. Exported for fixture tests. */
export function parseDetectSecretsOutput(stdout: string, filename: string): SecretFinding[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const raw = JSON.parse(trimmed) as { results?: Record<string, DetectSecretsResult[]> };
  const results = raw.results?.[filename];
  if (!Array.isArray(results)) return [];
  const findings: SecretFinding[] = [];
  for (const item of results) {
    if (typeof item !== "object" || item === null) continue;
    findings.push({
      scanner: "detect-secrets",
      ruleId: String(item.type ?? "unknown"),
      line: typeof item.line_number === "number" ? item.line_number : 0,
      // No `secret`: detect-secrets only emits hashes.
    });
  }
  return findings;
}

const SCAN_FILENAME = "content";

export const detectSecretsScanner: SecretScanner = {
  name: "detect-secrets",

  async scan(content, timeoutMs) {
    const dir = await mkdtemp(join(tmpdir(), "fencepost-scan-"));
    try {
      const file = join(dir, SCAN_FILENAME);
      await writeFile(file, content, { mode: 0o600 });

      // detect-secrets keys its results by the path relative to its cwd, so
      // run from the temp dir and scan the bare filename.
      const result = await runScanner("detect-secrets", ["scan", SCAN_FILENAME], null, timeoutMs, dir);
      if (result.exitCode !== 0) {
        throw new ScanUnavailableError("detect-secrets", `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
      }
      try {
        return parseDetectSecretsOutput(result.stdout, SCAN_FILENAME);
      } catch (err) {
        throw new ScanUnavailableError("detect-secrets", `unparseable output: ${(err as Error).message}`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  },
};
