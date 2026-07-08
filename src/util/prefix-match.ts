/**
 * Returns true if `command` matches `rule` as a prefix with word boundary.
 *
 * A rule "git branch" matches:
 *   - "git branch"           (exact)
 *   - "git branch -D main"   (starts with rule + space)
 *
 * It does NOT match:
 *   - "git branchless"       (no word boundary)
 */
export function prefixMatch(command: string, rule: string): boolean {
  return command === rule || command.startsWith(rule + " ");
}
