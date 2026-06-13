import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ScanUnavailableError, runScanner } from "./scanner.js";
import type { SecretFinding, SecretScanner } from "./scanner.js";

/**
 * gitleaks adapter. `gitleaks stdin` (v8.19+) scans piped content with no temp
 * file for the CONTENT, and reports raw secret text so redaction can replace
 * exact spans. The report goes to a temp file: gitleaks insists on opening its
 * report path itself, and /dev/stdout is not openable when the runtime backs
 * stdio with sockets (Bun does).
 */

interface GitleaksFinding {
  RuleID?: string;
  StartLine?: number;
  Secret?: string;
}

/** Parse `gitleaks ... -f json` report output. Exported for fixture tests. */
export function parseGitleaksOutput(stdout: string): SecretFinding[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const raw = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(raw)) throw new Error("expected a JSON array");
  const findings: SecretFinding[] = [];
  for (const item of raw as GitleaksFinding[]) {
    if (typeof item !== "object" || item === null) continue;
    const finding: SecretFinding = {
      scanner: "gitleaks",
      ruleId: String(item.RuleID ?? "unknown"),
      line: typeof item.StartLine === "number" ? item.StartLine : 0,
    };
    if (typeof item.Secret === "string" && item.Secret.length > 0) finding.secret = item.Secret;
    findings.push(finding);
  }
  return findings;
}

export class GitleaksScanner implements SecretScanner {
  readonly name = "gitleaks" as const;

  async scan(content: string, timeoutMs: number): Promise<SecretFinding[]> {
    // The report file holds found secrets; mkdtemp gives a 0700 dir and the
    // file is removed immediately after reading.
    const dir = await mkdtemp(join(tmpdir(), "fencepost-scan-"));
    try {
      const report = join(dir, "report.json");
      // --exit-code 0 keeps "found leaks" from looking like a failure.
      const result = await runScanner(
        "gitleaks",
        ["stdin", "--no-banner", "--exit-code", "0", "-f", "json", "-r", report, "-l", "error"],
        content,
        timeoutMs,
      );
      if (result.exitCode !== 0) {
        throw new ScanUnavailableError("gitleaks", `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
      }
      let reportText: string;
      try {
        reportText = await readFile(report, "utf8");
      } catch {
        return []; // no report written = nothing found
      }
      try {
        return parseGitleaksOutput(reportText);
      } catch (err) {
        throw new ScanUnavailableError("gitleaks", `unparseable report: ${(err as Error).message}`);
      }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
