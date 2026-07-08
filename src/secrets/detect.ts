import { accessSync, constants } from "node:fs";
import { join, delimiter } from "node:path";
import type { SecretScannerName, SecretsConfig } from "../types.js";
import type { SecretScanner } from "./scanner.js";
import { GitleaksScanner } from "./gitleaks.js";
import { BetterleaksScanner } from "./betterleaks.js";
import { TrufflehogScanner } from "./trufflehog.js";
import { DetectSecretsScanner } from "./detect-secrets.js";

// Preference order = recommendation order. gitleaks is the recommended default
// (ubiquitous, mature, ~100ms, packaged everywhere), so auto picks it first;
// betterleaks (its gitleaks-compatible successor) is the drop-in alternative.
// Both report raw secret spans. trufflehog is slow; detect-secrets is slowest
// (Python startup) and reports only line numbers. Pin `scanner:` to override.
const PREFERENCE: SecretScannerName[] = ["gitleaks", "betterleaks", "trufflehog", "detect-secrets"];

/** True if `bin` resolves to an executable on PATH. */
export function binaryOnPath(bin: string): boolean {
  const path = process.env["PATH"] ?? "";
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    try {
      accessSync(join(dir, bin), constants.X_OK);
      return true;
    } catch {
      /* keep looking */
    }
  }
  return false;
}

function makeScanner(name: SecretScannerName): SecretScanner {
  switch (name) {
    case "gitleaks":
      return new GitleaksScanner();
    case "betterleaks":
      return new BetterleaksScanner();
    case "trufflehog":
      return new TrufflehogScanner();
    case "detect-secrets":
      return new DetectSecretsScanner();
  }
}

/**
 * Find a usable scanner per config preference, or null if none is installed.
 * A PATH probe only — actual invocation failures surface later as
 * ScanUnavailableError and are handled fail-open.
 */
export function findScanner(secrets: SecretsConfig | undefined): SecretScanner | null {
  const pref = secrets?.scanner ?? "auto";
  const candidates = pref === "auto" ? PREFERENCE : [pref];
  for (const name of candidates) {
    if (binaryOnPath(name)) return makeScanner(name);
  }
  return null;
}
