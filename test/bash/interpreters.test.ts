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

describe("nested allow rules (common safe tools)", () => {
  // default ask, nothing allow-listed: only the interpreter rules can allow
  const askByDefault = (interpreters: Record<string, InterpreterConfig>): FencepostConfig => ({
    default: "ask",
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: { normalise: [], deny: [], checks: [], ask: [], allow: [], interpreters },
    },
  });

  const c = askByDefault({
    python: {
      names: ["python", "python3"],
      calls: [
        { match: "subprocess.*", decision: "ask", description: "spawns a process" },
        { match: "pickle.load|pickle.loads", decision: "ask", description: "unsafe deserialization" },
        { match: "*Path(*).unlink|*Path(*).write_text", decision: "ask", description: "pathlib mutation" },
        { match: "json.*|re.*", decision: "allow", description: "common safe tools" },
      ],
      writes: { outside: ["/tmp/claude", "."], decision: "deny", description: "writes outside" },
    },
  });

  it("allows inline python that only uses safe tools", async () => {
    const r = await evaluateBashAst("python3 -c \"import json; print(json.dumps({'a': 1}))\"", c, CWD);
    expect(r.decision).toBe("allow");
  });

  it("still asks when a safe call sits next to a flagged one", async () => {
    const r = await evaluateBashAst(
      "python3 -c \"import json, subprocess; json.dumps({}); subprocess.run(['ls'])\"",
      c,
      CWD,
    );
    expect(r.decision).toBe("ask");
  });

  it("still denies when a safe call sits next to a write outside the sandbox", async () => {
    const r = await evaluateBashAst("python3 -c \"import json; json.dumps({}); open('/etc/x','w').write('z')\"", c, CWD);
    expect(r.decision).toBe("deny");
  });

  it("asks on pathlib mutations regardless of receiver spelling", async () => {
    expect((await evaluateBashAst("python3 -c \"from pathlib import Path; Path('/etc/x').unlink()\"", c, CWD)).decision).toBe("ask");
    expect(
      (await evaluateBashAst("python3 -c \"import pathlib; pathlib.Path('/etc/x').write_text('z')\"", c, CWD)).decision,
    ).toBe("ask");
  });

  it("asks on unsafe deserialization", async () => {
    const r = await evaluateBashAst("python3 -c \"import pickle; pickle.loads(blob)\"", c, CWD);
    expect(r.decision).toBe("ask");
  });
});
