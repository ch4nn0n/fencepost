import type { NormaliseRule } from "../types.js";
import { logger } from "../logger.js";
import { prefixMatch } from "../util/prefix-match.js";
import { safeCompileRegex } from "../util/safe-regex.js";

/**
 * Normalise a bash command by stripping irrelevant flags/arguments.
 *
 * Only applies rules whose prefix matches the start of the command.
 * The first matching prefix rule is used (no multi-prefix chaining).
 */
export function normaliseCommand(command: string, rules: NormaliseRule[]): string {
  for (const rule of rules) {
    if (!prefixMatch(command, rule.prefix)) continue;

    let normalised = command;
    for (const pattern of rule.strip) {
      const re = safeCompileRegex(pattern, "g");
      if (!re) {
        logger.warn({ pattern }, "invalid normalise strip pattern, skipping");
        continue;
      }
      normalised = normalised.replace(re, "");
    }

    // Collapse multiple spaces and trim
    normalised = normalised.replace(/\s{2,}/g, " ").trim();

    if (normalised !== command) {
      logger.debug({ before: command, after: normalised }, "command normalised");
    }

    return normalised;
  }

  return command;
}
