import { describe, expect, it } from "bun:test";
import { evaluate } from "../src/evaluate.js";
import type { HookInput, FencepostConfig } from "../src/types.js";

const config: FencepostConfig = {
  default: "ask",
  tools: {
    deny: [],
    ask: [],
    allow: ["Read", "Glob"],
    bash: {
      normalise: [],
      deny: ["git branch -D"],
      checks: [
        {
          test: "\\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*\\s+|--recursive)",
          description: "Recursive delete is dangerous",
          alternative: "Delete specific files individually",
        },
      ],
      ask: ["git push"],
      allow: ["ls", "git status"],
    },
  },
};

function makeInput(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return {
    session_id: "test-session",
    cwd: "/tmp",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: "test-tu",
  };
}

describe("evaluate", () => {
  it("allows non-Bash tools in allow list", () => {
    expect(evaluate(makeInput("Read", { file_path: "/foo" }), config).decision).toBe("allow");
  });

  it("routes Bash through bash pipeline", () => {
    const r = evaluate(makeInput("Bash", { command: "git branch -D main" }), config);
    expect(r.decision).toBe("deny");
  });

  it("handles compound commands — most restrictive wins", () => {
    const r = evaluate(makeInput("Bash", { command: "ls && rm -rf /tmp/x" }), config);
    expect(r.decision).toBe("deny");
    expect(r.isCompound).toBe(true);
  });

  it("allows compound when all parts allowed", () => {
    const r = evaluate(makeInput("Bash", { command: "ls && git status" }), config);
    expect(r.decision).toBe("allow");
  });

  it("ask compound when one part is ask", () => {
    const r = evaluate(makeInput("Bash", { command: "ls && git push origin main" }), config);
    expect(r.decision).toBe("ask");
    expect(r.isCompound).toBe(true);
  });

  it("Bash is not routed through tool matcher", () => {
    // Even if Bash were in tools.deny, it goes through bash pipeline
    const cfgWithBashDenied: FencepostConfig = {
      ...config,
      tools: {
        ...config.tools,
        deny: [{ tool: "Bash", description: "No bash" }],
      },
    };
    // ls is in bash.allow — should still be allowed
    const r = evaluate(makeInput("Bash", { command: "ls" }), cfgWithBashDenied);
    expect(r.decision).toBe("allow");
  });
});
