import { join } from "node:path";
import { logger } from "../logger.js";
import type { AuditEntry } from "../types.js";

/** Append an audit entry to the JSONL log file. Fire-and-forget — never throws. */
export async function writeAuditEntry(entry: AuditEntry, cwd: string): Promise<void> {
  const logPath = join(cwd, ".claude", "fencepost", "logs", "audit.jsonl");
  try {
    const line = JSON.stringify(entry) + "\n";
    const file = Bun.file(logPath);

    // Ensure the directory exists
    const { mkdir } = await import("node:fs/promises");
    const dir = logPath.substring(0, logPath.lastIndexOf("/"));
    await mkdir(dir, { recursive: true });

    // Append to the file using Node's fs
    const { appendFile } = await import("node:fs/promises");
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
  // Summarise tool input
  let inputSummary: string;
  if (toolName === "Bash") {
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

  if (normalisedCommand && normalisedCommand !== inputSummary) {
    entry.normalised = normalisedCommand;
  }

  return entry;
}
