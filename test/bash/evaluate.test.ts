import { describe, expect, it } from "bun:test";
import { evaluateBash } from "../../src/bash/evaluate.js";
import type { BashConfig } from "../../src/types.js";

const config: BashConfig = {
  normalise: [],
  deny: ["git branch -D", "git branch -d"],
  checks: [
    {
      test: "\\brm\\s+(-[a-zA-Z]*r[a-zA-Z]*\\s+|--recursive)",
      description: "Recursive delete is dangerous",
      alternative: "Delete specific files individually",
    },
  ],
  ask: ["git push"],
  allow: ["ls", "git status", "git log"],
};

describe("evaluateBash", () => {
  it("denies commands matching deny list", () => {
    const r = evaluateBash("git branch -D main", config, "ask");
    expect(r.decision).toBe("deny");
    expect(r.matchedRule).toBe("bash.deny: git branch -D");
  });

  it("deny prefix does not match partial word", () => {
    const r = evaluateBash("git branchless", config, "ask");
    expect(r.decision).toBe("ask"); // falls to default
  });

  it("denies commands matching checks regex with alternative", () => {
    const r = evaluateBash("rm -rf /tmp/build", config, "ask");
    expect(r.decision).toBe("deny");
    expect(r.reason).toBe("Recursive delete is dangerous");
    expect(r.alternative).toBe("Delete specific files individually");
  });

  it("returns ask for commands matching ask list", () => {
    const r = evaluateBash("git push origin main", config, "allow");
    expect(r.decision).toBe("ask");
    expect(r.matchedRule).toBe("bash.ask: git push");
  });

  it("returns allow for commands matching allow list", () => {
    const r = evaluateBash("ls -la", config, "ask");
    expect(r.decision).toBe("allow");
  });

  it("falls through to default when no rule matches", () => {
    const r = evaluateBash("npm test", config, "ask");
    expect(r.decision).toBe("ask");
  });

  it("deny takes precedence over ask", () => {
    const cfg: BashConfig = { ...config, ask: ["git branch"] };
    const r = evaluateBash("git branch -D main", cfg, "allow");
    expect(r.decision).toBe("deny"); // deny tier checked first
  });
});
