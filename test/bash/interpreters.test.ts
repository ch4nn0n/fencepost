import { describe, expect, it } from "bun:test";
import { evaluateBashAst } from "../../src/bash/evaluate-ast.js";
import type { FencepostConfig, InterpreterConfig } from "../../src/types.js";

const CWD = "/home/me/proj";

function cfg(interpreters: Record<string, InterpreterConfig>): FencepostConfig {
  return {
    default: "allow", // so only the interpreter rules drive the decision
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: { normalise: [], deny: [], checks: [], ask: [], allow: ["python3", "node"], interpreters },
    },
  };
}

const python: Record<string, InterpreterConfig> = {
  python: {
    names: ["python", "python3"],
    calls: [
      { match: "shutil.rmtree", pathArgsOutside: ["/tmp/claude", "."], decision: "deny", description: "rmtree outside" },
      { match: "subprocess.*", decision: "ask", description: "spawns a process" },
      { match: "eval|exec", decision: "ask", description: "dynamic exec" },
    ],
    writes: { outside: ["/tmp/claude", "."], decision: "deny", description: "writes outside" },
  },
};

describe("nested python analysis", () => {
  it("denies shutil.rmtree on a path outside the sandbox", async () => {
    const r = await evaluateBashAst('python3 -c "import shutil; shutil.rmtree(\'/data\')"', cfg(python), CWD);
    expect(r.decision).toBe("deny");
  });

  it("allows shutil.rmtree confined to the sandbox", async () => {
    const r = await evaluateBashAst('python3 -c "import shutil; shutil.rmtree(\'/tmp/claude/x\')"', cfg(python), CWD);
    expect(r.decision).toBe("allow"); // python3 allow-listed, rule's pathArgsOutside not satisfied
  });

  it("asks before subprocess", async () => {
    const r = await evaluateBashAst('python3 -c "import subprocess; subprocess.run([\'ls\'])"', cfg(python), CWD);
    expect(r.decision).toBe("ask");
  });

  it("denies open() writing outside the sandbox", async () => {
    const r = await evaluateBashAst("python3 -c \"open('/etc/x','w').write('z')\"", cfg(python), CWD);
    expect(r.decision).toBe("deny");
  });

  it("ignores a non-interpreter command with -c", async () => {
    // grep -c is a count flag, not code; must not be parsed as python
    const r = await evaluateBashAst('grep -c "shutil.rmtree" file', cfg(python), CWD);
    expect(r.decision).toBe("allow"); // default allow; no python rule fires
  });
});
