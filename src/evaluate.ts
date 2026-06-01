import { splitCommandDetailed, hasSequencing } from "./bash/split.js";
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

  const { parts, operators } = splitCommandDetailed(rawCommand);
  logger.debug({ rawCommand, parts, operators }, "split command");

  const results = parts.map((part) => {
    const normalised = normaliseCommand(part, config.tools.bash.normalise);
    const result = evaluateBash(normalised, config.tools.bash, config.default);

    // Tag compound info onto the result
    if (parts.length > 1) {
      result.isCompound = true;
      result.offendingPart = normalised;
    }

    // Attach normalised form if it differs from the raw part
    if (normalised !== part) {
      (result as EvalResult & { _normalisedPart: string })._normalisedPart = normalised;
    }

    return result;
  });

  const winner = mostRestrictive(results);

  // If compound and winner wasn't from the whole command, add compound metadata
  if (parts.length > 1 && !winner.isCompound) {
    winner.isCompound = true;
  }

  // Discourage chaining: when enabled, a sequenced chain (&&, ||, ;) that would
  // merely require approval is instead denied with guidance to run the parts as
  // separate tool calls, so each can be reviewed on its own. Pipes (|) are a
  // single data-flow operation and are left alone, as are all-allow chains.
  if (
    config.tools.bash.discourageChaining === true &&
    winner.decision === "ask" &&
    hasSequencing(operators)
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

  logger.info({
    tool: "Bash",
    command: rawCommand,
    decision: winner.decision,
    rule: winner.matchedRule,
  }, "decision");

  return winner;
}
