import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ScanUnavailableError, runScanner } from "./scanner.js";
import type { SecretFinding, SecretScanner } from "./scanner.js";

/**
 * trufflehog adapter. trufflehog only scans regular files (piping to
 * /dev/stdin silently yields zero findings), so content goes through a
 * 0600 temp file that is removed immediately after the scan.
 * --no-verification is mandatory: a hook must never make network calls.
 */

interface TrufflehogFinding {
  DetectorName?: string;
  Raw?: string;
  RawV2?: string;
  SourceMetadata?: { Data?: { Filesystem?: { line?: number } } };
}

/** Parse trufflehog NDJSON output. Exported for fixture tests. */
export function parseTrufflehogOutput(stdout: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let item: TrufflehogFinding;
    try {
      item = JSON.parse(trimmed) as TrufflehogFinding;
    } catch {
      continue; // log noise interleaved with findings; skip non-JSON lines
    }
    if (typeof item !== "object" || item === null || !item.DetectorName) continue;
    const secret = item.Raw || item.RawV2 || "";
    const finding: SecretFinding = {
      scanner: "trufflehog",
      ruleId: String(item.DetectorName),
      line: item.SourceMetadata?.Data?.Filesystem?.line ?? 0,
    };
    if (secret) finding.secret = secret;
    findings.push(finding);
  }
  return findings;
}

export class TrufflehogScanner implements SecretScanner {
  readonly name = "trufflehog" as const;

  async scan(content: string, timeoutMs: number): Promise<SecretFinding[]> {
    const dir = await mkdtemp(join(tmpdir(), "fencepost-scan-"));
    try {
      const file = join(dir, "content");
      await writeFile(file, content, { mode: 0o600 });

      const baseArgs = ["filesystem", file, "--json", "--no-verification", "--log-level=-1"];
      // Vanilla installs need --no-update to skip the network update check, but
      // some wrappers (e.g. nix) already inject it and kingpin rejects repeats.
      let result = await runScanner("trufflehog", [...baseArgs, "--no-update"], null, timeoutMs);
      if (result.exitCode !== 0 && /cannot be repeated/.test(result.stderr)) {
        result = await runScanner("trufflehog", baseArgs, null, timeoutMs);
      }
      if (result.exitCode !== 0) {
        throw new ScanUnavailableError("trufflehog", `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
      }
      return parseTrufflehogOutput(result.stdout);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
