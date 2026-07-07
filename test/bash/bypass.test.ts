import { describe, expect, it } from "bun:test";
import { evaluateBashAst } from "../../src/bash/evaluate-ast.js";
import type { BashConfig, FencepostConfig } from "../../src/types.js";

const CWD = "/home/me/proj";

function cfg(bash: Partial<BashConfig>, extra: Partial<FencepostConfig> = {}): FencepostConfig {
  return {
    default: "ask",
    ...extra,
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: { normalise: [], deny: [], checks: [], ask: [], allow: [], ...bash },
    },
  };
}

// Vuln 1: quoting/escaping the command name (or any keyword token) must not
// evade prefix, regex, or argument rules.
describe("quoted/escaped command name cannot bypass rules", () => {
  const c = cfg({
    deny: ["git clean -xfd"],
    checks: [
      {
        test: "git\\s+push\\b.*\\s(--force(?!-with-lease)|-f)\\b",
        description: "force push",
      },
    ],
    arguments: [{ command: "rm", anyArgOutside: ["/tmp/claude", "."], decision: "deny" }],
    interpreters: {
      python: {
        names: ["python", "python3"],
        imports: [{ match: "os", decision: "deny" }],
      },
    },
  });

  it("denies quoted command name (prefix rule)", async () => {
    expect((await evaluateBashAst('"git" clean -xfd', c, CWD)).decision).toBe("deny");
  });

  it("denies backslash-escaped command name (prefix rule)", async () => {
    expect((await evaluateBashAst("\\git clean -xfd", c, CWD)).decision).toBe("deny");
  });

  it("denies quoted keyword token (prefix rule)", async () => {
    expect((await evaluateBashAst('git "clean" -xfd', c, CWD)).decision).toBe("deny");
  });

  it("denies quoted subcommand (regex check)", async () => {
    expect((await evaluateBashAst('git "push" --force origin', c, CWD)).decision).toBe("deny");
    expect((await evaluateBashAst('"git" push --force origin', c, CWD)).decision).toBe("deny");
  });

  it("denies quoted name for argument rules", async () => {
    expect((await evaluateBashAst('"rm" -rf /etc/x', c, CWD)).decision).toBe("deny");
  });

  it("denies quoted interpreter name (nested analysis)", async () => {
    expect((await evaluateBashAst('"python3" -c "import os"', c, CWD)).decision).toBe("deny");
  });
});
