import { load as yamlLoad } from "js-yaml";
import { join, resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { logger } from "./logger.js";
import type {
  FencepostConfig,
  ResolvedConfig,
  BashConfig,
  ToolsConfig,
  GuidanceConfig,
  RedirectConfig,
} from "./types.js";

// ---- Defaults ----

// Command chaining is discouraged by default (feature 17).
const DEFAULT_DISCOURAGE_CHAINING = true;

const DEFAULT_BASH_CONFIG: BashConfig = {
  normalise: [],
  deny: [],
  checks: [],
  allowChecks: [],
  ask: [],
  allow: [],
  discourageChaining: DEFAULT_DISCOURAGE_CHAINING,
};

const DEFAULT_TOOLS_CONFIG: ToolsConfig = {
  deny: [],
  ask: [],
  allow: [],
  bash: DEFAULT_BASH_CONFIG,
};

const DEFAULT_GUIDANCE_CONFIG: GuidanceConfig = {
  enabled: true,
  includeDefaults: true,
  extra: [],
};

// /tmp redirection is opt-in at the core level; the `claude` preset turns it on.
const DEFAULT_REDIRECT_CONFIG: RedirectConfig = {
  tmp: false,
  tmpTarget: "/tmp/claude",
};

export const DEFAULT_CONFIG: FencepostConfig = {
  default: "ask",
  tools: DEFAULT_TOOLS_CONFIG,
  guidance: DEFAULT_GUIDANCE_CONFIG,
  redirect: DEFAULT_REDIRECT_CONFIG,
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
  const allowChecks = ((bashRaw["allowChecks"] ?? []) as unknown[]).filter((s): s is string => {
    if (typeof s !== "string") return false;
    try {
      new RegExp(s);
      return true;
    } catch {
      logger.warn({ source, pattern: s }, "bash.allowChecks entry has invalid regex, skipping");
      return false;
    }
  });
  // Left undefined when absent so a later file that omits it does not clobber
  // an explicit setting; the default is applied via the merge against DEFAULT_CONFIG.
  const discourageChaining =
    typeof bashRaw["discourageChaining"] === "boolean" ? (bashRaw["discourageChaining"] as boolean) : undefined;

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

  // ---- guidance (block-level last-wins) ----
  let guidance: GuidanceConfig | undefined;
  const guidanceRaw = obj["guidance"];
  if (typeof guidanceRaw === "object" && guidanceRaw !== null) {
    const g = guidanceRaw as Record<string, unknown>;
    guidance = {
      enabled: typeof g["enabled"] === "boolean" ? g["enabled"] : true,
      includeDefaults: typeof g["includeDefaults"] === "boolean" ? g["includeDefaults"] : true,
      extra: Array.isArray(g["extra"]) ? g["extra"].filter((s): s is string => typeof s === "string") : [],
    };
  }

  // ---- redirect (block-level last-wins) ----
  let redirect: RedirectConfig | undefined;
  const redirectRaw = obj["redirect"];
  if (typeof redirectRaw === "object" && redirectRaw !== null) {
    const r = redirectRaw as Record<string, unknown>;
    redirect = {
      tmp: typeof r["tmp"] === "boolean" ? r["tmp"] : false,
      tmpTarget: typeof r["tmpTarget"] === "string" && r["tmpTarget"] ? r["tmpTarget"] : "/tmp/claude",
    };
  }

  const result: FencepostConfig = {
    default: defaultDecision,
    tools: {
      deny,
      ask,
      allow,
      bash: { normalise, deny: bashDeny, checks, allowChecks, ask: bashAsk, allow: bashAllow, discourageChaining },
    },
  };
  if (guidance) result.guidance = guidance;
  if (redirect) result.redirect = redirect;
  return result;
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
        allowChecks: [...(base.tools.bash.allowChecks ?? []), ...(override.tools.bash.allowChecks ?? [])],
        ask: [...base.tools.bash.ask, ...override.tools.bash.ask],
        allow: [...base.tools.bash.allow, ...override.tools.bash.allow],
        // Scalar: override only when explicitly set, otherwise inherit the base.
        discourageChaining: override.tools.bash.discourageChaining ?? base.tools.bash.discourageChaining,
      },
    },
    // Block-level last-wins: an override that omits the block inherits the base.
    guidance: override.guidance ?? base.guidance,
    redirect: override.redirect ?? base.redirect,
  };
}

// ---- Imports (bundled presets) ----

// Preset names are bare identifiers, never paths. This prevents an `import`
// entry from reaching outside the presets directory.
const PRESET_NAME_RE = /^[a-zA-Z0-9_-]+$/;

/** Extract the top-level `import:` list from raw parsed YAML. */
function extractImports(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return [];
  const imp = (raw as Record<string, unknown>)["import"];
  if (!Array.isArray(imp)) return [];
  return imp.filter((s): s is string => typeof s === "string");
}

/** Directories searched, in order, for a named preset. */
function presetSearchDirs(): string[] {
  const dirs: string[] = [];
  const envDir = process.env["FENCEPOST_PRESETS_DIR"];
  if (envDir) dirs.push(envDir);
  // Relative to the compiled binary: bin/fencepost -> ../presets
  try {
    dirs.push(join(dirname(process.execPath), "..", "presets"));
  } catch {
    /* process.execPath unavailable; ignore */
  }
  // Relative to source during development: src/ -> ../presets
  dirs.push(join(import.meta.dir, "..", "presets"));
  return dirs;
}

/** Resolve a preset name to an on-disk YAML path, or null if not found. */
async function resolvePreset(name: string): Promise<string | null> {
  if (!PRESET_NAME_RE.test(name)) {
    logger.warn({ name }, "invalid preset name in import (must be a bare identifier), skipping");
    return null;
  }
  for (const dir of presetSearchDirs()) {
    for (const ext of [".yaml", ".yml"]) {
      const candidate = join(dir, name + ext);
      if (await Bun.file(candidate).exists()) return candidate;
    }
  }
  logger.warn({ name, searched: presetSearchDirs() }, "imported preset not found, skipping");
  return null;
}

/**
 * Load and merge the named presets into a single base config. Presets are
 * merged in listed order; nested imports inside a preset are ignored.
 */
async function loadImports(names: string[]): Promise<{ config: FencepostConfig; sources: string[] }> {
  let merged = DEFAULT_CONFIG;
  const sources: string[] = [];
  for (const name of names) {
    const path = await resolvePreset(name);
    if (!path) continue;
    const loaded = await loadYamlFile(path);
    if (!loaded) continue;
    merged = mergeConfigs(merged, loaded.config);
    sources.push(path);
  }
  return { config: merged, sources };
}

// ---- File loading ----

async function loadYamlFile(
  filePath: string,
): Promise<{ config: FencepostConfig; imports: string[] } | null> {
  try {
    const text = await Bun.file(filePath).text();
    const raw = yamlLoad(text);
    const config = validateConfig(raw, filePath);
    if (!config) {
      logger.warn({ file: filePath }, "skipping invalid config file");
      return null;
    }
    logger.debug({ file: filePath }, "loaded config file");
    return { config, imports: extractImports(raw) };
  } catch (err) {
    logger.warn({ file: filePath, err }, "failed to read/parse config file");
    return null;
  }
}

async function loadConfDir(
  dirPath: string,
): Promise<{ config: FencepostConfig; sources: string[]; imports: string[] } | null> {
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
  const imports: string[] = [];

  for (const file of yamlFiles) {
    const loaded = await loadYamlFile(file);
    if (loaded) {
      merged = mergeConfigs(merged, loaded.config);
      sources.push(file);
      imports.push(...loaded.imports);
    }
  }

  return sources.length > 0 ? { config: merged, sources, imports } : null;
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
 *
 * Any `import:` entries in the resolved config pull in bundled presets, which
 * are merged as the base (so the user's own rules layer on top of them).
 */
export async function resolveConfig(cwd: string): Promise<ResolvedConfig> {
  const home = homedir();
  const claudeDir = join(resolve(cwd), ".claude");

  const candidates = [
    { confDir: join(claudeDir, "fencepost", "config"), singleFile: join(claudeDir, "fencepost.yaml") },
    { confDir: join(home, ".claude", "fencepost", "config"), singleFile: join(home, ".claude", "fencepost.yaml") },
  ];

  let host: { config: FencepostConfig; sources: string[]; imports: string[] } | null = null;

  for (const { confDir, singleFile } of candidates) {
    // Try conf.d directory first
    const dirResult = await loadConfDir(confDir);
    if (dirResult) {
      host = dirResult;
      break;
    }

    // Fall back to single file
    if (await Bun.file(singleFile).exists()) {
      const loaded = await loadYamlFile(singleFile);
      if (loaded) {
        host = { config: loaded.config, sources: [singleFile], imports: loaded.imports };
        break;
      }
    }
  }

  if (!host) {
    logger.warn({ cwd }, "no config found, using defaults");
    return { ...DEFAULT_CONFIG, _sources: [] };
  }

  // Merge imported presets as the base, then layer the user's own rules on top.
  const presets = await loadImports(host.imports);
  const finalConfig = mergeConfigs(presets.config, host.config);
  const sources = [...presets.sources, ...host.sources];

  logger.info({ sources, imports: host.imports }, "config resolved");
  return { ...finalConfig, _sources: sources };
}
