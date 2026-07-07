import { logger } from "../logger.js";
import { matchesPathGlob } from "../util/path-match.js";
import { matchesGlob } from "../util/glob.js";
import type { EvalResult, FencepostConfig, HookInput, SecretsConfig } from "../types.js";
import type { SecretFinding, SecretScanner } from "./scanner.js";
import { findScanner } from "./detect.js";
import { redactFindings } from "./redact.js";
import type { RedactionSummary } from "./redact.js";

/**
 * Orchestrates secrets scanning for both hook directions (feature 24):
 * - scanToolInput: PreToolUse — deny inputs that embed a secret.
 * - scanToolOutput: PostToolUse — redact secrets from output before the model
 *   sees it.
 *
 * Failure posture depends on whether a scanner is PINNED:
 * - `scanner: auto` (default) fails OPEN — a missing or broken scanner skips
 *   scanning so onboarding is never blocked. SessionStart guidance warns.
 * - `scanner: <name>` is a deliberate choice, so an unavailable scanner is a
 *   misconfiguration: it fails CLOSED — inputs are denied and output is
 *   withheld until the scanner is installed (or `scanner` is set back to auto).
 */

/** True when the user pinned a specific scanner (not "auto"). */
function isPinned(secrets: SecretsConfig): boolean {
  return (secrets.scanner ?? "auto") !== "auto";
}

// Tool-input fields that carry NEW content worth scanning. Edit.old_string is
// deliberately absent: it is copied from the file, and scanning it would block
// the edits that remove a secret.
const INPUT_FIELDS_BY_TOOL: Record<string, string[]> = {
  Write: ["content"],
  Edit: ["new_string"],
  NotebookEdit: ["new_source"],
  Bash: ["command"],
};

const PATH_FIELDS = ["file_path", "notebook_path"] as const;

// Default ceiling on how much content we hand a scanner. Raised from 1 MiB so
// ordinary large reads/diffs are still scanned (gitleaks cost is ~flat with
// size); on the OUTPUT path, content over this is withheld rather than passed
// through unscanned (see scanToolOutput).
const DEFAULT_MAX_SCAN_BYTES = 5_242_880; // 5 MiB

function ruleAllowed(finding: SecretFinding, allowRules: string[]): boolean {
  const key = `${finding.scanner}:${finding.ruleId}`;
  return allowRules.some((pattern) => matchesGlob(key, pattern));
}

function filterAllowedRules(findings: SecretFinding[], secrets: SecretsConfig): SecretFinding[] {
  const allowRules = secrets.allow?.rules ?? [];
  if (allowRules.length === 0) return findings;
  return findings.filter((f) => !ruleAllowed(f, allowRules));
}

// Returns the findings, or null when the scan could not run (spawn error,
// timeout, unparseable output). Callers decide open/closed from isPinned().
async function runScan(
  scanner: SecretScanner,
  content: string,
  secrets: SecretsConfig,
): Promise<SecretFinding[] | null> {
  try {
    return await scanner.scan(content, secrets.timeoutMs ?? 10000);
  } catch (err) {
    logger.warn({ err, scanner: scanner.name }, "secret scan could not run");
    return null;
  }
}

/** A fail-closed deny when the pinned scanner is unavailable (PreToolUse). */
function scannerUnavailableDeny(secrets: SecretsConfig, toolName: string): EvalResult {
  const name = secrets.scanner;
  return {
    decision: "deny",
    reason: `Fencepost is configured to scan for secrets with '${name}', but it could not run, so this input could not be checked. Failing closed.`,
    alternative: `Install '${name}' (or set secrets.scanner to "auto" or another installed scanner), then retry.`,
    matchedRule: `secrets.unavailable:${String(name)}`,
    matchedInput: toolName,
  };
}

// ---- PreToolUse: deny secret-bearing inputs ----

// scannerOverride: undefined = resolve from PATH; null = force "unavailable"
// (used by tests, since every scanner is installed on dev machines); an
// instance = use it directly.
export async function scanToolInput(
  input: HookInput,
  config: FencepostConfig,
  scannerOverride?: SecretScanner | null,
): Promise<EvalResult | null> {
  const secrets = config.secrets;
  if (!secrets?.enabled || secrets.scanInputs === false) return null;

  const fields = INPUT_FIELDS_BY_TOOL[input.tool_name];
  if (!fields || !(secrets.inputTools ?? Object.keys(INPUT_FIELDS_BY_TOOL)).includes(input.tool_name)) {
    return null;
  }

  // Allowlisted target paths (e.g. .env.example, test fixtures) are exempt.
  const allowPaths = secrets.allow?.paths ?? [];
  for (const pathField of PATH_FIELDS) {
    const target = input.tool_input[pathField];
    if (typeof target === "string" && allowPaths.some((g) => matchesPathGlob(target, g, input.cwd))) {
      return null;
    }
  }

  const content = fields
    .map((f) => input.tool_input[f])
    .filter((v): v is string => typeof v === "string")
    .join("\n");
  if (!content) return null;
  if (Buffer.byteLength(content, "utf8") > (secrets.maxScanBytes ?? DEFAULT_MAX_SCAN_BYTES)) return null;

  const scanner = scannerOverride === undefined ? findScanner(secrets) : scannerOverride;
  if (!scanner) {
    // Pinned-but-missing scanner: fail closed. Auto: fail open.
    return isPinned(secrets) ? scannerUnavailableDeny(secrets, input.tool_name) : null;
  }

  const findings = await runScan(scanner, content, secrets);
  if (!findings) {
    // The scan errored. Pinned: fail closed. Auto: fail open.
    return isPinned(secrets) ? scannerUnavailableDeny(secrets, input.tool_name) : null;
  }
  const live = filterAllowedRules(findings, secrets);
  if (live.length === 0) return null;

  const rules = [...new Set(live.map((f) => `${f.scanner}:${f.ruleId}`))];
  // The reason names the rule only — the secret value must never be echoed
  // back into the conversation or the audit log.
  return {
    decision: "deny",
    reason: `The ${input.tool_name} input contains what looks like a secret (${rules.join(", ")}). Secrets must not be written into files or commands.`,
    alternative:
      "Reference the secret from its existing source (an environment variable, a secrets manager, or the file it already lives in) instead of embedding the value. " +
      `If this is a false positive, the user can allowlist the rule under secrets.allow.rules (e.g. "${rules[0]}") ` +
      "or exempt the target path under secrets.allow.paths in their fencepost config.",
    matchedRule: `secrets.${rules[0]}`,
    matchedInput: input.tool_name,
  };
}

// ---- PostToolUse: redact secrets from output ----

export interface OutputScanResult {
  updatedToolOutput: unknown; // same shape as tool_response, strings redacted
  redactions: RedactionSummary[];
  // Set when the whole output was withheld (fail closed) because it could not be
  // scanned. `context` overrides the default redaction note; `scanner` names the
  // scanner involved (for the audit log) when one is known.
  withheld?: boolean;
  context?: string;
  scanner?: string;
}

const MAX_WALK_DEPTH = 8;

/** Collect every string leaf of an arbitrary tool_response shape. */
function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > MAX_WALK_DEPTH) return;
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, depth + 1);
  } else if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value)) collectStrings(v, out, depth + 1);
  }
}

interface RedactWalk {
  findings: SecretFinding[];
  summaries: Map<string, RedactionSummary>;
  // Findings were produced from the "\n"-joined leaves, so line-only findings
  // must be shifted to each leaf's local line numbering. Leaves are visited in
  // the same order as collectStrings, tracked by leafIndex.
  leafLineStarts: number[]; // 1-based starting line of each leaf in the joined content
  leafIndex: number;
}

/** Deep-clone `value`, redacting every string leaf. Preserves shape exactly. */
function redactValue(value: unknown, walk: RedactWalk, depth = 0): unknown {
  if (depth > MAX_WALK_DEPTH) return value;
  if (typeof value === "string") {
    const lineStart = walk.leafLineStarts[walk.leafIndex++] ?? 1;
    const localFindings = walk.findings
      .map((f) => (f.secret ? f : { ...f, line: f.line - lineStart + 1 }))
      .filter((f) => f.secret || f.line >= 1);
    const result = redactFindings(value, localFindings);
    for (const r of result.redactions) {
      const key = `${r.scanner}:${r.ruleId}`;
      const existing = walk.summaries.get(key);
      if (existing) existing.count += r.count;
      else walk.summaries.set(key, { ...r });
    }
    return result.text;
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v, walk, depth + 1));
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactValue(v, walk, depth + 1);
    return out;
  }
  return value;
}

/**
 * Fail-closed output: the content could not be scanned, so it cannot be vouched
 * safe. Replace the whole response with a text notice (the shape Claude Code
 * documents for updatedToolOutput) so no unscanned content reaches the model —
 * discarding the original content is the point.
 */
function withheldResult(notice: string, context: string, scanner?: string): OutputScanResult {
  return {
    updatedToolOutput: { type: "text", text: `[${notice}]` },
    redactions: [],
    withheld: true,
    context,
    scanner,
  };
}

/** Withhold because the scanner could not run (unavailable, spawn error, or timeout). */
function scannerUnavailableWithhold(scannerName: string): OutputScanResult {
  return withheldResult(
    `Fencepost withheld this output: the secret scanner '${scannerName}' could not run, so it could not be scanned for secrets. Failing closed.`,
    `Fencepost withheld this tool output because the scanner '${scannerName}' could not run, so it could not ` +
      `be checked for secrets — passing it through could leak an unscanned secret to the model. ` +
      `Tell the user to check the '${scannerName}' install, or set secrets.scanner to "auto".`,
    scannerName,
  );
}

/** Withhold because the output is larger than the scan-size limit. */
function oversizeWithhold(limit: number): OutputScanResult {
  return withheldResult(
    `Fencepost withheld this output: it is larger than the ${limit}-byte scan limit (secrets.maxScanBytes), so it could not be scanned for secrets. Failing closed.`,
    `Fencepost withheld this tool output because it exceeds the secrets.maxScanBytes limit (${limit} bytes), so it ` +
      `could not be checked for secrets. Ask the user to raise secrets.maxScanBytes if large outputs must pass, ` +
      `or narrow the read/command so the output is smaller.`,
    "oversize",
  );
}

// scannerOverride: undefined = resolve from PATH; null = force "unavailable".
export async function scanToolOutput(
  toolName: string,
  toolResponse: unknown,
  config: FencepostConfig,
  scannerOverride?: SecretScanner | null,
): Promise<OutputScanResult | null> {
  const secrets = config.secrets;
  if (!secrets?.enabled || secrets.scanOutputs === false) return null;
  if (!(secrets.outputTools ?? []).includes(toolName)) return null;

  const pieces: string[] = [];
  collectStrings(toolResponse, pieces);
  const content = pieces.join("\n");
  if (!content) return null;
  const limit = secrets.maxScanBytes ?? DEFAULT_MAX_SCAN_BYTES;
  if (Buffer.byteLength(content, "utf8") > limit) {
    // Too large to scan: withhold rather than pass through unscanned, so an
    // oversize output can't become a hole that leaks a secret to the model.
    logger.warn({ toolName }, "tool output exceeds secrets.maxScanBytes, withholding");
    return oversizeWithhold(limit);
  }

  const scanner = scannerOverride === undefined ? findScanner(secrets) : scannerOverride;
  if (!scanner) {
    // No scanner installed at all. Pinned: withhold. Auto: fail open — this is an
    // onboarding state (session-start guidance warns), not a scan failure.
    return isPinned(secrets) ? scannerUnavailableWithhold(String(secrets.scanner)) : null;
  }

  const findings = await runScan(scanner, content, secrets);
  if (!findings) {
    // A scanner IS present but the scan failed (spawn error/timeout). Withhold in
    // BOTH auto and pinned: a present scanner that can't vouch for the output must
    // not silently pass it to the model.
    return scannerUnavailableWithhold(scanner.name);
  }
  const live = filterAllowedRules(findings, secrets);
  if (live.length === 0) return null;

  // Starting line of each leaf within the "\n"-joined scan content.
  const leafLineStarts: number[] = [];
  let line = 1;
  for (const piece of pieces) {
    leafLineStarts.push(line);
    line += piece.split("\n").length;
  }

  const summaries = new Map<string, RedactionSummary>();
  const walk: RedactWalk = { findings: live, summaries, leafLineStarts, leafIndex: 0 };
  const updatedToolOutput = redactValue(toolResponse, walk);
  if (summaries.size === 0) return null; // findings didn't map onto any leaf

  return { updatedToolOutput, redactions: [...summaries.values()] };
}

/** The agent-facing note that accompanies a redacted output. */
export function redactionContext(redactions: RedactionSummary[]): string {
  const total = redactions.reduce((n, r) => n + r.count, 0);
  const rules = redactions.map((r) => `${r.scanner}:${r.ruleId}`).join(", ");
  return (
    `Fencepost redacted ${total} secret value(s) from this tool output (${rules}). ` +
    "The [FENCEPOST:REDACTED ...] placeholders are not recoverable; do not attempt to reconstruct, " +
    "re-read, or guess the original values. If the secret is needed, ask the user."
  );
}
