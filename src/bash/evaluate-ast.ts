// SPIKE (feature 19): AST-backed bash evaluation path.
//
// Extracts the simple commands + redirections with tree-sitter, then reuses the
// existing rule matcher (evaluateBashParts). Returns null to signal the caller
// should fall back to the string pipeline (fail-open).

import { extractBash, isWriteOutsideSandbox } from "./ast.js";
import { evaluateBashParts } from "../evaluate.js";
import { logger } from "../logger.js";
import type { FencepostConfig, EvalResult } from "../types.js";

export async function evaluateBashViaAst(
  rawCommand: string,
  config: FencepostConfig,
): Promise<EvalResult | null> {
  const res = await extractBash(rawCommand);
  if (!res.ok) return null; // parse failed -> caller falls back to string path

  // Redirection-aware rule — only expressible with the AST. Deny writing to an
  // absolute path outside the sandbox when enabled (feature 19 demo).
  if (config.tools.bash.denyWritesOutsideSandbox) {
    const sandbox = config.redirect?.tmpTarget ?? "/tmp/claude";
    for (const r of res.redirects) {
      if (isWriteOutsideSandbox(r, sandbox)) {
        logger.info({ redirect: r }, "denying write outside sandbox (ast)");
        return {
          decision: "deny",
          reason: `Redirecting output to ${r.target} would write outside the sandbox`,
          alternative: `Write under ${sandbox}/ or a path inside the project instead.`,
          matchedInput: rawCommand,
          matchedRule: `bash.denyWritesOutsideSandbox: ${r.op} ${r.target}`,
        };
      }
    }
  }

  const parts = res.commands.length > 0 ? res.commands : [rawCommand];
  return evaluateBashParts(parts, rawCommand, res.hadSequencing, res.hadControlFlow, config);
}
