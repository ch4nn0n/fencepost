import { load as yamlLoad } from "js-yaml";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { logger } from "./logger.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
import type {
  FencepostConfig,
  ResolvedConfig,
  BashConfig,
  ToolsConfig,
  GuidanceConfig,
  RedirectConfig,
  RedirectRule,
  ArgumentRule,
  CallRule,
  WriteRule,
  ImportRule,
  InterpreterConfig,
  Decision,
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
  offerManualRun: true,
  redirects: [],
  arguments: [],
  interpreters: {},
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

// Optimised for an interactive human: when we can't decide, ask.
const DEFAULT_ON_ERROR: Decision = "ask";

export const DEFAULT_CONFIG: FencepostConfig = {
  default: "ask",
  onError: DEFAULT_ON_ERROR,
  tools: DEFAULT_TOOLS_CONFIG,
  guidance: DEFAULT_GUIDANCE_CONFIG,
  redirect: DEFAULT_REDIRECT_CONFIG,
};

// ---- Issue collection ----

export interface ConfigIssue {
  level: "error" | "warning";
  file: string;
  message: string;
}

// Active only while compileConfig() is running. Parse/validation helpers record
// issues here (in addition to logging) so the verifier can report them.
let issueSink: ConfigIssue[] | null = null;

function note(level: "error" | "warning", file: string, message: string): void {
  if (issueSink) issueSink.push({ level, file, message });
  if (level === "error") logger.error({ file }, message);
  else logger.warn({ file }, message);
}

// ---- Validation ----

function isDecision(v: unknown): v is Decision {
  return v === "allow" || v === "deny" || v === "ask";
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

function optStr(v: unknown): string | undefined {
  return v !== undefined ? String(v) : undefined;
}

function validRegex(pattern: unknown, source: string, where: string): boolean {
  try {
    new RegExp(String(pattern));
    return true;
  } catch {
    note("warning", source, `${where}: invalid regex ${JSON.stringify(pattern)}, skipping rule`);
    return false;
  }
}

// ---- Structured bash rule parsers (features 20/21) ----

function parseRedirectRules(raw: unknown, source: string): RedirectRule[] {
  if (!Array.isArray(raw)) return [];
  const out: RedirectRule[] = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const o = r as Record<string, unknown>;
    const mode = o["mode"];
    if (mode !== "read" && mode !== "write" && mode !== "append" && mode !== "any") {
      note("warning", source, "redirects: invalid mode, skipping rule");
      continue;
    }
    if (!isDecision(o["decision"])) {
      note("warning", source, "redirects: invalid decision, skipping rule");
      continue;
    }
    const hasOutside = Array.isArray(o["outside"]);
    const hasGlob = typeof o["glob"] === "string";
    if (hasOutside === hasGlob) {
      note("warning", source, "redirects: provide exactly one of outside/glob, skipping rule");
      continue;
    }
    out.push({
      mode,
      decision: o["decision"] as Decision,
      ...(hasOutside ? { outside: asStringArray(o["outside"]) } : { glob: String(o["glob"]) }),
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"]),
    });
  }
  return out;
}

function parseArgumentRules(raw: unknown, source: string): ArgumentRule[] {
  if (!Array.isArray(raw)) return [];
  const out: ArgumentRule[] = [];
  const predicates = ["anyArgOutside", "allArgsInside", "anyArgMatches", "allArgsMatch"] as const;
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const o = r as Record<string, unknown>;
    if (typeof o["command"] !== "string") {
      note("warning", source, "arguments: missing command, skipping rule");
      continue;
    }
    if (!isDecision(o["decision"])) {
      note("warning", source, "arguments: invalid decision, skipping rule");
      continue;
    }
    const present = predicates.filter((k) => o[k] !== undefined);
    if (present.length !== 1) {
      note("warning", source, "arguments: provide exactly one predicate, skipping rule");
      continue;
    }
    if (o["anyArgMatches"] !== undefined && !validRegex(o["anyArgMatches"], source, "arguments.anyArgMatches")) continue;
    if (o["allArgsMatch"] !== undefined && !validRegex(o["allArgsMatch"], source, "arguments.allArgsMatch")) continue;
    out.push({
      command: o["command"],
      decision: o["decision"] as Decision,
      ...(o["anyArgOutside"] !== undefined ? { anyArgOutside: asStringArray(o["anyArgOutside"]) } : {}),
      ...(o["allArgsInside"] !== undefined ? { allArgsInside: asStringArray(o["allArgsInside"]) } : {}),
      ...(o["anyArgMatches"] !== undefined ? { anyArgMatches: String(o["anyArgMatches"]) } : {}),
      ...(o["allArgsMatch"] !== undefined ? { allArgsMatch: String(o["allArgsMatch"]) } : {}),
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"]),
    });
  }
  return out;
}

function parseCallRules(raw: unknown, source: string): CallRule[] {
  if (!Array.isArray(raw)) return [];
  const out: CallRule[] = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const o = r as Record<string, unknown>;
    if (typeof o["match"] !== "string" || !isDecision(o["decision"])) {
      note("warning", source, "interpreters.calls: missing match or decision, skipping rule");
      continue;
    }
    if (o["argMatches"] !== undefined && !validRegex(o["argMatches"], source, "interpreters.calls.argMatches")) continue;
    out.push({
      match: o["match"],
      decision: o["decision"] as Decision,
      ...(o["argMatches"] !== undefined ? { argMatches: String(o["argMatches"]) } : {}),
      ...(o["pathArgsOutside"] !== undefined ? { pathArgsOutside: asStringArray(o["pathArgsOutside"]) } : {}),
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"]),
    });
  }
  return out;
}

function parseImportRules(raw: unknown, source: string): ImportRule[] {
  if (!Array.isArray(raw)) return [];
  const out: ImportRule[] = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const o = r as Record<string, unknown>;
    if (typeof o["match"] !== "string" || !isDecision(o["decision"])) {
      note("warning", source, "interpreters.imports: missing match or decision, skipping rule");
      continue;
    }
    out.push({ match: o["match"], decision: o["decision"] as Decision, description: optStr(o["description"]) });
  }
  return out;
}

function parseWriteRule(raw: unknown, source: string): WriteRule | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o["outside"]) || !isDecision(o["decision"])) {
    note("warning", source, "interpreters.writes: needs outside[] and decision, skipping");
    return undefined;
  }
  return {
    outside: asStringArray(o["outside"]),
    decision: o["decision"] as Decision,
    description: optStr(o["description"]),
    alternative: optStr(o["alternative"]),
  };
}

function parseInterpreters(raw: unknown, source: string): Record<string, InterpreterConfig> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, InterpreterConfig> = {};
  for (const [lang, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) continue;
    const o = v as Record<string, unknown>;
    out[lang] = {
      names: asStringArray(o["names"]),
      calls: parseCallRules(o["calls"], source),
      imports: parseImportRules(o["imports"], source),
      writes: parseWriteRule(o["writes"], source),
    };
  }
  return out;
}

/**
 * Validate one parsed config object. Returns null on a *structural* (fatal)
 * problem — wrong top-level shape or an invalid `default`/`onError` value — and
 * records it as an error. Per-rule problems are recorded as warnings and the
 * offending rule skipped.
 */
function validateConfig(raw: unknown, source: string): FencepostConfig | null {
  if (typeof raw !== "object" || raw === null) {
    note("error", source, "config is not a YAML mapping");
    return null;
  }

  const obj = raw as Record<string, unknown>;

  const defaultDecision = obj["default"] ?? "ask";
  if (!isDecision(defaultDecision)) {
    note("error", source, `invalid 'default' value: ${JSON.stringify(obj["default"])} (expected allow|deny|ask)`);
    return null;
  }

  let onError: Decision | undefined;
  if (obj["onError"] !== undefined) {
    if (!isDecision(obj["onError"])) {
      note("error", source, `invalid 'onError' value: ${JSON.stringify(obj["onError"])} (expected allow|deny|ask)`);
      return null;
    }
    onError = obj["onError"];
  }

  const toolsRaw = (obj["tools"] ?? {}) as Record<string, unknown>;

  const denyRaw = (toolsRaw["deny"] ?? []) as unknown[];
  const deny = denyRaw
    .filter((r): r is Record<string, unknown> => {
      if (typeof r !== "object" || r === null || !("tool" in r) || !("description" in r)) {
        note("warning", source, "tools.deny entry missing tool or description, skipping");
        return false;
      }
      return true;
    })
    .map((r) => ({
      tool: String(r["tool"]),
      description: String(r["description"]),
      alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined,
    }));

  const ask = ((toolsRaw["ask"] ?? []) as unknown[]).filter((s): s is string => {
    if (typeof s !== "string") {
      note("warning", source, "tools.ask entry is not a string, skipping");
      return false;
    }
    return true;
  });
  const allow = ((toolsRaw["allow"] ?? []) as unknown[]).filter((s): s is string => {
    if (typeof s !== "string") {
      note("warning", source, "tools.allow entry is not a string, skipping");
      return false;
    }
    return true;
  });

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
  const allowChecks = ((bashRaw["allowChecks"] ?? []) as unknown[]).filter(
    (s): s is string => typeof s === "string" && validRegex(s, source, "bash.allowChecks"),
  );
  const discourageChaining =
    typeof bashRaw["discourageChaining"] === "boolean" ? (bashRaw["discourageChaining"] as boolean) : undefined;
  const offerManualRun =
    typeof bashRaw["offerManualRun"] === "boolean" ? (bashRaw["offerManualRun"] as boolean) : undefined;
  const redirects = parseRedirectRules(bashRaw["redirects"], source);
  const argumentRules = parseArgumentRules(bashRaw["arguments"], source);
  const interpreters = parseInterpreters(bashRaw["interpreters"], source);

  const checks = ((bashRaw["checks"] ?? []) as unknown[])
    .filter((r): r is Record<string, unknown> => {
      if (typeof r !== "object" || r === null || !("test" in r) || !("description" in r)) {
        note("warning", source, "bash.checks entry missing test or description, skipping");
        return false;
      }
      return validRegex((r as Record<string, unknown>)["test"], source, "bash.checks");
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
      bash: {
        normalise,
        deny: bashDeny,
        checks,
        allowChecks,
        ask: bashAsk,
        allow: bashAllow,
        discourageChaining,
        offerManualRun,
        redirects,
        arguments: argumentRules,
        interpreters,
      },
    },
  };
  if (onError) result.onError = onError;
  if (guidance) result.guidance = guidance;
  if (redirect) result.redirect = redirect;
  return result;
}

// ---- Merging ----

/** Merge interpreter maps: union names, concat calls/imports, writes last-wins. */
function mergeInterpreters(
  base: Record<string, InterpreterConfig> | undefined,
  override: Record<string, InterpreterConfig> | undefined,
): Record<string, InterpreterConfig> {
  const out: Record<string, InterpreterConfig> = {};
  for (const [lang, cfg] of Object.entries(base ?? {})) out[lang] = { ...cfg };
  for (const [lang, cfg] of Object.entries(override ?? {})) {
    const prev = out[lang];
    out[lang] = prev
      ? {
          names: [...new Set([...(prev.names ?? []), ...(cfg.names ?? [])])],
          calls: [...(prev.calls ?? []), ...(cfg.calls ?? [])],
          imports: [...(prev.imports ?? []), ...(cfg.imports ?? [])],
          writes: cfg.writes ?? prev.writes,
        }
      : { ...cfg };
  }
  return out;
}

function mergeConfigs(base: FencepostConfig, override: FencepostConfig): FencepostConfig {
  return {
    default: override.default, // last wins
    onError: override.onError ?? base.onError,
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
        redirects: [...(base.tools.bash.redirects ?? []), ...(override.tools.bash.redirects ?? [])],
        arguments: [...(base.tools.bash.arguments ?? []), ...(override.tools.bash.arguments ?? [])],
        interpreters: mergeInterpreters(base.tools.bash.interpreters, override.tools.bash.interpreters),
        // Scalars: override only when explicitly set, otherwise inherit the base.
        discourageChaining: override.tools.bash.discourageChaining ?? base.tools.bash.discourageChaining,
        offerManualRun: override.tools.bash.offerManualRun ?? base.tools.bash.offerManualRun,
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
  try {
    dirs.push(join(dirname(process.execPath), "..", "presets"));
  } catch {
    /* process.execPath unavailable; ignore */
  }
  dirs.push(join(moduleDir, "..", "presets"));
  return dirs;
}

/** Resolve a preset name to an on-disk YAML path, or null if not found. */
async function resolvePreset(name: string, importedFrom: string): Promise<string | null> {
  if (!PRESET_NAME_RE.test(name)) {
    note("warning", importedFrom, `invalid preset name in import: ${JSON.stringify(name)} (must be a bare identifier)`);
    return null;
  }
  for (const dir of presetSearchDirs()) {
    for (const ext of [".yaml", ".yml"]) {
      const candidate = join(dir, name + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  note("warning", importedFrom, `imported preset not found: ${name}`);
  return null;
}

/**
 * Load and merge the named presets into a single base config. Presets are
 * merged in listed order; nested imports inside a preset are ignored.
 */
async function loadImports(names: string[], importedFrom: string): Promise<{ config: FencepostConfig; sources: string[] }> {
  let merged = DEFAULT_CONFIG;
  const sources: string[] = [];
  for (const name of names) {
    const path = await resolvePreset(name, importedFrom);
    if (!path) continue;
    const loaded = await loadYamlFile(path);
    if (!loaded) continue; // loadYamlFile recorded the error
    merged = mergeConfigs(merged, loaded.config);
    sources.push(path);
  }
  return { config: merged, sources };
}

// ---- File loading ----

/** Load one config file. Returns null on a present-but-broken file (error noted). */
async function loadYamlFile(
  filePath: string,
): Promise<{ config: FencepostConfig; imports: string[] } | null> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (err) {
    note("error", filePath, `could not read file: ${(err as Error).message}`);
    return null;
  }
  let raw: unknown;
  try {
    raw = yamlLoad(text);
  } catch (err) {
    note("error", filePath, `YAML parse error: ${(err as Error).message}`);
    return null;
  }
  const config = validateConfig(raw, filePath);
  if (!config) return null; // validateConfig recorded the fatal error
  return { config, imports: extractImports(raw) };
}

async function loadConfDir(
  dirPath: string,
): Promise<{ config: FencepostConfig; sources: string[]; imports: string[] } | null> {
  let entries: string[];
  try {
    const { readdir } = await import("node:fs/promises");
    entries = await readdir(dirPath);
  } catch {
    return null; // directory absent — not an error
  }

  const yamlFiles = entries
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .sort()
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
    // A broken file already recorded an error issue; we keep going so the
    // verifier can report every problem, but the run will fail closed.
  }

  return { config: merged, sources, imports };
}

// ---- Compiled config (verify + show) ----

/**
 * The fully resolved config plus any issues found while loading it. This is the
 * canonical loader; `resolveConfig` is a thin wrapper for the hot path.
 */
export class CompiledConfig {
  constructor(
    readonly config: ResolvedConfig,
    readonly issues: ConfigIssue[],
  ) {}

  get sources(): string[] {
    return this.config._sources;
  }
  get errors(): ConfigIssue[] {
    return this.issues.filter((i) => i.level === "error");
  }
  get warnings(): ConfigIssue[] {
    return this.issues.filter((i) => i.level === "warning");
  }
  /** True when the config loaded cleanly enough to enforce. */
  get ok(): boolean {
    return this.errors.length === 0;
  }

  /** Human-readable verification + effective-config report. */
  render(): string {
    const lines: string[] = ["# Fencepost config", ""];

    if (this.sources.length === 0) {
      lines.push("No config files found — using built-in defaults.", "");
    } else {
      lines.push(`Sources (${this.sources.length}):`);
      for (const s of this.sources) lines.push(`  - ${s}`);
      lines.push("");
    }

    if (this.errors.length > 0) {
      lines.push(`## Errors (${this.errors.length}) — config will FAIL CLOSED until fixed`);
      for (const e of this.errors) lines.push(`  ✖ [${e.file}] ${e.message}`);
      lines.push("");
    }
    if (this.warnings.length > 0) {
      lines.push(`## Warnings (${this.warnings.length})`);
      for (const w of this.warnings) lines.push(`  ⚠ [${w.file}] ${w.message}`);
      lines.push("");
    }
    if (this.ok && this.warnings.length === 0) {
      lines.push("No problems found.", "");
    }

    const { _sources, ...effective } = this.config;
    void _sources;
    lines.push("## Effective config", "```json", JSON.stringify(effective, null, 2), "```");
    return lines.join("\n");
  }
}

// ---- Public API ----

/**
 * Resolution order:
 * 1. {cwd}/.claude/fencepost/config/ — conf.d style
 * 2. {cwd}/.claude/fencepost.yaml   — single file (backward compat)
 * 3. ~/.claude/fencepost/config/    — user-level conf.d
 * 4. ~/.claude/fencepost.yaml       — user-level single file
 * 5. Default config (no config is not an error)
 *
 * Returns the resolved config plus every issue found. A present-but-broken
 * config file records an error (CompiledConfig.ok === false); callers should
 * fail closed in that case.
 */
export async function compileConfig(cwd: string): Promise<CompiledConfig> {
  const issues: ConfigIssue[] = [];
  const prevSink = issueSink;
  issueSink = issues;
  try {
    const config = await resolveInternal(cwd);
    return new CompiledConfig(config, issues);
  } finally {
    issueSink = prevSink;
  }
}

async function resolveInternal(cwd: string): Promise<ResolvedConfig> {
  const home = homedir();
  const claudeDir = join(resolve(cwd), ".claude");

  const candidates = [
    { confDir: join(claudeDir, "fencepost", "config"), singleFile: join(claudeDir, "fencepost.yaml") },
    { confDir: join(home, ".claude", "fencepost", "config"), singleFile: join(home, ".claude", "fencepost.yaml") },
  ];

  let host: { config: FencepostConfig; sources: string[]; imports: string[]; from: string } | null = null;

  for (const { confDir, singleFile } of candidates) {
    const dirResult = await loadConfDir(confDir);
    if (dirResult) {
      host = { ...dirResult, from: confDir };
      break;
    }
    if (existsSync(singleFile)) {
      const loaded = await loadYamlFile(singleFile);
      // Even when broken (loaded === null) we treat this as "config present":
      // an error was recorded and we stop searching, so the run fails closed.
      // List the file either way so the report points at it.
      host = {
        config: loaded?.config ?? DEFAULT_CONFIG,
        sources: [singleFile],
        imports: loaded?.imports ?? [],
        from: singleFile,
      };
      break;
    }
  }

  if (!host) {
    logger.warn({ cwd }, "no config found, using defaults");
    return { ...DEFAULT_CONFIG, _sources: [] };
  }

  const presets = await loadImports(host.imports, host.from);
  const finalConfig = mergeConfigs(presets.config, host.config);
  const sources = [...presets.sources, ...host.sources];

  logger.info({ sources, imports: host.imports }, "config resolved");
  return { ...finalConfig, _sources: sources };
}

/** Hot-path convenience: the resolved config only. Use compileConfig() to see issues. */
export async function resolveConfig(cwd: string): Promise<ResolvedConfig> {
  return (await compileConfig(cwd)).config;
}
