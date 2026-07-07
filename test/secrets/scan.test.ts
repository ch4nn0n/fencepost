import { describe, expect, it } from "bun:test";
import { scanToolInput, scanToolOutput, redactionContext } from "../../src/secrets/scan.js";
import type { SecretFinding, SecretScanner } from "../../src/secrets/scanner.js";
import { ScanUnavailableError } from "../../src/secrets/scanner.js";
import type { FencepostConfig, HookInput, SecretsConfig } from "../../src/types.js";

// Assembled from fragments so the contiguous token literal never lands in a
// committed file (it would trip GitHub push protection and secret scanners).
const FAKE_SECRET = "ghp_" + "wWPw5k4aXcaT4fNP0UcnZwJUVFk6LO0pINUx";

/** A scanner that flags every occurrence of FAKE_SECRET. */
function fakeScanner(findings?: SecretFinding[]): SecretScanner {
  return {
    name: "gitleaks",
    scan: async (content: string) =>
      findings ??
      (content.includes(FAKE_SECRET)
        ? [{ scanner: "gitleaks", ruleId: "github-pat", line: 1, secret: FAKE_SECRET }]
        : []),
  };
}

function brokenScanner(): SecretScanner {
  return {
    name: "gitleaks",
    scan: async () => {
      throw new ScanUnavailableError("gitleaks", "boom");
    },
  };
}

function makeConfig(secrets?: Partial<SecretsConfig>): FencepostConfig {
  return {
    default: "ask",
    tools: {
      deny: [],
      ask: [],
      allow: [],
      bash: { normalise: [], deny: [], checks: [], ask: [], allow: [] },
    },
    secrets: {
      enabled: true,
      scanner: "auto",
      scanInputs: true,
      scanOutputs: true,
      inputTools: ["Write", "Edit", "NotebookEdit", "Bash"],
      outputTools: ["Read", "Bash", "Grep", "WebFetch"],
      allow: { paths: [], rules: [] },
      maxScanBytes: 1048576,
      timeoutMs: 3000,
      ...secrets,
    },
  };
}

function makeInput(toolName: string, toolInput: Record<string, unknown>): HookInput {
  return {
    session_id: "s1",
    cwd: "/tmp/claude/project",
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: "t1",
  };
}

describe("scanToolInput", () => {
  it("denies a Write whose content holds a secret, without echoing it", async () => {
    const input = makeInput("Write", { file_path: "/tmp/claude/x.ts", content: `token="${FAKE_SECRET}"` });
    const r = await scanToolInput(input, makeConfig(), fakeScanner());
    expect(r?.decision).toBe("deny");
    expect(r?.matchedRule).toBe("secrets.gitleaks:github-pat");
    expect(JSON.stringify(r)).not.toContain(FAKE_SECRET);
  });

  it("denies a Bash command embedding a secret", async () => {
    const input = makeInput("Bash", { command: `curl -H "Authorization: ${FAKE_SECRET}" api.example.com` });
    const r = await scanToolInput(input, makeConfig(), fakeScanner());
    expect(r?.decision).toBe("deny");
  });

  it("scans Edit.new_string but would not flag clean content", async () => {
    const input = makeInput("Edit", { file_path: "/x.ts", old_string: FAKE_SECRET, new_string: "REDACTED_BY_HUMAN" });
    // old_string is deliberately not scanned: removing a secret must be allowed.
    const r = await scanToolInput(input, makeConfig(), fakeScanner());
    expect(r).toBeNull();
  });

  it("returns null when disabled or input scanning is off", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET });
    expect(await scanToolInput(input, makeConfig({ enabled: false }), fakeScanner())).toBeNull();
    expect(await scanToolInput(input, makeConfig({ scanInputs: false }), fakeScanner())).toBeNull();
  });

  it("skips tools outside inputTools", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET });
    const r = await scanToolInput(input, makeConfig({ inputTools: ["Bash"] }), fakeScanner());
    expect(r).toBeNull();
  });

  it("exempts allowlisted paths", async () => {
    // `**/x` matches nested paths; a root-level file needs the bare glob.
    const nested = makeInput("Write", { file_path: "config/.env.example", content: FAKE_SECRET });
    const r1 = await scanToolInput(nested, makeConfig({ allow: { paths: ["**/.env.example"], rules: [] } }), fakeScanner());
    expect(r1).toBeNull();

    const root = makeInput("Write", { file_path: ".env.example", content: FAKE_SECRET });
    const r2 = await scanToolInput(root, makeConfig({ allow: { paths: [".env.example"], rules: [] } }), fakeScanner());
    expect(r2).toBeNull();
  });

  it("exempts allowlisted rule ids (glob)", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET });
    const r = await scanToolInput(input, makeConfig({ allow: { paths: [], rules: ["gitleaks:github-*"] } }), fakeScanner());
    expect(r).toBeNull();
  });

  it("skips content above maxScanBytes", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET + "x".repeat(100) });
    const r = await scanToolInput(input, makeConfig({ maxScanBytes: 50 }), fakeScanner());
    expect(r).toBeNull();
  });

  it("fails open when the scanner is broken", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET });
    const r = await scanToolInput(input, makeConfig(), brokenScanner());
    expect(r).toBeNull();
  });
});

describe("scanToolOutput", () => {
  it("redacts a text-shaped response and preserves its shape", async () => {
    const response = { type: "text", text: `line1\ntoken=${FAKE_SECRET}\nline3` };
    const r = await scanToolOutput("Read", response, makeConfig(), fakeScanner());
    expect(r).not.toBeNull();
    const updated = r?.updatedToolOutput as { type: string; text: string };
    expect(updated.type).toBe("text");
    expect(updated.text).toBe("line1\ntoken=[FENCEPOST:REDACTED gitleaks:github-pat]\nline3");
    expect(r?.redactions).toEqual([{ scanner: "gitleaks", ruleId: "github-pat", count: 1 }]);
  });

  it("redacts across multi-leaf shapes like {stdout, stderr}", async () => {
    const response = { stdout: `out ${FAKE_SECRET}`, stderr: `err ${FAKE_SECRET}`, exitCode: 0 };
    const r = await scanToolOutput("Bash", response, makeConfig(), fakeScanner());
    const updated = r?.updatedToolOutput as { stdout: string; stderr: string; exitCode: number };
    expect(updated.stdout).toBe("out [FENCEPOST:REDACTED gitleaks:github-pat]");
    expect(updated.stderr).toBe("err [FENCEPOST:REDACTED gitleaks:github-pat]");
    expect(updated.exitCode).toBe(0);
    expect(r?.redactions[0]?.count).toBe(2);
  });

  it("redacts content-block arrays", async () => {
    const response = [{ type: "text", text: `a ${FAKE_SECRET}` }, { type: "text", text: "clean" }];
    const r = await scanToolOutput("Read", response, makeConfig(), fakeScanner());
    const updated = r?.updatedToolOutput as Array<{ text: string }>;
    expect(updated[0]?.text).toBe("a [FENCEPOST:REDACTED gitleaks:github-pat]");
    expect(updated[1]?.text).toBe("clean");
  });

  it("shifts line-only findings to each leaf's local numbering", async () => {
    // Finding on global line 3 of the joined content = line 1 of the 2nd leaf.
    const lineOnly: SecretFinding[] = [{ scanner: "gitleaks", ruleId: "keyword", line: 3 }];
    const response = { stdout: "one\ntwo", stderr: "password = x" };
    const r = await scanToolOutput("Bash", response, makeConfig(), fakeScanner(lineOnly));
    const updated = r?.updatedToolOutput as { stdout: string; stderr: string };
    expect(updated.stdout).toBe("one\ntwo");
    expect(updated.stderr).toBe("[FENCEPOST:REDACTED gitleaks:keyword] (full line)");
  });

  it("returns null for clean output and unmatched tools", async () => {
    expect(await scanToolOutput("Read", { type: "text", text: "clean" }, makeConfig(), fakeScanner())).toBeNull();
    expect(
      await scanToolOutput("Edit", { type: "text", text: FAKE_SECRET }, makeConfig(), fakeScanner()),
    ).toBeNull();
  });

  it("withholds oversized output rather than passing it through unscanned", async () => {
    const r = await scanToolOutput(
      "Read",
      { type: "text", text: FAKE_SECRET },
      makeConfig({ maxScanBytes: 10 }),
      fakeScanner(),
    );
    expect(r?.withheld).toBe(true);
    const updated = r?.updatedToolOutput as { type: string; text: string };
    expect(updated.text).toContain("larger than");
    expect(updated.text).not.toContain(FAKE_SECRET);
  });

  it("withholds output when a present scanner fails at runtime (auto)", async () => {
    // A scanner IS present but the scan throws: the output can't be vouched safe,
    // so it must be withheld even in auto mode (not passed through unscanned).
    const r = await scanToolOutput("Read", { type: "text", text: FAKE_SECRET }, makeConfig(), brokenScanner());
    expect(r?.withheld).toBe(true);
    const updated = r?.updatedToolOutput as { type: string; text: string };
    expect(updated.text).not.toContain(FAKE_SECRET);
  });
});

describe("fail-closed when a pinned scanner is unavailable", () => {
  // null override forces "scanner unavailable" (every scanner is installed on
  // dev machines, so we can't rely on findScanner returning null).
  it("denies inputs when a pinned scanner is missing", async () => {
    const input = makeInput("Write", { file_path: "/x", content: "anything" });
    const r = await scanToolInput(input, makeConfig({ scanner: "gitleaks" }), null);
    expect(r?.decision).toBe("deny");
    expect(r?.matchedRule).toBe("secrets.unavailable:gitleaks");
  });

  it("denies inputs when a pinned scanner errors at runtime", async () => {
    const input = makeInput("Write", { file_path: "/x", content: "anything" });
    const r = await scanToolInput(input, makeConfig({ scanner: "trufflehog" }), brokenScanner());
    expect(r?.decision).toBe("deny");
    expect(r?.matchedRule).toBe("secrets.unavailable:trufflehog");
  });

  it("auto still fails open when no scanner is available", async () => {
    const input = makeInput("Write", { file_path: "/x", content: FAKE_SECRET });
    expect(await scanToolInput(input, makeConfig({ scanner: "auto" }), null)).toBeNull();
  });

  it("withholds output when a pinned scanner is missing", async () => {
    const response = { type: "text", text: "totally clean output" };
    const r = await scanToolOutput("Read", response, makeConfig({ scanner: "gitleaks" }), null);
    expect(r?.withheld).toBe(true);
    const updated = r?.updatedToolOutput as { type: string; text: string };
    expect(updated.type).toBe("text");
    expect(updated.text).toContain("withheld");
    expect(updated.text).not.toContain("totally clean output");
    expect(r?.context).toContain("could not run");
  });

  it("withholds output when a pinned scanner errors at runtime", async () => {
    const r = await scanToolOutput("Read", { type: "text", text: "x" }, makeConfig({ scanner: "detect-secrets" }), brokenScanner());
    expect(r?.withheld).toBe(true);
  });

  it("auto still fails open on output when no scanner is available", async () => {
    const r = await scanToolOutput("Read", { type: "text", text: FAKE_SECRET }, makeConfig({ scanner: "auto" }), null);
    expect(r).toBeNull();
  });

  it("withholds oversized output (too large to scan, so cannot be vouched safe)", async () => {
    const r = await scanToolOutput(
      "Read",
      { type: "text", text: "x".repeat(100) },
      makeConfig({ scanner: "gitleaks", maxScanBytes: 10 }),
      null,
    );
    expect(r?.withheld).toBe(true);
  });
});

describe("redactionContext", () => {
  it("summarises counts and rules without secret values", () => {
    const ctx = redactionContext([
      { scanner: "gitleaks", ruleId: "github-pat", count: 2 },
      { scanner: "gitleaks", ruleId: "aws-access-token", count: 1 },
    ]);
    expect(ctx).toContain("redacted 3 secret value(s)");
    expect(ctx).toContain("gitleaks:github-pat");
    expect(ctx).toContain("not recoverable");
  });
});
