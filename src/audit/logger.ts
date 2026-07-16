import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { mkdir, appendFile } from "node:fs/promises";
import { logger } from "../logger.js";
import type { AuditEntry } from "../types.js";

/**
 * Path to the single, user-level audit log. All projects append here; each
 * entry carries its own `cwd` for per-project attribution. FENCEPOST_HOME
 * overrides the home dir (mirrors config resolution, keeps tests hermetic).
 */
export function auditLogPath(): string {
  const home = process.env["FENCEPOST_HOME"] || homedir();
  return join(home, ".claude", "fencepost", "logs", "audit.jsonl");
}

/** Append an audit entry to the JSONL log file. Fire-and-forget — never throws. */
export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  const logPath = auditLogPath();
  try {
    // ponytail: O_APPEND write() is atomic per call on Linux; long lines from
    // concurrent sessions across projects can still interleave. Add a lock only
    // if corrupted lines actually show up.
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
  cwd,
}: {
  sessionId: string;
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  result: import("../types.js").EvalResult;
  normalisedCommand?: string;
  cwd: string;
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
    cwd,
  };

  if (normalisedCommand && normalisedCommand !== inputSummary && !secretsMatch) {
    entry.normalised = normalisedCommand;
  }

  return entry;
}
