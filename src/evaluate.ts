import { splitCommandDetailed, hasSequencing } from "./bash/split.js";
import { stripControlFlow } from "./bash/control-flow.js";
import { normaliseCommand } from "./bash/normalise.js";
import { evaluateBash } from "./bash/evaluate.js";
import { matchTool } from "./tool-matcher.js";
import { logger } from "./logger.js";
import type { HookInput, FencepostConfig, EvalResult, Decision } from "./types.js";

/** Pick the most restrictive decision from an array of results. */
function mostRestrictive(results: EvalResult[]): EvalResult {
  const precedence: Record<Decision, number> = { deny: 3, ask: 2, allow: 1 };
  return results.reduce((best, curr) =>
    (precedence[curr.decision] > precedence[best.decision]) ? curr : best
  );
}

/**
 * Evaluate an already-extracted list of sub-commands against the bash rules.
 * Shared by the string pipeline (split + control-flow strip) and the AST
 * pipeline (feature 19). `rawCommand` is the original for messages/audit;
 * `hadSequencing` and `wasControlFlow` drive the discourage-chaining rule.
 */
export function evaluateBashParts(
  parts: string[],
  rawCommand: string,
  hadSequencing: boolean,
  wasControlFlow: boolean,
  config: FencepostConfig,
): EvalResult {
  const results = parts.map((part) => {
    const normalised = normaliseCommand(part, config.tools.bash.normalise);
    const result = evaluateBash(normalised, config.tools.bash, config.default);

    if (parts.length > 1) {
      result.isCompound = true;
      result.offendingPart = normalised;
    }
    if (normalised !== part) {
      (result as EvalResult & { _normalisedPart: string })._normalisedPart = normalised;
    }
    return result;
  });

  const winner = mostRestrictive(results);

  if (parts.length > 1 && !winner.isCompound) {
    winner.isCompound = true;
  }

  // Discourage chaining: a sequenced chain (&&, ||, ;) that would merely require
  // approval is instead denied with guidance to run the parts separately. Pipes
  // and control-flow constructs are exempt.
  if (
    config.tools.bash.discourageChaining === true &&
    !wasControlFlow &&
    winner.decision === "ask" &&
    hadSequencing
  ) {
    logger.info({ tool: "Bash", command: rawCommand }, "discouraging chained ask -> deny");
    return {
      decision: "deny",
      reason: "Chained commands that need approval should be run separately",
      matchedInput: rawCommand,
      isCompound: true,
      chained: true,
    };
  }

  logger.info(
    { tool: "Bash", command: rawCommand, decision: winner.decision, rule: winner.matchedRule },
    "decision",
  );
  return winner;
}

/**
 * Top-level evaluator. Routes Bash tool calls through the bash pipeline
 * (with compound splitting + normalisation) and all other tools through
 * the tool name matcher.
 */
export function evaluate(input: HookInput, config: FencepostConfig): EvalResult {
  logger.debug({ tool: input.tool_name }, "evaluating tool call");

  if (input.tool_name !== "Bash") {
    return matchTool(input.tool_name, config);
  }

  // Bash pipeline
  const rawCommand = String((input.tool_input as Record<string, unknown>)["command"] ?? "");

  if (!rawCommand) {
    logger.warn("Bash tool called with empty command");
    return { decision: config.default, reason: "Empty command; using default", matchedInput: "" };
  }

  // Strip loop/conditional scaffolding so body commands are evaluated against
  // the normal rules (and a loop is not mistaken for a chain of commands).
  const { command: bodyCommand, wasControlFlow } = stripControlFlow(rawCommand);
  if (wasControlFlow) logger.debug({ rawCommand, bodyCommand }, "stripped control flow");

  const { parts, operators } = splitCommandDetailed(bodyCommand);
  logger.debug({ rawCommand, parts, operators }, "split command");

  return evaluateBashParts(parts, rawCommand, hasSequencing(operators), wasControlFlow, config);
}
