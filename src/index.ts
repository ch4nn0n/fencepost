#!/usr/bin/env bun
import { readStdin } from "./util/stdin.js";
import { compileConfig } from "./config.js";
import { evaluate } from "./evaluate.js";
import { formatOutput } from "./output.js";
import { buildAuditEntry, writeAuditEntry } from "./audit/logger.js";
import { logger } from "./logger.js";
import { normaliseCommand } from "./bash/normalise.js";
import { redirectToolInput } from "./redirect.js";
import { buildGuidance } from "./guidance.js";
import type { Decision, EvalResult } from "./types.js";

// Enable verbose logging if --verbose flag is passed
if (process.argv.includes("--verbose")) {
  process.env["LOG_LEVEL"] = "debug";
}

const subcommand = process.argv[2];

switch (subcommand) {
  case "evaluate":
  case undefined:
    await runEvaluate();
    break;
  case "audit":
    await runAudit();
    break;
  case "config":
    await runConfig(false);
    break;
  case "verify":
    await runConfig(true);
    break;
  case "sessionstart":
    await runSessionStart();
    break;
  default:
    process.stderr.write(
      `Unknown subcommand: ${subcommand}\nUsage: fencepost [evaluate|sessionstart|audit|config|verify] [--verbose]\n`,
    );
    process.exit(1);
}

// ---- evaluate subcommand ----

async function runEvaluate(): Promise<void> {
  // Posture for an unexpected error mid-evaluation. Updated once config loads.
  let onError: Decision = "ask";
  try {
    const input = await readStdin();
    if (!input) {
      // We can't even identify the action; nothing meaningful to gate. Allow.
      logger.warn("could not parse stdin as JSON, allowing");
      process.exit(0);
    }

    const compiled = await compileConfig(input.cwd);
    const config = compiled.config;
    onError = config.onError ?? "ask";

    // Fail CLOSED on a broken config: a human should fix it before we run
    // unguarded. (A *missing* config is fine; this only triggers on a present
    // but unparseable/invalid file.)
    if (!compiled.ok) {
      const detail = compiled.errors.map((e) => `${e.file}: ${e.message}`).join("; ");
      logger.error({ errors: compiled.errors }, "config invalid, failing closed");
      const denied: EvalResult = {
        decision: "deny",
        reason: `Fencepost config is invalid, so it is failing closed (blocking) until fixed. ${detail}`,
        alternative: "Tell the user to fix the fencepost config (run `fencepost verify` to see all errors).",
        matchedInput: input.tool_name,
      };
      const out = formatOutput(denied);
      if (out) process.stdout.write(JSON.stringify(out) + "\n");
      process.exit(0);
    }

    // Redirect /tmp paths to the sandbox dir (if enabled) BEFORE evaluating, so
    // rules and the audit log see the path the tool will actually use.
    const { input: effectiveInput, changed } = redirectToolInput(
      input.tool_name,
      input.tool_input as Record<string, unknown>,
      config,
    );
    const evalInput = changed ? { ...input, tool_input: effectiveInput } : input;

    const result = await evaluate(evalInput, config);

    // Determine the normalised command for audit (if Bash)
    let normalisedCommand: string | undefined;
    if (evalInput.tool_name === "Bash") {
      const raw = String((evalInput.tool_input as Record<string, unknown>)["command"] ?? "");
      normalisedCommand = normaliseCommand(raw, config.tools.bash.normalise);
      if (normalisedCommand === raw) normalisedCommand = undefined;
    }

    // Write audit log (fire-and-forget)
    const entry = buildAuditEntry({
      sessionId: input.session_id,
      toolUseId: input.tool_use_id,
      toolName: input.tool_name,
      toolInput: effectiveInput,
      result,
      normalisedCommand,
    });
    void writeAuditEntry(entry, input.cwd);

    // Write decision to stdout. If we rewrote the input, surface it via
    // updatedInput so the tool runs against the redirected path.
    const output = formatOutput(result, changed ? effectiveInput : undefined);
    if (output) {
      process.stdout.write(JSON.stringify(output) + "\n");
    }
    // No output = allow (Claude Code interprets empty stdout as allow)

    process.exit(0);
  } catch (err) {
    // Unexpected error: apply the configured onError posture (default ask).
    logger.error({ err, onError }, "unhandled error in evaluate, applying onError posture");
    if (onError !== "allow") {
      const out = formatOutput({
        decision: onError,
        reason: "Fencepost hit an unexpected error and could not check this command.",
        matchedInput: "",
      });
      if (out) process.stdout.write(JSON.stringify(out) + "\n");
    }
    process.exit(0);
  }
}

// ---- sessionstart subcommand ----

async function runSessionStart(): Promise<void> {
  try {
    const input = await readStdin();
    // SessionStart hook input carries cwd; fall back to process.cwd().
    const cwd = (input?.cwd as string | undefined) ?? process.cwd();
    const compiled = await compileConfig(cwd);

    let context = buildGuidance(compiled.config);
    // Surface a broken config loudly at session start so the human fixes it.
    if (!compiled.ok) {
      const detail = compiled.errors.map((e) => `${e.file}: ${e.message}`).join("; ");
      const warn = `⚠ Fencepost config is INVALID and is failing closed (all tool calls will be denied) until fixed: ${detail}`;
      context = context ? `${warn}\n\n${context}` : warn;
    }
    if (!context) {
      process.exit(0);
    }

    const output = {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    };
    process.stdout.write(JSON.stringify(output) + "\n");
    process.exit(0);
  } catch (err) {
    // Fail-open: never block a session from starting.
    logger.error({ err }, "unhandled error in sessionstart, emitting no guidance");
    process.exit(0);
  }
}

// ---- audit subcommand ----

async function runAudit(): Promise<void> {
  // Lazy import to keep evaluate startup fast
  const { runAuditSkill } = await import("./audit/skill.js");
  const cwd = process.cwd();
  await runAuditSkill(cwd);
}

// ---- config / verify subcommands ----

async function runConfig(verify: boolean): Promise<void> {
  const cwd = process.cwd();
  const compiled = await compileConfig(cwd);
  process.stdout.write(compiled.render() + "\n");
  // `verify` exits non-zero when the config has errors (useful in CI / pre-commit).
  if (verify) process.exit(compiled.ok ? 0 : 1);
}
