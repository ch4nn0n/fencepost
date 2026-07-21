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

// Vuln 2: quoting a redirect target must not defeat path containment.
describe("quoted redirect target cannot bypass containment", () => {
  const c = cfg({
    redirects: [{ mode: "write", outside: ["/tmp/claude", "."], decision: "deny" }],
    allow: ["echo"],
  });

  it("denies write to a quoted absolute path outside the sandbox", async () => {
    expect((await evaluateBashAst('echo pwned > "/etc/passwd"', c, CWD)).decision).toBe("deny");
  });

  it("still denies the unquoted form", async () => {
    expect((await evaluateBashAst("echo pwned > /etc/passwd", c, CWD)).decision).toBe("deny");
  });
});

// Vuln 3: shell wrappers must not smuggle inner commands past the rule set.
describe("shell wrappers are analysed", () => {
  const c = cfg({ deny: ["git clean -xfd"], allow: ["bash", "sh", "eval"] });

  it("denies git clean wrapped in bash -c", async () => {
    expect((await evaluateBashAst('bash -c "git clean -xfd"', c, CWD)).decision).toBe("deny");
  });

  it("denies git clean wrapped in sh -c", async () => {
    expect((await evaluateBashAst('sh -c "git clean -xfd"', c, CWD)).decision).toBe("deny");
  });

  it("denies git clean wrapped in eval", async () => {
    expect((await evaluateBashAst('eval "git clean -xfd"', c, CWD)).decision).toBe("deny");
  });

  it("fails closed on absurdly deep shell nesting", async () => {
    let cmd = "git clean -xfd";
    for (let i = 0; i < 10; i++) cmd = `bash -c ${JSON.stringify(cmd)}`;
    const r = await evaluateBashAst(cmd, cfg({ deny: ["git clean -xfd"] }, { onError: "deny" }), CWD);
    expect(r.decision).toBe("deny");
  });
});

// Vuln 4: xargs execs its argv; the wrapped command must face the full rule
// set, and flag parsing must never misplace where that command starts.
describe("xargs is unwrapped", () => {
  const c = cfg({ deny: ["rm", "git clean -xfd"], allow: ["xargs", "grep", "echo", "sh"] });

  it("allows xargs grep when grep is allowed", async () => {
    const r = await evaluateBashAst('grep -rl kind . | xargs grep -l "^kind: ClusterSecretStore"', c, CWD);
    expect(r.decision).toBe("allow");
  });

  it("denies xargs rm when rm is denied", async () => {
    expect((await evaluateBashAst("echo /tmp/x | xargs rm -rf", c, CWD)).decision).toBe("deny");
  });

  it("skips xargs flags, separate and attached, to find the command", async () => {
    expect((await evaluateBashAst("xargs -0 -n 1 -I {} grep foo {}", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("xargs -0n1 -I{} grep foo {}", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("xargs --max-args=1 --null grep foo", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("xargs -- grep foo", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("xargs -0 -- rm -rf /x", c, CWD)).decision).toBe("deny");
  });

  it("does not mistake a flag value for the command", async () => {
    // -E consumes "grep": the command xargs runs is rm, not grep.
    expect((await evaluateBashAst("xargs -E grep rm -rf /x", c, CWD)).decision).toBe("deny");
  });

  it("falls back to onError on unrecognised flags", async () => {
    // BSD-only -J: we cannot tell whether it consumes the next token.
    expect((await evaluateBashAst("xargs -J % grep foo", c, CWD)).decision).toBe("ask");
    const r = await evaluateBashAst("xargs -J % grep foo", cfg({ allow: ["xargs", "grep"] }, { onError: "deny" }), CWD);
    expect(r.decision).toBe("deny");
  });

  it("unwraps a shell wrapper handed to xargs without losing the -c payload", async () => {
    expect((await evaluateBashAst('xargs sh -c "git clean -xfd"', c, CWD)).decision).toBe("deny");
  });

  it("allows bare xargs (implicit echo) on the xargs rule alone", async () => {
    expect((await evaluateBashAst("echo hi | xargs", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("echo hi | xargs -n", c, CWD)).decision).toBe("allow");
  });

  it("fails closed on absurdly deep xargs nesting", async () => {
    const cmd = "xargs ".repeat(10) + "grep foo";
    const r = await evaluateBashAst(cmd, cfg({ allow: ["xargs", "grep"] }, { onError: "deny" }), CWD);
    expect(r.decision).toBe("deny");
  });
});

// Vuln 5: timeout execs its argv past DURATION; the wrapped command must
// face the full rule set, same as xargs.
describe("timeout is unwrapped", () => {
  const c = cfg({ deny: ["rm", "git clean -xfd"], allow: ["timeout", "grep", "echo"] });

  it("allows timeout grep when grep is allowed", async () => {
    expect((await evaluateBashAst("timeout 5 grep foo file", c, CWD)).decision).toBe("allow");
  });

  it("denies timeout rm when rm is denied", async () => {
    expect((await evaluateBashAst("timeout 10 rm -rf /x", c, CWD)).decision).toBe("deny");
  });

  it("skips recognised flags, separate and bundled, to find DURATION and the command", async () => {
    expect((await evaluateBashAst("timeout -k 5 10 grep foo", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("timeout -v -s TERM 10 grep foo", c, CWD)).decision).toBe("allow");
    expect((await evaluateBashAst("timeout --kill-after=5 --preserve-status 10 grep foo", c, CWD)).decision).toBe(
      "allow",
    );
    expect((await evaluateBashAst("timeout --kill-after=5 10 rm -rf /x", c, CWD)).decision).toBe("deny");
  });

  it("falls back to onError on unrecognised flags", async () => {
    expect((await evaluateBashAst("timeout --foo 10 grep foo", c, CWD)).decision).toBe("ask");
    const r = await evaluateBashAst(
      "timeout --foo 10 grep foo",
      cfg({ allow: ["timeout", "grep"] }, { onError: "deny" }),
      CWD,
    );
    expect(r.decision).toBe("deny");
  });

  it("unwraps a shell wrapper handed to timeout without losing the -c payload", async () => {
    expect((await evaluateBashAst('timeout 5 sh -c "git clean -xfd"', cfg({ deny: ["git clean -xfd"], allow: ["timeout", "sh"] }), CWD)).decision).toBe(
      "deny",
    );
  });

  it("fails closed on absurdly deep timeout nesting", async () => {
    const cmd = "timeout 5 ".repeat(10) + "grep foo";
    const r = await evaluateBashAst(cmd, cfg({ allow: ["timeout", "grep"] }, { onError: "deny" }), CWD);
    expect(r.decision).toBe("deny");
  });
});
