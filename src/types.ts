// ---- Decisions ----

export type Decision = "allow" | "deny" | "ask";

// ---- Secrets scanning (feature 24) ----

export type SecretScannerName = "gitleaks" | "betterleaks" | "trufflehog" | "detect-secrets";

export interface SecretsAllowConfig {
  paths: string[]; // path globs whose file inputs are exempt (e.g. ".env.example")
  rules: string[]; // "<scanner>:<ruleId>" globs to ignore (e.g. "gitleaks:generic-api-key")
}

// All fields optional so configs merge field-by-field (the discourageChaining
// pattern): a preset can set just `enabled: true` and a user config can add
// allowlist entries without either clobbering the other. The loader's
// DEFAULT_CONFIG populates every field, so the resolved config is complete.
export interface SecretsConfig {
  enabled?: boolean;
  // "auto" probes PATH in preference order; a name pins one scanner.
  scanner?: "auto" | SecretScannerName;
  scanInputs?: boolean; // PreToolUse: deny inputs that contain secrets
  scanOutputs?: boolean; // PostToolUse: redact secrets from tool output
  inputTools?: string[];
  outputTools?: string[];
  allow?: SecretsAllowConfig;
  maxScanBytes?: number; // above this, skip scanning entirely
  timeoutMs?: number; // per scanner invocation
}

// ---- Config types ----

export interface ToolDenyRule {
  tool: string; // glob pattern
  description: string;
  alternative?: string;
}

export interface BashCheck {
  test: string; // regex pattern
  description: string;
  alternative?: string;
}

export interface NormaliseRule {
  prefix: string;
  strip: string[]; // regex patterns to remove from command
}

export interface BashConfig {
  normalise: NormaliseRule[];
  deny: string[];
  checks: BashCheck[];
  // Regex "smart allow" rules. Unlike the prefix `allow` list, these match the
  // whole normalised command, so a $-anchored pattern can confine an allow to a
  // single sandbox path (e.g. rm under /tmp/claude). Evaluated above ask/allow.
  allowChecks?: string[];
  ask: string[];
  allow: string[];
  // When true, a command joined by sequencing operators (&&, ;, ||) that would
  // require approval is instead denied with guidance to run the parts as
  // separate tool calls, so each can be approved on its own. Pipes (|) are
  // exempt. Populated with a default by the config loader (feature 17).
  discourageChaining?: boolean;
  // When a Bash command is denied, also offer the user the verbatim command to
  // run themselves via `! <command>` (feature 23). Default true.
  offerManualRun?: boolean;
  // Structured rules over the parsed command (feature 20). Bash is always
  // evaluated via the tree-sitter AST (feature 19); these reason about data the
  // prefix/regex rules can't see.
  redirects?: RedirectRule[];
  arguments?: ArgumentRule[];
  // Nested interpreter analysis (feature 21), keyed by language ("python" | "javascript").
  interpreters?: Record<string, InterpreterConfig>;
}

// ---- Structured bash rules (feature 20) ----

export type RedirectMode = "read" | "write" | "append" | "any";

/** A rule over an output/input redirection target. */
export interface RedirectRule {
  mode: RedirectMode;
  outside?: string[]; // fires if target is outside ALL these roots
  glob?: string; // OR: fires if target matches this path glob
  decision: Decision;
  description?: string;
  alternative?: string;
}

/** A rule over a command's arguments (reasons about every arg, not a prefix). */
export interface ArgumentRule {
  command: string; // command-name glob
  anyArgOutside?: string[]; // any path-like arg outside all roots
  allArgsInside?: string[]; // ≥1 path-like arg, all under some root
  anyArgMatches?: string; // any raw arg matches this regex
  allArgsMatch?: string; // every raw arg matches this regex
  decision: Decision;
  description?: string;
  alternative?: string;
}

// ---- Nested interpreter rules (feature 21) ----

/** A rule over a call in inline interpreter code (e.g. python -c "..."). */
export interface CallRule {
  match: string; // qualified callee glob, e.g. "shutil.rmtree", "subprocess.*"
  argMatches?: string; // optional: any call arg text matches this regex
  pathArgsOutside?: string[]; // fire only if a string path arg is outside all roots
  decision: Decision;
  description?: string;
  alternative?: string;
}

/** Sugar for "a file is opened for writing" outside the given roots. */
export interface WriteRule {
  outside: string[];
  decision: Decision;
  description?: string;
  alternative?: string;
}

export interface ImportRule {
  match: string; // module-name glob
  decision: Decision;
  description?: string;
}

export interface InterpreterConfig {
  names: string[]; // bash command names that invoke this interpreter
  calls?: CallRule[];
  writes?: WriteRule;
  imports?: ImportRule[];
}

export interface ToolsConfig {
  deny: ToolDenyRule[];
  ask: string[];
  allow: string[];
  bash: BashConfig;
}

// Guidance injected into Claude at session start (feature 14).
export interface GuidanceConfig {
  enabled: boolean; // emit SessionStart context at all
  includeDefaults: boolean; // include fencepost's built-in guidance lines
  extra: string[]; // additional lines appended after the defaults
}

// Tool-input redirection (feature 15). Currently scoped to /tmp -> a sandbox dir.
export interface RedirectConfig {
  tmp: boolean; // rewrite bare/prefixed /tmp paths to tmpTarget
  tmpTarget: string; // destination dir, e.g. /tmp/claude
}

export interface FencepostConfig {
  default: Decision;
  // Internal: whether this layer's `default` was explicitly written in the
  // YAML (vs filled with "ask"). Merge is set-wins, like onError.
  _defaultSet?: boolean;
  tools: ToolsConfig;
  // Posture when fencepost runs but cannot reach a decision for a command
  // (e.g. a Bash command the parser can't understand, or an unexpected error).
  // Default "ask" — optimised for an interactive human. Headless/CI users who
  // can't answer a prompt may prefer "allow". A broken *config* is handled
  // separately and always fails closed (deny). (feature 22)
  onError?: Decision;
  // Optional sections; the config loader always populates them with defaults,
  // but unit tests may construct a FencepostConfig without them.
  guidance?: GuidanceConfig;
  redirect?: RedirectConfig;
  secrets?: SecretsConfig;
}

// Resolved config with provenance tracking
export interface ResolvedConfig extends FencepostConfig {
  _sources: string[]; // list of source files loaded
}

// ---- Hook I/O types ----

export interface HookInput {
  session_id: string;
  transcript_path?: string;
  cwd: string;
  permission_mode?: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_use_id: string;
  // Present on PostToolUse only. Shape varies by tool; treated opaquely.
  tool_response?: unknown;
}

export interface HookSpecificOutput {
  hookEventName: "PreToolUse";
  permissionDecision: Decision;
  permissionDecisionReason?: string;
  additionalContext?: string;
  updatedInput?: Record<string, unknown>;
}

export interface HookOutput {
  hookSpecificOutput: HookSpecificOutput;
}

// ---- Evaluation result ----

export interface EvalResult {
  decision: Decision;
  reason: string;
  alternative?: string;
  matchedRule?: string; // e.g. "bash.deny: git branch -D"
  matchedInput?: string; // the command/tool that matched
  isCompound?: boolean;
  chained?: boolean; // denied purely because chaining is discouraged (feature 17)
}

// ---- Audit types ----

export interface AuditEntry {
  ts: string; // ISO 8601
  sid: string; // session_id
  tool: string; // tool_name
  input: string; // command (Bash) or truncated tool_input JSON
  decision: Decision;
  reason: string;
  rule: string | null; // config path that matched
  tid: string; // tool_use_id
  cwd: string; // project dir the call ran in — attributes centralised entries to a project
  normalised?: string; // only for Bash when normalisation changed the command
  // Secrets scanning outcome (feature 24). Rule ids only — never secret values.
  secrets?: { scanner: string; rules: string[]; count: number };
}
