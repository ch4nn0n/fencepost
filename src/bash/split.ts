/**
 * Split a shell command on compound operators: &&, ||, |, ;
 *
 * Respects single quotes, double quotes, and escaped characters.
 * Does not split inside quoted strings.
 * Treats $(...) content as opaque (doesn't split inside subshells).
 */
export function splitCommand(command: string): string[] {
  const parts: string[] = [];
  let current = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let subshellDepth = 0;

  while (i < command.length) {
    const ch = command[i]!;

    // Handle escape sequences outside quotes
    if (ch === "\\" && !inSingle) {
      current += ch;
      if (i + 1 < command.length) {
        current += command[i + 1]!;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // Toggle single-quote mode (no escapes inside single quotes)
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      i++;
      continue;
    }

    // Toggle double-quote mode
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      i++;
      continue;
    }

    // If inside any quote, just accumulate
    if (inSingle || inDouble) {
      current += ch;
      i++;
      continue;
    }

    // Track subshell depth $( ... )
    if (ch === "$" && command[i + 1] === "(") {
      subshellDepth++;
      current += ch;
      i++;
      continue;
    }
    if (ch === ")" && subshellDepth > 0) {
      subshellDepth--;
      current += ch;
      i++;
      continue;
    }

    // If inside subshell, don't split
    if (subshellDepth > 0) {
      current += ch;
      i++;
      continue;
    }

    // Check for compound operators
    const twoChar = command.slice(i, i + 2);
    if (twoChar === "&&" || twoChar === "||") {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = "";
      i += 2;
      continue;
    }

    if (ch === "|" || ch === ";") {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);

  return parts.length > 0 ? parts : [command];
}
