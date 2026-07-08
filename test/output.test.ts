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

  it("does not add a manual-run offer to allow/ask", () => {
    expect(formatOutput({ decision: "allow", reason: "ok" })).toBeNull();
    const ask = formatOutput({ decision: "ask", reason: "approve?" }, undefined, "rm -rf x");
    expect(ask?.hookSpecificOutput.additionalContext).toBeUndefined();
  });
});
