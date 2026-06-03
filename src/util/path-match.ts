import { resolve } from "node:path";
import { homedir } from "node:os";

/**
 * Path matching for redirect targets and command arguments (feature 20).
 *
 * Distinct from util/glob.ts (which matches simple, separator-free tool names).
 * Targets are resolved against `cwd` so relative paths and `..` traversal are
 * normalised before containment/glob checks.
 */

/** Resolve a path token against cwd, expanding a leading ~ to home. */
export function resolvePath(token: string, cwd: string): string {
  let t = token;
  if (t === "~") t = homedir();
  else if (t.startsWith("~/")) t = homedir() + t.slice(1);
  return resolve(cwd, t);
}

/** True if `target` is the root dir itself or nested under it. */
export function isUnderRoot(target: string, root: string, cwd: string): boolean {
  const t = resolvePath(target, cwd);
  const r = resolvePath(root, cwd);
  return t === r || t.startsWith(r + "/");
}

/** True if `target` is under none of the roots. */
export function isOutsideAllRoots(target: string, roots: string[], cwd: string): boolean {
  return !roots.some((root) => isUnderRoot(target, root, cwd));
}

/**
 * Path glob: `**` matches across separators, `*` within a segment, `?` one char.
 * Both pattern and target are resolved against cwd first (absolute patterns are
 * left as-is by resolve()).
 */
export function matchesPathGlob(target: string, glob: string, cwd: string): boolean {
  const t = resolvePath(target, cwd);
  // Resolve the glob's literal prefix while keeping wildcards intact: resolve()
  // would mangle `**`, so only resolve when the pattern is relative and has no
  // leading wildcard.
  const pattern = glob.startsWith("/") || glob.startsWith("~") ? expandHome(glob) : `${cwd}/${glob}`;
  return globToRegExp(pattern).test(t);
}

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return homedir() + p.slice(1);
  return p;
}

const GLOB_TOKEN = /(\*\*|\*|\?|[^*?]+)/g;

function globToRegExp(pattern: string): RegExp {
  let out = "";
  const tokens = pattern.match(GLOB_TOKEN) ?? [];
  for (const tok of tokens) {
    if (tok === "**") out += ".*";
    else if (tok === "*") out += "[^/]*";
    else if (tok === "?") out += "[^/]";
    else out += tok.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** Detect a flag token (e.g. -rf, --recursive) so it is skipped for path checks. */
export function isFlag(arg: string): boolean {
  return arg.startsWith("-");
}

/**
 * Path-like value of an argument, or null if it is a bare flag. Handles
 * `--out=/etc/x` by returning the value half.
 */
export function pathValueOf(arg: string): string | null {
  if (!arg.startsWith("-")) return arg;
  const eq = arg.indexOf("=");
  if (eq !== -1) return arg.slice(eq + 1);
  return null; // bare flag, no path
}
