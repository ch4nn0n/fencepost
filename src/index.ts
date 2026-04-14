#!/usr/bin/env bun
import { readStdin } from "./util/stdin.js";
import { resolveConfig } from "./config.js";
import { evaluate } from "./evaluate.js";
import { formatOutput } from "./output.js";
import { buildAuditEntry, writeAuditEntry } from "./audit/logger.js";
import { logger } from "./logger.js";
import { normaliseCommand } from "./bash/normalise.js";

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
  default:
    process.stderr.write(`Unknown subcommand: ${subcommand}\nUsage: fencepost [evaluate|audit|config] [--verbose]\n`);
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
    const result = evaluate(input, config);

    // Determine the normalised command for audit (if Bash)
    let normalisedCommand: string | undefined;
    if (input.tool_name === "Bash") {
      const raw = String((input.tool_input as Record<string, unknown>)["command"] ?? "");
      normalisedCommand = normaliseCommand(raw, config.tools.bash.normalise);
      if (normalisedCommand === raw) normalisedCommand = undefined;
    }

    // Write audit log (fire-and-forget)
    const entry = buildAuditEntry({
      sessionId: input.session_id,
      toolUseId: input.tool_use_id,
      toolName: input.tool_name,
      toolInput: input.tool_input as Record<string, unknown>,
      result,
      normalisedCommand,
    });
    void writeAuditEntry(entry, input.cwd);

    // Write decision to stdout
    const output = formatOutput(result);
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
