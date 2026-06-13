import { spawn } from "node:child_process";
import type { SecretScannerName } from "../types.js";

/**
 * Secrets scanning via external scanners (feature 24). Fencepost deliberately
 * does not maintain its own detection rules: it shells out to whichever of
 * gitleaks / trufflehog / detect-secrets the user has installed and treats any
 * failure as "scan unavailable" (fail open).
 */

export interface SecretFinding {
  scanner: SecretScannerName;
  ruleId: string; // gitleaks RuleID | trufflehog DetectorName | detect-secrets type
  line: number; // 1-based; 0 = unknown
  secret?: string; // raw secret text when the scanner provides it (gitleaks, trufflehog)
}

export interface SecretScanner {
  readonly name: SecretScannerName;
  /** Scan `content`; throws ScanUnavailableError on spawn/parse/timeout failure. */
  scan(content: string, timeoutMs: number): Promise<SecretFinding[]>;
}

/** The scanner could not produce a result; callers should fail open. */
export class ScanUnavailableError extends Error {
  constructor(scanner: string, detail: string) {
    super(`${scanner}: ${detail}`);
    this.name = "ScanUnavailableError";
  }
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Spawn a scanner binary, optionally piping `stdinText`, with a hard timeout.
 * Plain node API (no Bun-only calls) — the committed bundle runs on either.
 */
export function runScanner(
  bin: string,
  args: string[],
  stdinText: string | null,
  timeoutMs: number,
  cwd?: string,
): Promise<RunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"], cwd });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      rejectPromise(new ScanUnavailableError(bin, `timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d: Buffer) => (stdout += d.toString("utf8")));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString("utf8")));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectPromise(new ScanUnavailableError(bin, `failed to spawn: ${err.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ exitCode: code ?? -1, stdout, stderr });
    });

    if (stdinText !== null) {
      // EPIPE here just means the child exited early; "close" still fires.
      child.stdin.on("error", () => {});
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}
