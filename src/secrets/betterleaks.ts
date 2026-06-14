import { scanWithGitleaksCli } from "./gitleaks.js";
import type { SecretFinding, SecretScanner } from "./scanner.js";

/**
 * betterleaks adapter. betterleaks is a gitleaks successor by the same team
 * (re2/aho-corasick matching, CEL filtering, optional secret validation), and
 * exposes the same `stdin -f json` interface and report JSON shape, so it reuses
 * the gitleaks CLI driver verbatim. Validation is never triggered: we pass no
 * validation flags, so no network calls are made from the hook.
 */
export class BetterleaksScanner implements SecretScanner {
  readonly name = "betterleaks" as const;

  scan(content: string, timeoutMs: number): Promise<SecretFinding[]> {
    return scanWithGitleaksCli("betterleaks", "betterleaks", content, timeoutMs);
  }
}
