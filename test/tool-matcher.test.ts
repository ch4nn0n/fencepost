import { describe, expect, it } from "bun:test";
import { matchTool } from "../src/tool-matcher.js";
import type { FencepostConfig } from "../src/types.js";

const config: FencepostConfig = {
  default: "ask",
  tools: {
    deny: [{ tool: "mcp__dangerous_*", description: "Blocked", alternative: "Use safe tool" }],
    ask: ["mcp__plugin_slack_*"],
    allow: ["Read", "Glob", "Grep", "WebSearch"],
    bash: { normalise: [], deny: [], checks: [], ask: [], allow: [] },
  },
};

describe("matchTool", () => {
  it("allows explicitly allowed tools", () => {
    expect(matchTool("Read", config).decision).toBe("allow");
    expect(matchTool("Glob", config).decision).toBe("allow");
  });

  it("asks for explicitly ask-listed tools", () => {
    expect(matchTool("mcp__plugin_slack__send", config).decision).toBe("ask");
  });

  it("denies explicitly denied tools with reason", () => {
    const r = matchTool("mcp__dangerous_delete", config);
    expect(r.decision).toBe("deny");
    expect(r.reason).toBe("Blocked");
    expect(r.alternative).toBe("Use safe tool");
  });

  it("deny takes precedence over ask", () => {
    const cfg: FencepostConfig = {
      ...config,
      tools: { ...config.tools, ask: ["mcp__dangerous_*"] },
    };
    expect(matchTool("mcp__dangerous_delete", cfg).decision).toBe("deny");
  });

  it("falls through to default for unmatched tools", () => {
    expect(matchTool("Write", config).decision).toBe("ask"); // default
  });
});
