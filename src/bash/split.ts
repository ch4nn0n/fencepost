export type CompoundOperator = "&&" | "||" | "|" | ";";

export interface SplitResult {
  /** The individual sub-commands, trimmed. */
  parts: string[];
  /** The operators that joined the parts, in order. */
  operators: CompoundOperator[];
}

/** Operators that sequence independent commands (as opposed to a `|` data pipe). */
const SEQUENCING_OPERATORS: ReadonlySet<CompoundOperator> = new Set(["&&", "||", ";"]);

/** True if any part was joined by a sequencing operator (&&, ||, ;), ignoring pipes. */
export function hasSequencing(operators: CompoundOperator[]): boolean {
  return operators.some((op) => SEQUENCING_OPERATORS.has(op));
}

/**
 * Split a shell command on compound operators: &&, ||, |, ;
 *
 * Respects single quotes, double quotes, and escaped characters.
 * Does not split inside quoted strings.
 * Treats $(...) content as opaque (doesn't split inside subshells).
 */
export function splitCommand(command: string): string[] {
  return splitCommandDetailed(command).parts;
}

/**
 * Like {@link splitCommand}, but also reports which operator joined each part.
 */
export function splitCommandDetailed(command: string): SplitResult {
  const parts: string[] = [];
  const operators: CompoundOperator[] = [];
  let current = "";
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let subshellDepth = 0;

  // Record the segment accumulated so far, tagged with the operator that ends it.
  const pushPart = (op: CompoundOperator) => {
    const trimmed = current.trim();
    if (trimmed) {
      parts.push(trimmed);
      operators.push(op);
    }
    current = "";
  };

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
      pushPart(twoChar);
      i += 2;
      continue;
    }

    if (ch === "|" || ch === ";") {
      pushPart(ch);
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  // The final segment has no trailing operator; its operator slot is dropped so
  // that `operators` describes the joins between parts, not a trailing token.
  const trimmed = current.trim();
  if (trimmed) {
    parts.push(trimmed);
  } else if (operators.length > 0) {
    // We pushed an operator for a boundary whose right-hand side was empty
    // (e.g. a trailing ";"); drop that dangling operator.
    operators.pop();
  }

  if (parts.length === 0) return { parts: [command], operators: [] };
  // operators should describe the joins between parts: at most parts.length - 1.
  return { parts, operators: operators.slice(0, parts.length - 1) };
}
