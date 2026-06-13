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
    return await scanner.scan(content, secrets.timeoutMs ?? 3000);
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
  if (Buffer.byteLength(content, "utf8") > (secrets.maxScanBytes ?? 1048576)) return null;

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
      "Reference the secret from its existing source (an environment variable, a secrets manager, or the file it already lives in) instead of embedding the value.",
    matchedRule: `secrets.${rules[0]}`,
    matchedInput: input.tool_name,
  };
}

// ---- PostToolUse: redact secrets from output ----

export interface OutputScanResult {
  updatedToolOutput: unknown; // same shape as tool_response, strings redacted
  redactions: RedactionSummary[];
  // Set when the pinned scanner was unavailable and the whole output was
  // withheld (fail closed). `context` overrides the default redaction note.
  withheld?: boolean;
  context?: string;
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
 * Fail-closed output: the pinned scanner could not run, so the output cannot be
 * vouched safe. Replace the whole response with a text notice (the shape Claude
 * Code documents for updatedToolOutput) so no unscanned content reaches the
 * model — discarding the original content is the point.
 */
function withheldOutput(secrets: SecretsConfig): OutputScanResult {
  const name = String(secrets.scanner);
  const notice = `[Fencepost withheld this output: the configured secret scanner '${name}' could not run, so it could not be scanned for secrets. Failing closed.]`;
  return {
    updatedToolOutput: { type: "text", text: notice },
    redactions: [],
    withheld: true,
    context:
      `Fencepost could not scan this tool output because the configured scanner '${name}' is unavailable, ` +
      `so the output was withheld (fail closed). Tell the user to install '${name}' or set secrets.scanner to "auto".`,
  };
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
  if (Buffer.byteLength(content, "utf8") > (secrets.maxScanBytes ?? 1048576)) {
    // A deliberate size policy, not scanner unavailability — fail open either
    // way so a single huge output never wedges the session.
    logger.warn({ toolName }, "tool output exceeds secrets.maxScanBytes, skipping scan");
    return null;
  }

  const scanner = scannerOverride === undefined ? findScanner(secrets) : scannerOverride;
  if (!scanner) {
    return isPinned(secrets) ? withheldOutput(secrets) : null;
  }

  const findings = await runScan(scanner, content, secrets);
  if (!findings) {
    return isPinned(secrets) ? withheldOutput(secrets) : null;
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
