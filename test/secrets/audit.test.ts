import { describe, expect, it } from "bun:test";
import { buildAuditEntry } from "../../src/audit/logger.js";

// Assembled from fragments so the contiguous token literal never lands in a
// committed file (it would trip GitHub push protection and secret scanners).
const FAKE_SECRET = "ghp_" + "wWPw5k4aXcaT4fNP0UcnZwJUVFk6LO0pINUx";

describe("audit entries for secrets matches", () => {
  it("a secrets-denied Write logs the path but never the content", () => {
    const entry = buildAuditEntry({
      sessionId: "s1",
      toolUseId: "t1",
      toolName: "Write",
      toolInput: { file_path: "/tmp/claude/x.ts", content: `token="${FAKE_SECRET}"` },
      result: {
        decision: "deny",
        reason: "The Write input contains what looks like a secret (gitleaks:github-pat).",
        matchedRule: "secrets.gitleaks:github-pat",
      },
      cwd: "/tmp/claude/proj",
    });
    expect(entry.input).toContain("/tmp/claude/x.ts");
    expect(JSON.stringify(entry)).not.toContain(FAKE_SECRET);
  });

  it("a secrets-denied Bash command logs neither the command nor its normalisation", () => {
    const entry = buildAuditEntry({
      sessionId: "s1",
      toolUseId: "t1",
      toolName: "Bash",
      toolInput: { command: `export TOKEN=${FAKE_SECRET}` },
      result: {
        decision: "deny",
        reason: "secret",
        matchedRule: "secrets.gitleaks:github-pat",
      },
      normalisedCommand: `export TOKEN=${FAKE_SECRET}`,
      cwd: "/tmp/claude/proj",
    });
    expect(JSON.stringify(entry)).not.toContain(FAKE_SECRET);
  });

  it("non-secrets entries keep the existing input summary behaviour", () => {
    const entry = buildAuditEntry({
      sessionId: "s1",
      toolUseId: "t1",
      toolName: "Bash",
      toolInput: { command: "git status" },
      result: { decision: "allow", reason: "", matchedRule: "bash.allow: git status" },
      cwd: "/tmp/claude/proj",
    });
    expect(entry.input).toBe("git status");
  });
});
