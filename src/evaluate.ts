import { matchTool } from "./tool-matcher.js";
import { logger } from "./logger.js";
import type { HookInput, FencepostConfig, EvalResult } from "./types.js";

/**
 * Top-level evaluator. Non-Bash tools go through the tool-name matcher; Bash is
 * always parsed and evaluated via the tree-sitter AST pipeline (features
 * 19/20/21). Async because the Bash path initialises the parser.
 */
export async function evaluate(input: HookInput, config: FencepostConfig): Promise<EvalResult> {
  logger.debug({ tool: input.tool_name }, "evaluating tool call");

  if (input.tool_name !== "Bash") {
    return matchTool(input.tool_name, config);
  }

  const rawCommand = String((input.tool_input as Record<string, unknown>)["command"] ?? "");
  if (!rawCommand) {
    logger.warn("Bash tool called with empty command");
    return { decision: config.default, reason: "Empty command; using default", matchedInput: "" };
  }

  // Dynamic import keeps tree-sitter out of the non-Bash fast path.
  const { evaluateBashAst } = await import("./bash/evaluate-ast.js");
  return evaluateBashAst(rawCommand, config, input.cwd);
}
