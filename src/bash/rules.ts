// Matchers for the structured bash rules (feature 20): redirect rules and
// argument rules, evaluated against the AST-extracted commands.

import { matchesGlob } from "../util/glob.js";
import { isOutsideAllRoots, isUnderRoot, matchesPathGlob, pathValueOf } from "../util/path-match.js";
import { safeCompileRegex } from "../util/safe-regex.js";
import { logger } from "../logger.js";
import type { ArgumentRule, RedirectRule } from "../types.js";
import type { ExtractedCommand, Redirect } from "./ast.js";

/** Match a name against a pattern supporting `*`/`?` globs and `|` alternation. */
export function nameMatches(name: string, pattern: string): boolean {
  return pattern.split("|").some((alt) => matchesGlob(name, alt.trim()));
}

function modeMatches(ruleMode: RedirectRule["mode"], actual: Redirect["mode"]): boolean {
  if (ruleMode === "any") return true;
  if (ruleMode === "write") return actual === "write" || actual === "append";
  return ruleMode === actual; // "read" | "append" exact
}

/** Does a redirect rule fire for this redirect? */
export function redirectRuleMatches(rule: RedirectRule, r: Redirect, cwd: string): boolean {
  if (!modeMatches(rule.mode, r.mode)) return false;
  if (!r.target) return false;
  if (rule.outside) return isOutsideAllRoots(r.target, rule.outside, cwd);
  if (rule.glob) return matchesPathGlob(r.target, rule.glob, cwd);
  return false;
}

/** Path-like argument values of a command (bare flags removed). */
function pathArgsOf(cmd: ExtractedCommand): string[] {
  return cmd.args.map(pathValueOf).filter((p): p is string => p !== null);
}

/** Does an argument rule fire for this command? */
export function argumentRuleMatches(rule: ArgumentRule, cmd: ExtractedCommand, cwd: string): boolean {
  if (!cmd.name || !nameMatches(cmd.name, rule.command)) return false;

  if (rule.anyArgOutside) {
    return pathArgsOf(cmd).some((p) => isOutsideAllRoots(p, rule.anyArgOutside!, cwd));
  }
  if (rule.allArgsInside) {
    const paths = pathArgsOf(cmd);
    return paths.length > 0 && paths.every((p) => rule.allArgsInside!.some((root) => isUnderRoot(p, root, cwd)));
  }
  if (rule.anyArgMatches) {
    const re = safeCompileRegex(rule.anyArgMatches);
    if (!re) {
      logger.warn({ pattern: rule.anyArgMatches }, "invalid arguments.anyArgMatches regex, skipping");
      return false;
    }
    return cmd.args.some((a) => re.test(a));
  }
  if (rule.allArgsMatch) {
    const re = safeCompileRegex(rule.allArgsMatch);
    if (!re) {
      logger.warn({ pattern: rule.allArgsMatch }, "invalid arguments.allArgsMatch regex, skipping");
      return false;
    }
    return cmd.args.length > 0 && cmd.args.every((a) => re.test(a));
  }
  return false;
}
