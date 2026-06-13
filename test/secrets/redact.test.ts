import { describe, expect, it } from "bun:test";
import { redactFindings } from "../../src/secrets/redact.js";
import type { SecretFinding } from "../../src/secrets/scanner.js";

const gh = (secret: string): SecretFinding => ({
  scanner: "gitleaks",
  ruleId: "github-pat",
  line: 1,
  secret,
});

describe("redactFindings", () => {
  it("replaces a single secret span", () => {
    const r = redactFindings("token = ghp_abc123 # mine", [gh("ghp_abc123")]);
    expect(r.text).toBe("token = [FENCEPOST:REDACTED gitleaks:github-pat] # mine");
    expect(r.redactions).toEqual([{ scanner: "gitleaks", ruleId: "github-pat", count: 1 }]);
  });

  it("replaces every occurrence of the same secret", () => {
    const r = redactFindings("a=ghp_x1y2z3 b=ghp_x1y2z3", [gh("ghp_x1y2z3")]);
    expect(r.text).toBe(
      "a=[FENCEPOST:REDACTED gitleaks:github-pat] b=[FENCEPOST:REDACTED gitleaks:github-pat]",
    );
    expect(r.redactions[0]?.count).toBe(2);
  });

  it("merges overlapping spans and combines labels", () => {
    const findings: SecretFinding[] = [
      { scanner: "gitleaks", ruleId: "rule-a", line: 1, secret: "abcdef" },
      { scanner: "gitleaks", ruleId: "rule-b", line: 1, secret: "cdefgh" },
    ];
    const r = redactFindings("xx abcdefgh yy", findings);
    expect(r.text).toBe("xx [FENCEPOST:REDACTED gitleaks:rule-a,gitleaks:rule-b] yy");
    expect(r.redactions).toHaveLength(2);
  });

  it("redacts multi-line secrets across line boundaries", () => {
    const key = "-----BEGIN KEY-----\nabc\n-----END KEY-----";
    const r = redactFindings(`before\n${key}\nafter`, [
      { scanner: "gitleaks", ruleId: "private-key", line: 2, secret: key },
    ]);
    expect(r.text).toBe("before\n[FENCEPOST:REDACTED gitleaks:private-key]\nafter");
  });

  it("replaces the whole line for line-only findings", () => {
    const text = "clean line\npassword = supersecret\nanother";
    const r = redactFindings(text, [
      { scanner: "detect-secrets", ruleId: "Keyword", line: 2 },
    ]);
    expect(r.text).toBe(
      "clean line\n[FENCEPOST:REDACTED detect-secrets:Keyword] (full line)\nanother",
    );
  });

  it("preserves a Read-style line-number prefix on line redaction", () => {
    const text = "     1→clean\n     2→password = supersecret";
    const r = redactFindings(text, [
      { scanner: "detect-secrets", ruleId: "Keyword", line: 2 },
    ]);
    expect(r.text).toBe(
      "     1→clean\n     2→[FENCEPOST:REDACTED detect-secrets:Keyword] (full line)",
    );
  });

  it("preserves a Grep-style path:line: prefix on line redaction", () => {
    const text = "src/a.ts:12:const t = 'supersecret'";
    const r = redactFindings(text, [
      { scanner: "detect-secrets", ruleId: "Keyword", line: 1 },
    ]);
    expect(r.text).toBe("src/a.ts:12:[FENCEPOST:REDACTED detect-secrets:Keyword] (full line)");
  });

  it("ignores line-only findings outside the text", () => {
    const r = redactFindings("only one line", [
      { scanner: "detect-secrets", ruleId: "Keyword", line: 9 },
    ]);
    expect(r.text).toBe("only one line");
    expect(r.redactions).toHaveLength(0);
  });

  it("returns the text unchanged with no findings", () => {
    const r = redactFindings("nothing here", []);
    expect(r.text).toBe("nothing here");
    expect(r.redactions).toHaveLength(0);
  });
});
