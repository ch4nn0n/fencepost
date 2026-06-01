import { describe, expect, it } from "bun:test";
import { evaluate } from "../src/evaluate.js";
import type { HookInput, FencepostConfig } from "../src/types.js";

function makeConfig(discourageChaining: boolean): FencepostConfig {
  return {
    default: "allow",
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: {
        normalise: [],
        deny: [],
        checks: [],
        ask: ["git push"],
        allow: ["ls", "echo", "cat", "grep"],
        discourageChaining,
      },
    },
  };
}

function bash(command: string): HookInput {
  return {
    session_id: "s",
    cwd: "/tmp",
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
    tool_use_id: "t",
  };
}

describe("discourageChaining", () => {
  it("converts a sequenced ask into a deny with chained flag", () => {
    const r = evaluate(bash("ls && git push origin main"), makeConfig(true));
    expect(r.decision).toBe("deny");
    expect(r.chained).toBe(true);
  });

  it("leaves a single ask command as ask", () => {
    const r = evaluate(bash("git push origin main"), makeConfig(true));
    expect(r.decision).toBe("ask");
    expect(r.chained).toBeUndefined();
  });

  it("does not convert pipes (data flow, not sequencing)", () => {
    // `git push` is ask; piping it keeps it as ask, not a chained deny.
    const r = evaluate(bash("git push | cat"), makeConfig(true));
    expect(r.decision).toBe("ask");
    expect(r.chained).toBeUndefined();
  });

  it("does not touch all-allow chains", () => {
    const r = evaluate(bash("ls && echo done"), makeConfig(true));
    expect(r.decision).toBe("allow");
  });

  it("is a no-op when disabled (ask stays ask)", () => {
    const r = evaluate(bash("ls && git push origin main"), makeConfig(false));
    expect(r.decision).toBe("ask");
    expect(r.chained).toBeUndefined();
  });

  it("still denies outright when a part is denied regardless of chaining", () => {
    const cfg = makeConfig(true);
    cfg.tools.bash.deny = ["rm -rf"];
    const r = evaluate(bash("ls && rm -rf /etc"), cfg);
    expect(r.decision).toBe("deny");
    expect(r.chained).toBeUndefined(); // denied by rule, not by the chaining policy
  });

  describe("loops (control flow)", () => {
    it("does not chain-deny a benign loop; evaluates its body", () => {
      // body is `echo $f` which is allowed -> whole loop allowed (not a chained deny)
      const r = evaluate(bash("for f in a b; do echo $f; done"), makeConfig(true));
      expect(r.decision).toBe("allow");
      expect(r.chained).toBeUndefined();
    });

    it("denies a loop whose body is denied", () => {
      const cfg = makeConfig(true);
      cfg.tools.bash.deny = ["rm -rf"];
      const r = evaluate(bash("for f in *.txt; do rm -rf /data/$f; done"), cfg);
      expect(r.decision).toBe("deny");
      expect(r.chained).toBeUndefined(); // denied by the rm rule, not the chaining policy
    });

    it("asks for a loop whose body needs approval (no misleading chain deny)", () => {
      const r = evaluate(bash("for f in a b; do git push $f; done"), makeConfig(true));
      expect(r.decision).toBe("ask");
      expect(r.chained).toBeUndefined();
    });
  });
});
