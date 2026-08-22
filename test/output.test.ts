import { describe, expect, it } from "bun:test";
import { formatOutput } from "../src/output.js";
import type { EvalResult } from "../src/types.js";

const deny: EvalResult = { decision: "deny", reason: "Force-push is dangerous", alternative: "use --force-with-lease" };

describe("formatOutput manual-run offer (feature 23)", () => {
  it("includes the verbatim command and the ! hint on deny when provided", () => {
    const out = formatOutput(deny, undefined, "git push --force origin main");
    const ctx = out?.hookSpecificOutput.additionalContext ?? "";
    expect(ctx).toContain("git push --force origin main");
    expect(ctx).toContain("'!'");
    expect(ctx).toContain("copyable code block");
  });

  it("keeps the alternative guidance alongside the manual-run offer", () => {
    const out = formatOutput(deny, undefined, "git push --force origin main");
    const ctx = out?.hookSpecificOutput.additionalContext ?? "";
    expect(ctx).toContain("alternative");
    // alternative guidance comes before the manual-run escape hatch
    expect(ctx.indexOf("alternative")).toBeLessThan(ctx.indexOf("run it themselves"));
  });

  it("omits the offer when no command is provided", () => {
    const out = formatOutput(deny);
    expect(out?.hookSpecificOutput.additionalContext ?? "").not.toContain("prefixed with");
  });

  it("truncates a long matched command in the ask reason", () => {
    const long = `node -e '\n  const x = 1;\n  ${"a".repeat(200)}\n'`;
    const out = formatOutput({ decision: "ask", reason: "approve?", matchedInput: long });
    const reason = out.hookSpecificOutput.permissionDecisionReason ?? "";
    expect(reason.length).toBeLessThan(150);
    expect(reason).toContain("…");
    expect(reason).toContain("Fencepost:\n- ");
  });

  it("keeps a short matched sub-command intact in the ask reason", () => {
    const out = formatOutput({ decision: "ask", reason: "approve?", matchedInput: "rm y" });
    expect(out.hookSpecificOutput.permissionDecisionReason).toBe("Fencepost:\n- rm y");
  });

  it("lists multiple matched parts as bullet lines in the ask reason", () => {
    const out = formatOutput({
      decision: "ask",
      reason: "approve?",
      matchedInput: "cat y",
      matchedInputs: ["cat y", "rm z"],
    });
    expect(out.hookSpecificOutput.permissionDecisionReason).toBe("Fencepost:\n- cat y\n- rm z");
  });

  it("does not add a manual-run offer to allow/ask", () => {
    const allow = formatOutput({ decision: "allow", reason: "ok" });
    expect(allow.hookSpecificOutput.permissionDecision).toBe("allow");
    expect(allow.hookSpecificOutput.additionalContext).toBeUndefined();
    const ask = formatOutput({ decision: "ask", reason: "approve?" }, undefined, "rm -rf x");
    expect(ask?.hookSpecificOutput.additionalContext).toBeUndefined();
  });

  it("adds exactly one full stop before the alternative", () => {
    const ended = formatOutput({ ...deny, reason: "Force-push is dangerous." });
    expect(ended.hookSpecificOutput.permissionDecisionReason).toContain("dangerous. Use this instead:");
    expect(formatOutput(deny).hookSpecificOutput.permissionDecisionReason).toContain("dangerous. Use this instead:");
  });
});
