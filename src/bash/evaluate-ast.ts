// AST-backed bash evaluation (features 19/20/21). Bash always flows through
// here. Each extracted simple command is evaluated against the command-level
// prefix/regex rules, the structured argument/redirect rules, and any nested
// interpreter findings, combined in the standard tier order:
//
//   deny > smart-allow > ask > allow(prefix) > default
//
// The most restrictive command decision wins for a compound. Parse failure
// applies the configured onError posture (default ask).

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

/** Distinct matchedInput parts across every ask-level result. */
function askParts(results: EvalResult[]): string[] {
  return [
    ...new Set(
      results
        .filter((r) => r.decision === "ask")
        .flatMap((r) => r.matchedInputs ?? (r.matchedInput ? [r.matchedInput] : [])),
    ),
  ];
}

const SHELL_WRAPPERS = new Set(["sh", "bash", "dash", "zsh", "ash", "ksh"]);
const MAX_WRAPPER_DEPTH = 8;

/**
 * If a command hands a script string to a shell wrapper (`sh -c CODE`,
 * `bash -c CODE`) or to `eval`, return that inner code so it can be re-parsed and
 * evaluated. Otherwise the inner command would ride through as an inert argument,
 * evading every prefix/argument/redirect rule.
 */
function shellWrapperCode(cmd: ExtractedCommand): string | null {
  if (cmd.name === "eval") {
    const code = cmd.args.join(" ").trim();
    return code || null;
  }
  if (cmd.name && SHELL_WRAPPERS.has(cmd.name)) {
    const i = cmd.args.indexOf("-c");
    if (i !== -1 && i + 1 < cmd.args.length) return cmd.args[i + 1] || null;
  }
  return null;
}

// GNU xargs option surface, used to find where the wrapped command starts.
// Value-taking flags consume the rest of their bundle or the next token.
const XARGS_VALUE_FLAGS = new Set(["a", "d", "E", "I", "L", "n", "P", "s"]);
// Deprecated flags whose value is optional and must be attached (-iR, -lN, -eEOF).
const XARGS_ATTACHED_OPTIONAL_FLAGS = new Set(["e", "i", "l"]);
const XARGS_PLAIN_FLAGS = new Set(["0", "o", "p", "r", "t", "x"]);
const XARGS_VALUE_LONGS = new Set([
  "--arg-file",
  "--delimiter",
  "--max-args",
  "--max-chars",
  "--max-procs",
  "--process-slot-var",
]);
// Long options whose optional value is only accepted attached (--eof=STR).
const XARGS_OPTIONAL_LONGS = new Set(["--eof", "--max-lines", "--replace"]);
const XARGS_PLAIN_LONGS = new Set([
  "--null",
  "--no-run-if-empty",
  "--interactive",
  "--verbose",
  "--exit",
  "--open-tty",
  "--show-limits",
  "--help",
  "--version",
]);

type XargsPayload =
  | { kind: "command"; cmd: ExtractedCommand }
  | { kind: "opaque"; flag: string }
  | null; // not xargs, or no inner command (bare `xargs` defaults to echo)

/**
 * Extract the command an `xargs` invocation will run, as a structured command
 * built from the already-unquoted argv tokens. Deliberately NOT re-joined and
 * re-parsed as shell: xargs execs its argv directly without a shell, and
 * re-parsing a joined string would lose token boundaries (`xargs sh -c 'git
 * clean -xfd'` would truncate the -c payload to `git`, a permissive misparse).
 *
 * Any flag not in the tables above makes the invocation opaque: guessing wrong
 * about whether it consumes the next token would misplace the command start,
 * and a wrong guess can dress a dangerous command up as an allowed one
 * (`xargs -E grep rm -rf /` runs rm, not grep).
 */
function xargsInnerCommand(cmd: ExtractedCommand): XargsPayload {
  if (cmd.name !== "xargs") return null;
  const toks = cmd.args;
  let i = 0;
  while (i < toks.length) {
    const t = toks[i]!;
    if (t === "--") {
      i++;
      break;
    }
    if (!t.startsWith("-") || t === "-") break; // the inner command starts here
    if (t.startsWith("--")) {
      const eq = t.indexOf("=");
      const name = eq === -1 ? t : t.slice(0, eq);
      if (XARGS_PLAIN_LONGS.has(name) || XARGS_OPTIONAL_LONGS.has(name)) i += 1;
      else if (XARGS_VALUE_LONGS.has(name)) i += eq === -1 ? 2 : 1;
      else return { kind: "opaque", flag: t };
    } else {
      // Short-flag bundle: plain flags may precede one value-taking flag, whose
      // value is the rest of the bundle or, when that is empty, the next token.
      let consumesNext = false;
      for (let j = 1; j < t.length; j++) {
        const ch = t[j]!;
        if (XARGS_PLAIN_FLAGS.has(ch)) continue;
        if (XARGS_VALUE_FLAGS.has(ch)) {
          consumesNext = j === t.length - 1;
          break;
        }
        if (XARGS_ATTACHED_OPTIONAL_FLAGS.has(ch)) break; // value, if any, is attached
        return { kind: "opaque", flag: t };
      }
      i += consumesNext ? 2 : 1;
    }
  }
  const rest = toks.slice(i);
  const name = rest[0];
  if (!name) return null;
  return {
    kind: "command",
    cmd: { text: rest.join(" "), name, args: rest.slice(1), redirects: [], heredoc: null },
  };
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
  // A nested allow vouches for the inline code only when no other nested rule
  // objected; otherwise a benign call (json.dumps) alongside a flagged one
  // (subprocess.run) would smart-allow the whole snippet.
  const nestAllow = nestedMatch("allow");
  if (nestAllow && !nestedMatch("ask")) return { ...nestAllow, matchedInput: text };

  // Tier 3: ask.
  for (const rule of bash.ask) {
    if (prefixMatch(text, rule)) return base("ask", "Command requires approval", `bash.ask: ${rule}`);
  }
  const argAsk = argMatch("ask");
  if (argAsk) return base("ask", argAsk.description ?? "Argument requires approval", `bash.arguments: ${argAsk.command}`, argAsk.alternative);
  const redirAsk = redirectMatch("ask");
  if (redirAsk) return base("ask", redirAsk.description ?? "Redirect requires approval", `bash.redirects`, redirAsk.alternative);
  // Keep the nested finding's own matchedInput (the flagged call/write/import):
  // it names the part to review, where the outer text is often a wall of code.
  const nestAsk = nestedMatch("ask");
  if (nestAsk) {
    const parts = askParts(nested);
    return { ...nestAsk, ...(parts.length > 1 ? { matchedInputs: parts } : {}) };
  }

  // Tier 4: allow (prefix).
  for (const rule of bash.allow) {
    if (prefixMatch(text, rule)) return base("allow", "Command allowed by rule", `bash.allow: ${rule}`);
  }

  // Tier 5: default.
  return { decision: config.default, reason: `No matching rule; default is ${config.default}`, matchedInput: text };
}

/**
 * Evaluate one extracted command plus anything it wraps. Shell bodies carried
 * by `sh -c` / `bash -c` / `eval` are re-parsed and evaluated so their inner
 * commands face the full rule set instead of riding through as a string
 * argument; the argv handed to `xargs` is evaluated as a command in its own
 * right for the same reason.
 */
async function evaluateExtracted(
  cmd: ExtractedCommand,
  config: FencepostConfig,
  cwd: string,
  depth: number,
  results: EvalResult[],
): Promise<void> {
  const nested = await analyseInterpreter(cmd, config, cwd);
  results.push(evaluateCommand(cmd, config, cwd, nested));

  const inner = shellWrapperCode(cmd);
  if (inner) results.push(await evaluateBashAst(inner, config, cwd, depth + 1));

  const payload = xargsInnerCommand(cmd);
  if (!payload) return;
  const onError = config.onError ?? "ask";
  if (payload.kind === "opaque") {
    results.push({
      decision: onError,
      reason: `Unrecognised xargs flag ${payload.flag}; cannot tell where the inner command starts.`,
      matchedInput: cmd.text,
    });
    return;
  }
  if (depth >= MAX_WRAPPER_DEPTH) {
    logger.warn({ command: cmd.text, depth }, "xargs nesting too deep, applying onError posture");
    results.push({
      decision: onError,
      reason: "Command nests wrappers too deeply to analyse safely.",
      matchedInput: cmd.text,
    });
    return;
  }
  await evaluateExtracted(payload.cmd, config, cwd, depth + 1, results);
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
  depth = 0,
): Promise<EvalResult> {
  if (depth > MAX_WRAPPER_DEPTH) {
    const onError = config.onError ?? "ask";
    logger.warn({ rawCommand, depth }, "shell-wrapper nesting too deep, applying onError posture");
    return {
      decision: onError,
      reason: "Command nests shells too deeply to analyse safely.",
      matchedInput: rawCommand,
    };
  }
  const res = await extractBash(rawCommand);
  if (!res.ok) {
    const onError = config.onError ?? "ask";
    logger.warn({ rawCommand, onError }, "bash parse failed, applying onError posture");
    return {
      decision: onError,
      reason: "Fencepost could not parse this command to check it.",
      matchedInput: rawCommand,
      ...(onError === "deny"
        ? { alternative: "Simplify the command, or split it, so it can be analysed." }
        : {}),
    };
  }

  const results: EvalResult[] = [];
  for (const cmd of res.commands) {
    await evaluateExtracted(cmd, config, cwd, depth, results);
  }
  const loose = evaluateLooseRedirects(res.looseRedirects, config, cwd);
  if (loose) results.push(loose);

  if (results.length === 0) {
    return { decision: config.default, reason: "No command found; using default", matchedInput: rawCommand };
  }

  const winner = mostRestrictive(results);
  if (results.length > 1) {
    winner.isCompound = true;
    // Surface every part that needs approval, not just the winner, so the
    // user reviews the full list (e.g. `ls x && cat y && rm z` -> cat y, rm z).
    if (winner.decision === "ask") {
      const parts = askParts(results);
      if (parts.length > 1) winner.matchedInputs = parts;
    }
  }

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
