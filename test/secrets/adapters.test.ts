import { describe, expect, it } from "bun:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseGitleaksOutput } from "../../src/secrets/gitleaks.js";
import { parseTrufflehogOutput } from "../../src/secrets/trufflehog.js";
import { parseDetectSecretsOutput } from "../../src/secrets/detect-secrets.js";

// Fixtures captured from the real binaries (gitleaks 8.28, trufflehog 3.91,
// detect-secrets 1.5) scanning test/fixtures/secrets/sample.txt. The fakes
// must look realistic: gitleaks' default config allowlists EXAMPLE-style keys.
const FIXTURES = resolve(import.meta.dir, "..", "fixtures", "secrets");

describe("parseGitleaksOutput", () => {
  it("maps report findings to rule/line/secret", async () => {
    const out = parseGitleaksOutput(await readFile(join(FIXTURES, "gitleaks.json"), "utf8"));
    expect(out.length).toBe(3);
    const pat = out.find((f) => f.ruleId === "github-pat");
    expect(pat).toBeDefined();
    expect(pat?.scanner).toBe("gitleaks");
    expect(pat?.line).toBe(2);
    expect(pat?.secret).toMatch(/^ghp_/);
  });

  it("returns [] for an empty report", () => {
    expect(parseGitleaksOutput("")).toEqual([]);
    expect(parseGitleaksOutput("[]")).toEqual([]);
  });

  it("throws on non-JSON output", () => {
    expect(() => parseGitleaksOutput("not json")).toThrow();
  });
});

describe("parseTrufflehogOutput", () => {
  it("maps NDJSON findings to rule/line/secret", async () => {
    const out = parseTrufflehogOutput(await readFile(join(FIXTURES, "trufflehog.ndjson"), "utf8"));
    expect(out.length).toBe(2);
    const gh = out.find((f) => f.ruleId === "Github");
    expect(gh?.scanner).toBe("trufflehog");
    expect(gh?.line).toBe(2);
    expect(gh?.secret).toMatch(/^ghp_/);
  });

  it("skips interleaved non-JSON log lines", () => {
    const ndjson = 'noise line\n{"DetectorName":"X","Raw":"s3cret","SourceMetadata":{"Data":{"Filesystem":{"line":1}}}}\n';
    const out = parseTrufflehogOutput(ndjson);
    expect(out).toEqual([{ scanner: "trufflehog", ruleId: "X", line: 1, secret: "s3cret" }]);
  });

  it("returns [] for empty output", () => {
    expect(parseTrufflehogOutput("")).toEqual([]);
  });
});

describe("parseDetectSecretsOutput", () => {
  it("maps baseline results to rule/line with no secret text", async () => {
    const out = parseDetectSecretsOutput(
      await readFile(join(FIXTURES, "detect-secrets.json"), "utf8"),
      "sample.txt",
    );
    expect(out.length).toBe(3);
    const aws = out.find((f) => f.ruleId === "AWS Access Key");
    expect(aws?.scanner).toBe("detect-secrets");
    expect(aws?.line).toBe(3);
    expect(aws?.secret).toBeUndefined();
  });

  it("returns [] when the filename key is absent", async () => {
    const out = parseDetectSecretsOutput(
      await readFile(join(FIXTURES, "detect-secrets.json"), "utf8"),
      "other.txt",
    );
    expect(out).toEqual([]);
  });
});
