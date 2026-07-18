import type { EvalResult, HookOutput } from "./types.js";

/**
 * Format an EvalResult into the hookSpecificOutput JSON for Claude Code.
 *
 * Every decision is emitted explicitly, including allow: empty stdout would
 * mean "no decision" to Claude Code and fall through to its native permission
 * prompt, whereas an explicit allow suppresses it — fencepost is the gate.
 *
 * `updatedInput`, when provided, is the rewritten tool input (e.g. /tmp paths
 * redirected to the sandbox). It is surfaced so the tool runs against the new
 * input on allow/ask. It is ignored on deny (the call won't run).
 *
 * `manualRunCommand`, when provided (deny only, feature 23), is the verbatim
 * command the user may choose to run themselves outside fencepost.
 */
export function formatOutput(
  result: EvalResult,
  updatedInput?: Record<string, unknown>,
  manualRunCommand?: string,
): HookOutput {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: result.decision,
      permissionDecisionReason: formatReason(result),
    },
  };

  if (result.decision !== "deny" && updatedInput) {
    output.hookSpecificOutput.updatedInput = updatedInput;
  }

  if (result.decision === "deny") {
    const contextParts: string[] = [];
    if (result.chained) {
      contextParts.push(
        "The previous command chained multiple steps that would each need approval.",
        "Run each step as its own Bash tool call so the user can review them individually.",
      );
    } else {
      contextParts.push(
        "The previous command was blocked by a fencepost permission rule.",
        "Do not retry the same command.",
      );
      if (result.alternative) {
        contextParts.push("Use the suggested alternative approach.");
      }
      if (result.isCompound) {
        contextParts.push(
          "Break compound commands into separate tool calls so each can be evaluated independently.",
        );
      }
    }
    if (manualRunCommand) {
      // Lead with the alternative/rule; the manual run is a secondary escape hatch.
      contextParts.push(
        "If the user still wants to run the original command, they can run it themselves outside fencepost" +
          " by typing it in the prompt prefixed with '!' (a user-run command does not pass through fencepost)." +
          " Offer it to them in a copyable code block, exactly: " +
          manualRunCommand,
      );
    }
    output.hookSpecificOutput.additionalContext = contextParts.join(" ");
  }

  return output;
}

/** Collapse a matched command to one short line for the permission prompt. */
function summarise(input: string): string {
  const oneLine = input.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 79)}…` : oneLine;
}

// ponytail: ANSI color is undocumented for this field, terminal pass-through only. Drop to plain "Fencepost:" if it ever renders as raw escape codes.
// Truecolor match for --fp-ask (dark theme) in docs/src/css/custom.css: #e0a445.
const BOLD_OCHRE = "\x1b[1;38;2;224;164;69m";
const RESET = "\x1b[0m";

function formatReason(result: EvalResult): string {
  const prefix = `${BOLD_OCHRE}Fencepost:${RESET}`;

  if (result.decision === "deny") {
    if (result.chained) {
      return `${prefix} this chained command needs approval — run each step (split on && / ; / ||) as a separate command so it can be reviewed individually.`;
    }
    let reason = `${prefix} blocked — ${result.reason}`;
    if (result.alternative) {
      reason += `. Use this instead: ${result.alternative}`;
    }
    return reason;
  }

  if (result.decision === "ask") {
    // Claude Code already renders the full command above the hook message, so
    // only a short pointer to the matched part(s) is repeated here.
    const rawParts = result.matchedInputs ?? (result.matchedInput ? [result.matchedInput] : []);
    const parts = rawParts.length > 0 ? rawParts : ["this command"];
    return `${prefix}\n${parts.map((p) => `${BOLD_OCHRE}-${RESET} ${summarise(p)}`).join("\n")}`;
  }

  return result.reason;
}
