// ---- Decisions ----

export type Decision = "allow" | "deny" | "ask";

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
  // SPIKE (feature 19): "ast" routes Bash through the tree-sitter extractor;
  // "string" (default) uses the split + control-flow-strip pipeline.
  parser?: "ast" | "string";
  // AST-only rule: deny output redirection to an absolute path outside the sandbox.
  denyWritesOutsideSandbox?: boolean;
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
  tools: ToolsConfig;
  // Optional sections; the config loader always populates them with defaults,
  // but unit tests may construct a FencepostConfig without them.
  guidance?: GuidanceConfig;
  redirect?: RedirectConfig;
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
  offendingPart?: string; // for compound commands: the sub-command that triggered
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
  normalised?: string; // only for Bash when normalisation changed the command
}
