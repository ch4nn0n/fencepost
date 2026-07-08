import { matchesGlob } from "./util/glob.js";
import { logger } from "./logger.js";
import type { FencepostConfig, EvalResult } from "./types.js";

/**
 * Match a non-Bash tool name against the config's deny/ask/allow lists.
 * Tier precedence: deny > ask > allow > default
 */
export function matchTool(toolName: string, config: FencepostConfig): EvalResult {
  // 1. Check deny list
  for (const rule of config.tools.deny) {
    if (matchesGlob(toolName, rule.tool)) {
      logger.debug({ toolName, rule: rule.tool }, "matched tools.deny");
      const result: EvalResult = {
        decision: "deny",
        reason: rule.description,
        matchedRule: `tools.deny: ${rule.tool}`,
        matchedInput: toolName,
      };
      if (rule.alternative) result.alternative = rule.alternative;
      return result;
    }
  }

  // 2. Check ask list
  for (const pattern of config.tools.ask) {
    if (matchesGlob(toolName, pattern)) {
      logger.debug({ toolName, pattern }, "matched tools.ask");
      return {
        decision: "ask",
        reason: `Tool requires approval`,
        matchedRule: `tools.ask: ${pattern}`,
        matchedInput: toolName,
      };
    }
  }

  // 3. Check allow list
  for (const pattern of config.tools.allow) {
    if (matchesGlob(toolName, pattern)) {
      logger.debug({ toolName, pattern }, "matched tools.allow");
      return {
        decision: "allow",
        reason: "Tool allowed by rule",
        matchedRule: `tools.allow: ${pattern}`,
        matchedInput: toolName,
      };
    }
  }

  // 4. Fall through to default
  logger.debug({ toolName, default: config.default }, "no tool rule matched, using default");
  return {
    decision: config.default,
    reason: `No matching rule; default is ${config.default}`,
    matchedInput: toolName,
  };
}
