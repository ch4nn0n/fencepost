#!/usr/bin/env bun
import { readStdin } from "./util/stdin.js";
import { resolveConfig } from "./config.js";
import { evaluate } from "./evaluate.js";
import { formatOutput } from "./output.js";
import { buildAuditEntry, writeAuditEntry } from "./audit/logger.js";
import { logger } from "./logger.js";
import { normaliseCommand } from "./bash/normalise.js";
import { redirectToolInput } from "./redirect.js";
import { buildGuidance } from "./guidance.js";

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
    await runConfig();
    break;
  case "sessionstart":
    await runSessionStart();
    break;
  default:
    process.stderr.write(
      `Unknown subcommand: ${subcommand}\nUsage: fencepost [evaluate|sessionstart|audit|config] [--verbose]\n`,
    );
    process.exit(1);
}

// ---- evaluate subcommand ----

async function runEvaluate(): Promise<void> {
  try {
    const input = await readStdin();
    if (!input) {
      // No input or parse failure — fail-open
      logger.warn("could not parse stdin as JSON, failing open");
      process.exit(0);
    }

    const config = await resolveConfig(input.cwd);

    // Redirect /tmp paths to the sandbox dir (if enabled) BEFORE evaluating, so
    // rules and the audit log see the path the tool will actually use.
    const { input: effectiveInput, changed } = redirectToolInput(
      input.tool_name,
      input.tool_input as Record<string, unknown>,
      config,
    );
    const evalInput = changed ? { ...input, tool_input: effectiveInput } : input;

    // SPIKE (feature 19): optional AST-backed Bash path. Falls back to the
    // string pipeline if the parser is not selected or extraction fails.
    let result;
    if (evalInput.tool_name === "Bash" && config.tools.bash.parser === "ast") {
      const command = String((effectiveInput as Record<string, unknown>)["command"] ?? "");
      const { evaluateBashViaAst } = await import("./bash/evaluate-ast.js");
      const astResult = command ? await evaluateBashViaAst(command, config) : null;
      result = astResult ?? evaluate(evalInput, config);
    } else {
      result = evaluate(evalInput, config);
    }

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
    // Fail-open: any unhandled error should not block Claude
    logger.error({ err }, "unhandled error in evaluate, failing open");
    process.exit(0);
  }
}

// ---- sessionstart subcommand ----

async function runSessionStart(): Promise<void> {
  try {
    const input = await readStdin();
    // SessionStart hook input carries cwd; fall back to process.cwd().
    const cwd = (input?.cwd as string | undefined) ?? process.cwd();
    const config = await resolveConfig(cwd);

    const context = buildGuidance(config);
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

// ---- config subcommand ----

async function runConfig(): Promise<void> {
  const cwd = process.cwd();
  const config = await resolveConfig(cwd);

  const { _sources, ...cfg } = config;
  process.stdout.write("## Resolved Config\n\n");

  if (_sources.length === 0) {
    process.stdout.write("No config files found — using defaults.\n\n");
  } else {
    process.stdout.write(`Source files:\n${_sources.map((s) => `  - ${s}`).join("\n")}\n\n`);
  }

  process.stdout.write("```json\n");
  process.stdout.write(JSON.stringify(cfg, null, 2));
  process.stdout.write("\n```\n");
}
