import { join, dirname } from "node:path";
import { mkdir, appendFile } from "node:fs/promises";
import { logger } from "../logger.js";
import type { AuditEntry } from "../types.js";

/** Append an audit entry to the JSONL log file. Fire-and-forget — never throws. */
export async function writeAuditEntry(entry: AuditEntry, cwd: string): Promise<void> {
  const logPath = join(cwd, ".claude", "fencepost", "logs", "audit.jsonl");
  try {
    const line = JSON.stringify(entry) + "\n";
    await mkdir(dirname(logPath), { recursive: true });
    await appendFile(logPath, line, "utf8");
  } catch (err) {
    // Never block or crash on audit failures
    logger.warn({ err, logPath }, "failed to write audit entry");
  }
}

/** Build an AuditEntry from the evaluation context. */
export function buildAuditEntry({
  sessionId,
  toolUseId,
  toolName,
  toolInput,
  result,
  normalisedCommand,
}: {
  sessionId: string;
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  result: import("../types.js").EvalResult;
  normalisedCommand?: string;
}): AuditEntry {
  // Summarise tool input. When the secrets scanner matched, the input body
  // contains a secret by definition — log target paths only, never content
  // (and for Bash, never the command, which embeds the value).
  const secretsMatch = result.matchedRule?.startsWith("secrets.") === true;
  let inputSummary: string;
  if (secretsMatch) {
    const safe: Record<string, unknown> = {};
    for (const key of ["file_path", "notebook_path"]) {
      if (toolInput[key] !== undefined) safe[key] = toolInput[key];
    }
    inputSummary = JSON.stringify(safe);
  } else if (toolName === "Bash") {
    inputSummary = String(toolInput["command"] ?? "");
  } else {
    inputSummary = JSON.stringify(toolInput).slice(0, 200);
  }

  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    sid: sessionId,
    tool: toolName,
    input: inputSummary,
    decision: result.decision,
    reason: result.reason,
    rule: result.matchedRule ?? null,
    tid: toolUseId,
  };

  if (normalisedCommand && normalisedCommand !== inputSummary && !secretsMatch) {
    entry.normalised = normalisedCommand;
  }

  return entry;
}
