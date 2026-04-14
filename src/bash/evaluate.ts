import { prefixMatch } from "../util/prefix-match.js";
import { logger } from "../logger.js";
import type { BashConfig, Decision, EvalResult } from "../types.js";

/**
 * Evaluate a normalised bash command against bash-specific rules.
 *
 * Tier precedence: deny > checks > ask > allow > default
 */
export function evaluateBash(
  normalisedCommand: string,
  bashConfig: BashConfig,
  defaultDecision: Decision
): EvalResult {
  // 1. Deny list (prefix match)
  for (const rule of bashConfig.deny) {
    if (prefixMatch(normalisedCommand, rule)) {
      logger.debug({ command: normalisedCommand, rule }, "matched bash.deny");
      return {
        decision: "deny",
        reason: `Command denied by rule`,
        matchedRule: `bash.deny: ${rule}`,
        matchedInput: normalisedCommand,
      };
    }
  }

  // 2. Checks (regex — "smart deny" with description + alternative)
  for (const check of bashConfig.checks) {
    try {
      const re = new RegExp(check.test);
      if (re.test(normalisedCommand)) {
        logger.debug({ command: normalisedCommand, test: check.test }, "matched bash.checks");
        const result: EvalResult = {
          decision: "deny",
          reason: check.description,
          matchedRule: `bash.checks: ${check.test}`,
          matchedInput: normalisedCommand,
        };
        if (check.alternative) result.alternative = check.alternative;
        return result;
      }
    } catch {
      logger.warn({ pattern: check.test }, "invalid bash check regex, skipping");
    }
  }

  // 3. Ask list (prefix match)
  for (const rule of bashConfig.ask) {
    if (prefixMatch(normalisedCommand, rule)) {
      logger.debug({ command: normalisedCommand, rule }, "matched bash.ask");
      return {
        decision: "ask",
        reason: `Command requires approval`,
        matchedRule: `bash.ask: ${rule}`,
        matchedInput: normalisedCommand,
      };
    }
  }

  // 4. Allow list (prefix match)
  for (const rule of bashConfig.allow) {
    if (prefixMatch(normalisedCommand, rule)) {
      logger.debug({ command: normalisedCommand, rule }, "matched bash.allow");
      return {
        decision: "allow",
        reason: "Command allowed by rule",
        matchedRule: `bash.allow: ${rule}`,
        matchedInput: normalisedCommand,
      };
    }
  }

  // 5. Default
  logger.debug({ command: normalisedCommand, default: defaultDecision }, "no bash rule matched, using default");
  return {
    decision: defaultDecision,
    reason: `No matching rule; default is ${defaultDecision}`,
    matchedInput: normalisedCommand,
  };
}
