/**
 * Convert a simple glob pattern to a RegExp.
 * Supports * (any chars) and ? (single char).
 * Tool names are simple identifiers so full glob semantics aren't needed.
 */
export function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .split("")
    .map((ch) => {
      if (ch === "*") return ".*";
      if (ch === "?") return ".";
      // Escape all regex metacharacters
      return ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${escaped}$`);
}

/** Returns true if toolName matches the glob pattern. */
export function matchesGlob(toolName: string, pattern: string): boolean {
  return globToRegex(pattern).test(toolName);
}
