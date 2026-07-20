import { resolve, dirname, basename } from "node:path";
import { realpathSync } from "node:fs";
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
  // Defence in depth: strip stray shell quote/backslash characters so a quoted
  // absolute path (e.g. `"/etc/passwd"`) can't be reinterpreted as relative and
  // escape containment checks. Tokens reaching here are normally already
  // unquoted, but never trust that for a security decision.
  const t = token.replace(/['"`]/g, "").replace(/\\(.)/g, "$1");
  return resolve(cwd, expandHome(t));
}

/**
 * Resolve symlinks in the longest existing prefix of an absolute path, then
 * reattach any not-yet-created trailing segments lexically (they can't be
 * symlinks if nothing exists there yet). Guards containment checks against a
 * root, or anything inside it (like a planted `escape -> ~/.ssh` symlink),
 * being a symlink to outside the sandbox: a purely lexical prefix check would
 * approve `/tmp/claude/escape/authorized_keys` as "under root" even though
 * the write actually lands in ~/.ssh.
 */
function realish(absPath: string): string {
  const trailing: string[] = [];
  let cur = absPath;
  for (;;) {
    try {
      cur = realpathSync(cur);
      break;
    } catch {
      const parent = dirname(cur);
      if (parent === cur) break; // hit filesystem root without resolving; give up as-is
      trailing.unshift(basename(cur));
      cur = parent;
    }
  }
  return resolve(cur, ...trailing);
}

/** True if `target` is the root dir itself or nested under it. */
export function isUnderRoot(target: string, root: string, cwd: string): boolean {
  const t = realish(resolvePath(target, cwd));
  const r = realish(resolvePath(root, cwd));
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
