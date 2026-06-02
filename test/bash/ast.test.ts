import { describe, expect, it } from "bun:test";
import { extractBash, isWriteOutsideSandbox } from "../../src/bash/ast.js";
import { evaluateBashViaAst } from "../../src/bash/evaluate-ast.js";
import type { FencepostConfig } from "../../src/types.js";

describe("extractBash", () => {
  it("extracts loop body commands without scaffolding", async () => {
    const r = await extractBash("for f in *.txt; do rm -rf /data/$f; done");
    expect(r.ok).toBe(true);
    expect(r.commands).toContain("rm -rf /data/$f");
    expect(r.hadControlFlow).toBe(true);
  });

  it("extracts redirections", async () => {
    const r = await extractBash("echo hi > /etc/passwd");
    expect(r.redirects).toEqual([{ op: ">", target: "/etc/passwd" }]);
  });

  it("surfaces command-substitution contents (closes the opaque-subshell hole)", async () => {
    const r = await extractBash("x=$(cat /etc/shadow); echo $x");
    expect(r.commands).toContain("cat /etc/shadow");
  });

  it("extracts every stage of a pipeline and chain", async () => {
    const r = await extractBash("ls && rm -rf /tmp/x | grep foo");
    expect(r.commands).toEqual(["ls", "rm -rf /tmp/x", "grep foo"]);
  });

  it("distinguishes sequencing from a pipe", async () => {
    expect((await extractBash("a && b")).hadSequencing).toBe(true);
    expect((await extractBash("a | b")).hadSequencing).toBe(false);
  });
});

describe("isWriteOutsideSandbox", () => {
  it("flags absolute writes outside the sandbox", () => {
    expect(isWriteOutsideSandbox({ op: ">", target: "/etc/x" }, "/tmp/claude")).toBe(true);
    expect(isWriteOutsideSandbox({ op: ">>", target: "/var/log/x" }, "/tmp/claude")).toBe(true);
  });

  it("allows writes inside the sandbox and to /dev", () => {
    expect(isWriteOutsideSandbox({ op: ">", target: "/tmp/claude/x" }, "/tmp/claude")).toBe(false);
    expect(isWriteOutsideSandbox({ op: ">", target: "/dev/null" }, "/tmp/claude")).toBe(false);
  });

  it("ignores reads and relative targets", () => {
    expect(isWriteOutsideSandbox({ op: "<", target: "/etc/x" }, "/tmp/claude")).toBe(false);
    expect(isWriteOutsideSandbox({ op: ">", target: "out.txt" }, "/tmp/claude")).toBe(false);
  });
});

describe("evaluateBashViaAst", () => {
  const cfg: FencepostConfig = {
    default: "ask",
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: {
        normalise: [],
        deny: [],
        checks: [],
        ask: [],
        allow: ["echo", "ls"],
        denyWritesOutsideSandbox: true,
      },
    },
    redirect: { tmp: false, tmpTarget: "/tmp/claude" },
  };

  it("denies a write outside the sandbox via the redirection rule", async () => {
    const r = await evaluateBashViaAst("echo hi > /etc/passwd", cfg);
    expect(r?.decision).toBe("deny");
    expect(r?.matchedRule).toContain("denyWritesOutsideSandbox");
  });

  it("allows a write inside the sandbox", async () => {
    const r = await evaluateBashViaAst("echo hi > /tmp/claude/out", cfg);
    expect(r?.decision).toBe("allow");
  });

  it("evaluates a loop body through the normal matcher", async () => {
    const r = await evaluateBashViaAst("for f in a b; do echo $f; done", cfg);
    expect(r?.decision).toBe("allow");
  });
});
