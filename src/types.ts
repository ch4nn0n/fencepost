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
  ask: string[];
  allow: string[];
}

export interface ToolsConfig {
  deny: ToolDenyRule[];
  ask: string[];
  allow: string[];
  bash: BashConfig;
}

export interface FencepostConfig {
  default: Decision;
  tools: ToolsConfig;
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
