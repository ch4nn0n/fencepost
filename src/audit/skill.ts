import { join } from "node:path";
import { resolveConfig } from "../config.js";
import { analyseAudit } from "./analyse.js";
import type { AuditEntry } from "../types.js";

export async function runAuditSkill(cwd: string): Promise<void> {
  const config = await resolveConfig(cwd);
  const { _sources } = config;

  // ---- Print resolved config summary ----
  process.stdout.write("# Fencepost Audit\n\n");
  process.stdout.write("## Effective Config\n\n");

  if (_sources.length === 0) {
    process.stdout.write("No config files found — using defaults.\n\n");
  } else {
    process.stdout.write(`Source files:\n${_sources.map((s) => `  - ${s}`).join("\n")}\n\n`);
    printConfigSummary(config);
  }

  // ---- Load audit log ----
  const logPath = join(cwd, ".claude", "fencepost", "logs", "audit.jsonl");
  const entries = await loadAuditLog(logPath);

  if (entries.length === 0) {
    process.stdout.write("## Audit Log\n\nNo audit entries found.\n");
    return;
  }

  process.stdout.write(`## Audit Log\n\n${entries.length} entries found.\n\n`);

  const analysis = analyseAudit(entries, config);

  // ---- Frequency table ----
  process.stdout.write("## Decision Frequency\n\n");
  process.stdout.write("| Tool | Allow | Ask | Deny | Total |\n");
  process.stdout.write("|------|-------|-----|------|-------|\n");
  for (const row of analysis.frequency) {
    process.stdout.write(`| ${row.tool} | ${row.allow} | ${row.ask} | ${row.deny} | ${row.total} |\n`);
  }
  process.stdout.write("\n");

  // ---- Promotion candidates ----
  if (analysis.promotionCandidates.length > 0) {
    process.stdout.write("## Promotion Candidates\n\n");
    process.stdout.write("These commands/tools have been asked for approval frequently and may be safe to allow:\n\n");
    for (const c of analysis.promotionCandidates) {
      process.stdout.write(`- **${c.suggestion}**\n`);
      process.stdout.write(`  - Asked ${c.askCount} times across ${c.sessionCount} sessions\n`);
    }
    process.stdout.write("\n");
  }

  // ---- Bash breakdown ----
  if (analysis.bashCommands.length > 0) {
    process.stdout.write("## Bash Command Breakdown (top 20)\n\n");
    process.stdout.write("| Command | Allow | Ask | Deny |\n");
    process.stdout.write("|---------|-------|-----|------|\n");
    for (const row of analysis.bashCommands) {
      const cmd = row.command.length > 50 ? row.command.slice(0, 47) + "..." : row.command;
      process.stdout.write(`| \`${cmd}\` | ${row.allow} | ${row.ask} | ${row.deny} |\n`);
    }
    process.stdout.write("\n");
  }

  // ---- Dead rules ----
  if (analysis.deadRules.length > 0) {
    process.stdout.write("## Dead Rules\n\n");
    process.stdout.write("These rules have never matched any tool call in the audit log:\n\n");
    for (const r of analysis.deadRules) {
      process.stdout.write(`- \`${r.path}: ${r.rule}\`\n`);
    }
    process.stdout.write("\n");
  }

  // ---- YAML suggestions ----
  if (analysis.promotionCandidates.length > 0) {
    process.stdout.write("## Suggested Config Changes\n\n");
    const bashPromotions = analysis.promotionCandidates.filter((c) => c.isBash);
    const toolPromotions = analysis.promotionCandidates.filter((c) => !c.isBash);

    if (bashPromotions.length > 0) {
      process.stdout.write("```yaml\n# Suggested additions to bash.allow:\nbash:\n  allow:\n");
      for (const c of bashPromotions) {
        process.stdout.write(`    - ${c.tool}  # asked ${c.askCount} times\n`);
      }
      process.stdout.write("```\n\n");
    }

    if (toolPromotions.length > 0) {
      process.stdout.write("```yaml\n# Suggested additions to tools.allow:\ntools:\n  allow:\n");
      for (const c of toolPromotions) {
        process.stdout.write(`    - ${c.tool}  # asked ${c.askCount} times\n`);
      }
      process.stdout.write("```\n\n");
    }
  }
}

async function loadAuditLog(logPath: string): Promise<AuditEntry[]> {
  try {
    const file = Bun.file(logPath);
    if (!(await file.exists())) return [];
    const text = await file.text();
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line) as AuditEntry; }
        catch { return null; }
      })
      .filter((e): e is AuditEntry => e !== null);
  } catch {
    return [];
  }
}

function printConfigSummary(config: ReturnType<typeof resolveConfig> extends Promise<infer T> ? T : never): void {
  const c = config;
  process.stdout.write(`default: **${c.default}**\n\n`);

  const sections: Array<{ label: string; items: string[] }> = [
    { label: "tools.allow", items: c.tools.allow },
    { label: "tools.ask", items: c.tools.ask },
    { label: "tools.deny", items: c.tools.deny.map((r) => `${r.tool} — "${r.description}"`) },
    { label: "bash.allow", items: c.tools.bash.allow },
    { label: "bash.ask", items: c.tools.bash.ask },
    { label: "bash.deny", items: c.tools.bash.deny },
    { label: "bash.checks", items: c.tools.bash.checks.map((ch) => `${ch.test} — "${ch.description}"`) },
    { label: "bash.normalise", items: c.tools.bash.normalise.map((n) => `${n.prefix} (strips: ${n.strip.join(", ")})`) },
  ];

  for (const { label, items } of sections) {
    if (items.length === 0) continue;
    process.stdout.write(`**${label}** (${items.length}):\n`);
    for (const item of items) {
      process.stdout.write(`  - ${item}\n`);
    }
    process.stdout.write("\n");
  }
}
