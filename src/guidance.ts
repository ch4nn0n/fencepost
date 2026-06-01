import type { FencepostConfig } from "./types.js";

/**
 * Built-in guidance lines injected at session start. These steer Claude toward
 * behaviours that work well with a permission-gated environment.
 */
export function defaultGuidance(config: FencepostConfig): string[] {
  const target = config.redirect?.tmpTarget ?? "/tmp/claude";
  const tmpRedirected = config.redirect?.tmp === true;

  const lines = [
    "This project is protected by fencepost, a permission checker. Some tool calls and shell commands are denied or require approval.",
    "If a command is denied with a suggested alternative, use the alternative. Do not retry the same command or try to work around the rule.",
    "If a tool or command fails because it needs authentication (a login, credentials, or an expired token), stop and ask the user to authenticate rather than retrying or attempting a workaround.",
    tmpRedirected
      ? `Write scratch and temporary files under ${target}. Paths under /tmp are automatically redirected there, and that directory is safe to clean up.`
      : `Write scratch and temporary files under ${target} rather than directly in /tmp, so they stay isolated and easy to clean up.`,
    "Prefer running shell commands one at a time over chaining them with && or ; so each can be reviewed independently.",
    "Avoid destructive operations (recursive deletes, force pushes, bulk deletes) unless the user has explicitly asked for them.",
  ];
  return lines;
}

/**
 * Build the SessionStart additionalContext string from config, or null if
 * guidance is disabled or empty.
 */
export function buildGuidance(config: FencepostConfig): string | null {
  const guidance = config.guidance;
  // Default to enabled when the section is absent.
  const enabled = guidance?.enabled ?? true;
  if (!enabled) return null;

  const includeDefaults = guidance?.includeDefaults ?? true;
  const lines: string[] = [];
  if (includeDefaults) lines.push(...defaultGuidance(config));
  if (guidance?.extra?.length) lines.push(...guidance.extra);

  if (lines.length === 0) return null;

  const header = "Fencepost guidance for this session:";
  return [header, ...lines.map((l) => `- ${l}`)].join("\n");
}
