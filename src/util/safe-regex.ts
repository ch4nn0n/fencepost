/**
 * Nested-quantifier shapes like (a+)+ or (a*)* are the classic catastrophic-
 * backtracking trigger. Regex patterns compiled here come from user config,
 * including imported presets, so this rejects that shape before compiling
 * rather than trusting every contributor's regex.
 *
 * ponytail: catches the classic nested-quantifier shape only, not every
 * catastrophic pattern (e.g. overlapping alternation). Swap for a real
 * ReDoS detector (e.g. recheck) if presets start coming from less-trusted
 * sources than reviewed PRs into this repo.
 */
const CATASTROPHIC_SHAPE = /\([^()]*[+*]\)[+*]/;

/** Compiles a config-supplied regex, returning undefined on bad syntax or an unsafe shape. */
export function safeCompileRegex(pattern: string, flags?: string): RegExp | undefined {
  if (CATASTROPHIC_SHAPE.test(pattern)) return undefined;
  try {
    // nosemgrep: opengrep-rules.javascript.lang.security.audit.detect-non-literal-regexp
    return new RegExp(pattern, flags);
  } catch {
    return undefined;
  }
}
