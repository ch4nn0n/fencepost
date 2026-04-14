import { load as yamlLoad } from "js-yaml";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger.js";
import type {
  FencepostConfig,
  ResolvedConfig,
  BashConfig,
  ToolsConfig,
} from "./types.js";

// ---- Defaults ----

const DEFAULT_BASH_CONFIG: BashConfig = {
  normalise: [],
  deny: [],
  checks: [],
  ask: [],
  allow: [],
};

const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  deny: [],
  ask: [],
  allow: [],
  bash: DEFAULT_BASH_CONFIG,
};

export const DEFAULT_CONFIG: FencepostConfig = {
  default: "ask",
  tools: DEFAULT_TOOLS_CONFIG,
};

// ---- Validation ----

function isDecision(v: unknown): v is "allow" | "deny" | "ask" {
  return v === "allow" || v === "deny" || v === "ask";
}

function validateConfig(raw: unknown, source: string): FencepostConfig | null {
  if (typeof raw !== "object" || raw === null) {
    logger.warn({ source }, "config is not an object, skipping");
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const defaultDecision = obj["default"] ?? "ask";
  if (!isDecision(defaultDecision)) {
    logger.warn({ source, value: defaultDecision }, "invalid default decision");
    return null;
  }

  const toolsRaw = (obj["tools"] ?? {}) as Record<string, unknown>;

  // Validate tools.deny
  const denyRaw = (toolsRaw["deny"] ?? []) as unknown[];
  const deny = denyRaw
    .filter((r): r is Record<string, unknown> => {
      if (typeof r !== "object" || r === null || !("tool" in r) || !("description" in r)) {
        logger.warn({ source, rule: r }, "tools.deny entry missing tool or description, skipping");
        return false;
      }
      return true;
    })
    .map((r) => ({
      tool: String(r["tool"]),
      description: String(r["description"]),
      alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined,
    }));

  // Validate tools.ask / tools.allow (plain strings)
  const ask = ((toolsRaw["ask"] ?? []) as unknown[]).filter((s): s is string => {
    if (typeof s !== "string") { logger.warn({ source, value: s }, "tools.ask entry is not a string, skipping"); return false; }
    return true;
  });
  const allow = ((toolsRaw["allow"] ?? []) as unknown[]).filter((s): s is string => {
    if (typeof s !== "string") { logger.warn({ source, value: s }, "tools.allow entry is not a string, skipping"); return false; }
    return true;
  });

  // Validate tools.bash
  const bashRaw = (toolsRaw["bash"] ?? {}) as Record<string, unknown>;

  const normalise = ((bashRaw["normalise"] ?? []) as unknown[])
    .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null && "prefix" in r && "strip" in r)
    .map((r) => ({
      prefix: String(r["prefix"]),
      strip: ((r["strip"] ?? []) as unknown[]).filter((s): s is string => typeof s === "string"),
    }));

  const bashDeny = ((bashRaw["deny"] ?? []) as unknown[]).filter((s): s is string => typeof s === "string");
  const bashAsk = ((bashRaw["ask"] ?? []) as unknown[]).filter((s): s is string => typeof s === "string");
  const bashAllow = ((bashRaw["allow"] ?? []) as unknown[]).filter((s): s is string => typeof s === "string");

  const checks = ((bashRaw["checks"] ?? []) as unknown[])
    .filter((r): r is Record<string, unknown> => {
      if (typeof r !== "object" || r === null || !("test" in r) || !("description" in r)) {
        logger.warn({ source, rule: r }, "bash.checks entry missing test or description, skipping");
        return false;
      }
      // Validate regex
      try {
        new RegExp(String((r as Record<string, unknown>)["test"]));
        return true;
      } catch {
        logger.warn({ source, pattern: (r as Record<string, unknown>)["test"] }, "bash.checks entry has invalid regex, skipping");
        return false;
      }
    })
    .map((r) => ({
      test: String(r["test"]),
      description: String(r["description"]),
      alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined,
    }));

  return {
    default: defaultDecision,
    tools: {
      deny,
      ask,
      allow,
      bash: { normalise, deny: bashDeny, checks, ask: bashAsk, allow: bashAllow },
    },
  };
}

// ---- Merging ----

function mergeConfigs(base: FencepostConfig, override: FencepostConfig): FencepostConfig {
  return {
    default: override.default, // last wins
    tools: {
      deny: [...base.tools.deny, ...override.tools.deny],
      ask: [...base.tools.ask, ...override.tools.ask],
      allow: [...base.tools.allow, ...override.tools.allow],
      bash: {
        normalise: [...base.tools.bash.normalise, ...override.tools.bash.normalise],
        deny: [...base.tools.bash.deny, ...override.tools.bash.deny],
        checks: [...base.tools.bash.checks, ...override.tools.bash.checks],
        ask: [...base.tools.bash.ask, ...override.tools.bash.ask],
        allow: [...base.tools.bash.allow, ...override.tools.bash.allow],
      },
    },
  };
}

// ---- File loading ----

async function loadYamlFile(filePath: string): Promise<FencepostConfig | null> {
  try {
    const text = await Bun.file(filePath).text();
    const raw = yamlLoad(text);
    const config = validateConfig(raw, filePath);
    if (!config) {
      logger.warn({ file: filePath }, "skipping invalid config file");
      return null;
    }
    logger.debug({ file: filePath }, "loaded config file");
    return config;
  } catch (err) {
    logger.warn({ file: filePath, err }, "failed to read/parse config file");
    return null;
  }
}

async function loadConfDir(dirPath: string): Promise<{ config: FencepostConfig; sources: string[] } | null> {
  let entries: string[];
  try {
    const { readdir } = await import("node:fs/promises");
    entries = await readdir(dirPath);
  } catch {
    return null;
  }

  const yamlFiles = entries
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort() // alphabetical
    .map((f) => join(dirPath, f));

  if (yamlFiles.length === 0) return null;

  let merged = DEFAULT_CONFIG;
  const sources: string[] = [];

  for (const file of yamlFiles) {
    const cfg = await loadYamlFile(file);
    if (cfg) {
      merged = mergeConfigs(merged, cfg);
      sources.push(file);
    }
  }

  return sources.length > 0 ? { config: merged, sources } : null;
}

// ---- Public API ----

/**
 * Resolve the fencepost config for a given working directory.
 *
 * Resolution order:
 * 1. {cwd}/.claude/fencepost/config/ — conf.d style
 * 2. {cwd}/.claude/fencepost.yaml   — single file (backward compat)
 * 3. ~/.claude/fencepost/config/    — user-level conf.d
 * 4. ~/.claude/fencepost.yaml       — user-level single file
 * 5. Default config (fail-open)
 */
export async function resolveConfig(cwd: string): Promise<ResolvedConfig> {
  const home = homedir();
  const claudeDir = join(resolve(cwd), ".claude");

  const candidates = [
    { confDir: join(claudeDir, "fencepost", "config"), singleFile: join(claudeDir, "fencepost.yaml") },
    { confDir: join(home, ".claude", "fencepost", "config"), singleFile: join(home, ".claude", "fencepost.yaml") },
  ];

  for (const { confDir, singleFile } of candidates) {
    // Try conf.d directory first
    const dirResult = await loadConfDir(confDir);
    if (dirResult) {
      logger.info({ sources: dirResult.sources }, "config loaded from directory");
      return { ...dirResult.config, _sources: dirResult.sources };
    }

    // Fall back to single file
    if (await Bun.file(singleFile).exists()) {
      const cfg = await loadYamlFile(singleFile);
      if (cfg) {
        logger.info({ source: singleFile }, "config loaded from single file");
        return { ...cfg, _sources: [singleFile] };
      }
    }
  }

  logger.warn({ cwd }, "no config found, using defaults");
  return { ...DEFAULT_CONFIG, _sources: [] };
}
