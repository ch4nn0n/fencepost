// AST-backed bash evaluation (features 19/20/21). Bash always flows through
// here. Each extracted simple command is evaluated against the command-level
// prefix/regex rules, the structured argument/redirect rules, and any nested
// interpreter findings, combined in the standard tier order:
//
//   deny > smart-allow > ask > allow(prefix) > default
//
// The most restrictive command decision wins for a compound. Parse failure
// fails open (allow), preserving the project's fail-open posture.

import { extractBash } from "./ast.js";
import { analyseInterpreter } from "./ast-interp.js";
import { argumentRuleMatches, redirectRuleMatches } from "./rules.js";
import { normaliseCommand } from "./normalise.js";
import { prefixMatch } from "../util/prefix-match.js";
import { logger } from "../logger.js";
import type { Decision, EvalResult, FencepostConfig } from "../types.js";
import type { ExtractedCommand, Redirect } from "./ast.js";

function mostRestrictive(results: EvalResult[]): EvalResult {
  const rank: Record<Decision, number> = { deny: 3, ask: 2, allow: 1 };
  return results.reduce((best, curr) => (rank[curr.decision] > rank[best.decision] ? curr : best));
}

function safeTest(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern).test(text);
  } catch {
    return false;
  }
}

/** Evaluate one simple command across all rule sources in tier order. */
function evaluateCommand(
  cmd: ExtractedCommand,
  config: FencepostConfig,
  cwd: string,
  nested: EvalResult[],
): EvalResult {
  const bash = config.tools.bash;
  const text = normaliseCommand(cmd.text, bash.normalise);
  const args = bash.arguments ?? [];
  const redirects = bash.redirects ?? [];

  const argMatch = (d: Decision) =>
    args.filter((r) => r.decision === d).find((r) => argumentRuleMatches(r, cmd, cwd));
  const redirectMatch = (d: Decision) =>
    redirects
      .filter((r) => r.decision === d)
      .find((r) => cmd.redirects.some((rd) => redirectRuleMatches(r, rd, cwd)));
  const nestedMatch = (d: Decision) => nested.find((f) => f.decision === d);
  const base = (decision: Decision, reason: string, rule: string, alt?: string): EvalResult => ({
    decision,
    reason,
    matchedRule: rule,
    matchedInput: text,
    ...(alt ? { alternative: alt } : {}),
  });

  // Tier 1: deny.
  for (const rule of bash.deny) {
    if (prefixMatch(text, rule)) return base("deny", "Command denied by rule", `bash.deny: ${rule}`);
  }
  for (const check of bash.checks) {
    if (safeTest(check.test, text)) return base("deny", check.description, `bash.checks: ${check.test}`, check.alternative);
  }
  const argDeny = argMatch("deny");
  if (argDeny) return base("deny", argDeny.description ?? "Argument denied by rule", `bash.arguments: ${argDeny.command}`, argDeny.alternative);
  const redirDeny = redirectMatch("deny");
  if (redirDeny) return base("deny", redirDeny.description ?? "Redirect denied by rule", `bash.redirects`, redirDeny.alternative);
  const nestDeny = nestedMatch("deny");
  if (nestDeny) return { ...nestDeny, matchedInput: text };

  // Tier 2: smart-allow (explicit allow exceptions beat ask).
  for (const pattern of bash.allowChecks ?? []) {
    if (safeTest(pattern, text)) return base("allow", "Command allowed by rule", `bash.allowChecks: ${pattern}`);
  }
  const argAllow = argMatch("allow");
  if (argAllow) return base("allow", "Command allowed by rule", `bash.arguments: ${argAllow.command}`);
  const redirAllow = redirectMatch("allow");
  if (redirAllow) return base("allow", "Redirect allowed by rule", `bash.redirects`);
  const nestAllow = nestedMatch("allow");
  if (nestAllow) return { ...nestAllow, matchedInput: text };

  // Tier 3: ask.
  for (const rule of bash.ask) {
    if (prefixMatch(text, rule)) return base("ask", "Command requires approval", `bash.ask: ${rule}`);
  }
  const argAsk = argMatch("ask");
  if (argAsk) return base("ask", argAsk.description ?? "Argument requires approval", `bash.arguments: ${argAsk.command}`, argAsk.alternative);
  const redirAsk = redirectMatch("ask");
  if (redirAsk) return base("ask", redirAsk.description ?? "Redirect requires approval", `bash.redirects`, redirAsk.alternative);
  const nestAsk = nestedMatch("ask");
  if (nestAsk) return { ...nestAsk, matchedInput: text };

  // Tier 4: allow (prefix).
  for (const rule of bash.allow) {
    if (prefixMatch(text, rule)) return base("allow", "Command allowed by rule", `bash.allow: ${rule}`);
  }

  // Tier 5: default.
  return { decision: config.default, reason: `No matching rule; default is ${config.default}`, matchedInput: text };
}

/** Evaluate loose redirects (not bound to a single command) on their own. */
function evaluateLooseRedirects(
  looseRedirects: Redirect[],
  config: FencepostConfig,
  cwd: string,
): EvalResult | null {
  const redirects = config.tools.bash.redirects ?? [];
  for (const d of ["deny", "ask", "allow"] as Decision[]) {
    const rule = redirects
      .filter((r) => r.decision === d)
      .find((r) => looseRedirects.some((rd) => redirectRuleMatches(r, rd, cwd)));
    if (rule) {
      return {
        decision: d,
        reason: rule.description ?? `Redirect ${d} by rule`,
        matchedRule: "bash.redirects",
        matchedInput: looseRedirects.map((r) => `${r.op} ${r.target}`).join(" "),
        ...(rule.alternative ? { alternative: rule.alternative } : {}),
      };
    }
  }
  return null;
}

export async function evaluateBashAst(
  rawCommand: string,
  config: FencepostConfig,
  cwd: string,
): Promise<EvalResult> {
  const res = await extractBash(rawCommand);
  if (!res.ok) {
    logger.warn({ rawCommand }, "bash parse failed, failing open");
    return { decision: "allow", reason: "Parse failed; failing open", matchedInput: rawCommand };
  }

  const results: EvalResult[] = [];
  for (const cmd of res.commands) {
    const nested = await analyseInterpreter(cmd, config, cwd);
    results.push(evaluateCommand(cmd, config, cwd, nested));
  }
  const loose = evaluateLooseRedirects(res.looseRedirects, config, cwd);
  if (loose) results.push(loose);

  if (results.length === 0) {
    return { decision: config.default, reason: "No command found; using default", matchedInput: rawCommand };
  }

  const winner = mostRestrictive(results);
  if (results.length > 1) winner.isCompound = true;

  // Discourage chaining: a sequenced chain (&&, ||, ;) that would merely require
  // approval is denied with guidance to run the parts separately. Pipes and
  // control-flow constructs are exempt.
  if (
    config.tools.bash.discourageChaining === true &&
    !res.hadControlFlow &&
    res.hadSequencing &&
    winner.decision === "ask"
  ) {
    logger.info({ rawCommand }, "discouraging chained ask -> deny");
    return {
      decision: "deny",
      reason: "Chained commands that need approval should be run separately",
      matchedInput: rawCommand,
      isCompound: true,
      chained: true,
    };
  }

  logger.info({ command: rawCommand, decision: winner.decision, rule: winner.matchedRule }, "decision");
  return winner;
}
