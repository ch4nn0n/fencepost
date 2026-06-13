import { describe, expect, it } from "bun:test";
import { binaryOnPath } from "../../src/secrets/detect.js";
import { GitleaksScanner } from "../../src/secrets/gitleaks.js";
import { TrufflehogScanner } from "../../src/secrets/trufflehog.js";
import { DetectSecretsScanner } from "../../src/secrets/detect-secrets.js";
import { scanToolOutput } from "../../src/secrets/scan.js";
import type { FencepostConfig } from "../../src/types.js";

// Real-binary round trips. Each block is skipped when the scanner is not on
// PATH, so the suite passes on machines without them. Realistic fakes only:
// gitleaks' default config allowlists EXAMPLE-style strings.
// Assembled from fragments so the contiguous token literal never lands in a
// committed file. The runtime value is still a valid ghp_ token that the real
// gitleaks/trufflehog binaries detect.
const FAKE_PAT = "ghp_" + "wWPw5k4aXcaT4fNP0UcnZwJUVFk6LO0pINUx";
const SAMPLE = `# fixture\ngithub_token = "${FAKE_PAT}"\nplain line\n`;
const TIMEOUT_MS = 30_000;

const config: FencepostConfig = {
  default: "ask",
  tools: { deny: [], ask: [], allow: [], bash: { normalise: [], deny: [], checks: [], ask: [], allow: [] } },
  secrets: {
    enabled: true,
    scanner: "auto",
    scanInputs: true,
    scanOutputs: true,
    inputTools: ["Write", "Edit", "NotebookEdit", "Bash"],
    outputTools: ["Read", "Bash", "Grep", "WebFetch"],
    allow: { paths: [], rules: [] },
    maxScanBytes: 1048576,
    timeoutMs: TIMEOUT_MS,
  },
};

describe.skipIf(!binaryOnPath("gitleaks"))("gitleaks (real binary)", () => {
  it("finds and redacts a fake GitHub PAT end to end", async () => {
    const scanner = new GitleaksScanner();
    const findings = await scanner.scan(SAMPLE, TIMEOUT_MS);
    expect(findings.some((f) => f.ruleId === "github-pat" && f.secret === FAKE_PAT)).toBe(true);

    const r = await scanToolOutput("Read", { type: "text", text: SAMPLE }, config, scanner);
    const updated = r?.updatedToolOutput as { text: string };
    expect(updated.text).not.toContain(FAKE_PAT);
    expect(updated.text).toContain("[FENCEPOST:REDACTED gitleaks:github-pat]");
  }, TIMEOUT_MS);

  it("returns no findings for clean content", async () => {
    const findings = await new GitleaksScanner().scan("nothing secret here\n", TIMEOUT_MS);
    expect(findings).toEqual([]);
  }, TIMEOUT_MS);
});

describe.skipIf(!binaryOnPath("trufflehog"))("trufflehog (real binary)", () => {
  it("finds the fake PAT via a temp file", async () => {
    const findings = await new TrufflehogScanner().scan(SAMPLE, TIMEOUT_MS);
    expect(findings.some((f) => f.ruleId === "Github" && f.secret === FAKE_PAT)).toBe(true);
  }, TIMEOUT_MS);
});

describe.skipIf(!binaryOnPath("detect-secrets"))("detect-secrets (real binary)", () => {
  it("reports the secret's line without raw text", async () => {
    const findings = await new DetectSecretsScanner().scan(SAMPLE, TIMEOUT_MS);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.secret === undefined)).toBe(true);
    expect(findings.some((f) => f.line === 2)).toBe(true);
  }, TIMEOUT_MS);
});
