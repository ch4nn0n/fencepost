export interface StripResult {
  /** The command with loop/conditional scaffolding removed. */
  command: string;
  /** True if a control-flow construct was detected and stripped. */
  wasControlFlow: boolean;
}

/**
 * Detect a genuine control-flow construct (not just a keyword used as an
 * argument). Requires structural markers: do+done, then+fi, `for X in`, or
 * case+esac.
 */
function looksLikeControlFlow(cmd: string): boolean {
  const hasDo = /(^|[\s;])do(?=$|[\s;])/.test(cmd);
  const hasDone = /(^|[\s;])done(?=$|[\s;])/.test(cmd);
  const hasThen = /(^|[\s;])then(?=$|[\s;])/.test(cmd);
  const hasFi = /(^|[\s;])fi(?=$|[\s;])/.test(cmd);
  const hasForIn = /(^|[\s;])for\s+\w+\s+in\s/.test(cmd);
  const hasCase = /(^|[\s;])case\s.+\sin(?=$|[\s;])/.test(cmd) && /(^|[\s;])esac(?=$|[\s;])/.test(cmd);
  return (hasDo && hasDone) || (hasThen && hasFi) || hasForIn || hasCase;
}

/**
 * Strip shell loop/conditional scaffolding so the body commands can be evaluated
 * against the normal rule set. This is a heuristic, not a full shell parser:
 * it covers the common `for/while/until ... do ... done`, `if ... then ... fi`,
 * and `case ... esac` forms in both `;`-delimited and newline-delimited styles.
 *
 *   for f in *.txt; do rm -rf /data/$f; done  ->  rm -rf /data/$f
 *   for f in a b; do echo $f; done            ->  echo $f
 *
 * The body is what matters for a permission decision: if a body command is
 * denied, the loop is denied; if all body commands are allowed, the loop is
 * allowed. Callers should also skip the "discourage chaining" conversion when
 * `wasControlFlow` is true, since a loop is a single unit the user wrote.
 */
export function stripControlFlow(command: string): StripResult {
  if (!looksLikeControlFlow(command)) return { command, wasControlFlow: false };

  // Normalise newlines to ; so headers and keywords are uniformly delimited.
  let s = command.replace(/[\r\n]+/g, "; ");

  // Loop/conditional headers, up to and including their opener.
  s = s.replace(/(^|[\s;])(for|while|until)\b[^;]*?;\s*do\b/g, "$1 ");
  s = s.replace(/(^|[\s;])(if|elif)\b[^;]*?;\s*then\b/g, "$1 ");
  s = s.replace(/(^|[\s;])case\b[^;]*?\bin\b/g, "$1 ");

  // Closing keywords, consuming any trailing redirection (e.g. `done < file`).
  s = s.replace(/(^|[\s;])(done|fi|esac)\b\s*(?:[<>&]+\s*[^\s;]+\s*)*/g, "$1 ");
  // Remaining bare structural keywords.
  s = s.replace(/(^|[\s;])(do|then|else)\b/g, "$1 ");
  // `case` pattern terminators.
  s = s.replace(/;;/g, ";");

  // Collapse whitespace and tidy up empty segments left behind.
  s = s.replace(/\s+/g, " ");
  s = s
    .replace(/\s*;\s*/g, "; ")
    .replace(/(^;\s*)+/, "")
    .replace(/(;\s*)+$/, "")
    .trim();

  return { command: s, wasControlFlow: true };
}
