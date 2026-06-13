import { accessSync, constants } from "node:fs";
import { join, delimiter } from "node:path";
import type { SecretScannerName, SecretsConfig } from "../types.js";
import type { SecretScanner } from "./scanner.js";
import { GitleaksScanner } from "./gitleaks.js";
import { TrufflehogScanner } from "./trufflehog.js";
import { DetectSecretsScanner } from "./detect-secrets.js";

// Preference order: fastest and most precise first. gitleaks scans stdin in
// ~200ms and reports raw secret spans; detect-secrets is slowest (Python
// startup) and only reports line numbers.
const PREFERENCE: SecretScannerName[] = ["gitleaks", "trufflehog", "detect-secrets"];

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
