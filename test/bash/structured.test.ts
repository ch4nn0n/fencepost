import { describe, expect, it } from "bun:test";
import { evaluateBashAst } from "../../src/bash/evaluate-ast.js";
import type { BashConfig, FencepostConfig } from "../../src/types.js";

const CWD = "/home/me/proj";

function cfg(bash: Partial<BashConfig>): FencepostConfig {
  return {
    default: "ask",
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: { normalise: [], deny: [], checks: [], ask: [], allow: [], ...bash },
    },
  };
}

describe("argument rules", () => {
  const c = cfg({
    arguments: [
      { command: "rm", allArgsInside: ["/tmp/claude"], decision: "allow" },
      { command: "rm", anyArgOutside: ["/tmp/claude", "."], decision: "deny", description: "outside sandbox" },
    ],
  });

  it("allows rm when every path arg is inside the sandbox", async () => {
    expect((await evaluateBashAst("rm -rf /tmp/claude/x", c, CWD)).decision).toBe("allow");
  });

  it("denies rm when any path arg is outside (multi-target safe)", async () => {
    const r = await evaluateBashAst("rm -rf /tmp/claude/x /etc", c, CWD);
    expect(r.decision).toBe("deny"); // /etc escapes -> the allow rule does not apply
  });

  it("denies rm targeting an outside path", async () => {
    expect((await evaluateBashAst("rm -rf /etc/x", c, CWD)).decision).toBe("deny");
  });
});

describe("redirect rules", () => {
  const c = cfg({
    redirects: [
      { mode: "write", outside: ["/tmp/claude", "."], decision: "deny", description: "outside write" },
    ],
    allow: ["echo"],
  });

  it("denies a write outside the sandbox (invisible to the string model)", async () => {
    expect((await evaluateBashAst("echo hi > /etc/passwd", c, CWD)).decision).toBe("deny");
  });

  it("allows a write inside the sandbox", async () => {
    // echo is allow-listed and the redirect target is inside -> allow
    expect((await evaluateBashAst("echo hi > /tmp/claude/out", c, CWD)).decision).toBe("allow");
  });

  it("ignores reads", async () => {
    expect((await evaluateBashAst("cat < /etc/passwd", cfg({ ...c.tools.bash, allow: ["cat"] }), CWD)).decision).toBe(
      "allow",
    );
  });
});

describe("precedence: deny beats smart-allow", async () => {
  it("a deny argument rule is not overridden by an allow rule", async () => {
    const c = cfg({
      arguments: [
        { command: "rm", allArgsInside: ["/tmp/claude"], decision: "allow" },
        { command: "rm", anyArgMatches: "^--no-preserve-root$", decision: "deny", description: "guard off" },
      ],
    });
    const r = await evaluateBashAst("rm -rf --no-preserve-root /tmp/claude/x", c, CWD);
    expect(r.decision).toBe("deny");
  });
});
