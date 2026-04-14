import type { EvalResult, HookOutput } from "./types.js";

/** Format an EvalResult into the hookSpecificOutput JSON for Claude Code. */
export function formatOutput(result: EvalResult): HookOutput | null {
  // Fast path: allow — no output means allow
  if (result.decision === "allow") return null;

  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: result.decision,
      permissionDecisionReason: formatReason(result),
    },
  };

  if (result.decision === "deny") {
    const contextParts: string[] = [
      "The previous command was blocked by a fencepost permission rule.",
      "Do not retry the same command.",
    ];
    if (result.alternative) {
      contextParts.push("Use the suggested alternative approach.");
    }
    if (result.isCompound) {
      contextParts.push(
        "Break compound commands into separate tool calls so each can be evaluated independently."
      );
    }
    output.hookSpecificOutput.additionalContext = contextParts.join(" ");
  }

  return output;
}

function formatReason(result: EvalResult): string {
  const prefix = "Fencepost:";

  if (result.decision === "deny") {
    if (result.isCompound && result.offendingPart) {
      let reason = `${prefix} blocked — compound command contains '${result.offendingPart}' which is not permitted (${result.reason}).`;
      if (result.alternative) {
        reason += ` Use this instead: ${result.alternative}.`;
      }
      reason += " Run commands separately rather than chaining with &&.";
      return reason;
    }

    let reason = `${prefix} blocked — ${result.reason}`;
    if (result.alternative) {
      reason += `. Use this instead: ${result.alternative}`;
    }
    return reason;
  }

  if (result.decision === "ask") {
    if (result.isCompound && result.offendingPart) {
      return `${prefix} compound command contains '${result.offendingPart}' which requires approval.`;
    }
    const what = result.matchedInput ?? "this command";
    return `${prefix} '${what}' requires approval.`;
  }

  return result.reason;
}
