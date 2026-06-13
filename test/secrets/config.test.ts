import { beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { compileConfig } from "../../src/config.js";

const PRESETS_DIR = resolve(import.meta.dir, "..", "..", "presets");

beforeAll(() => {
  process.env["FENCEPOST_PRESETS_DIR"] = PRESETS_DIR;
});

async function projectWith(yaml: string): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), "fencepost-secrets-"));
  const claudeDir = join(tmp, ".claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, "fencepost.yaml"), yaml, "utf8");
  return tmp;
}

describe("secrets config", () => {
  it("is disabled by default with full defaults populated", async () => {
    const tmp = await projectWith("default: ask\n");
    const compiled = await compileConfig(tmp);
    expect(compiled.ok).toBe(true);
    expect(compiled.config.secrets?.enabled).toBe(false);
    expect(compiled.config.secrets?.scanner).toBe("auto");
    expect(compiled.config.secrets?.inputTools).toContain("Write");
    expect(compiled.config.secrets?.outputTools).toContain("Read");
    expect(compiled.config.secrets?.maxScanBytes).toBe(1048576);
    expect(compiled.config.secrets?.timeoutMs).toBe(3000);
  });

  it("the secrets preset enables scanning without clobbering defaults", async () => {
    const tmp = await projectWith("import:\n  - secrets\ndefault: ask\n");
    const compiled = await compileConfig(tmp);
    expect(compiled.ok).toBe(true);
    expect(compiled.config.secrets?.enabled).toBe(true);
    expect(compiled.config.secrets?.scanner).toBe("auto");
    expect(compiled.config.secrets?.inputTools).toContain("Bash");
  });

  it("merges field-level: user allowlist adds to the preset without disabling it", async () => {
    const tmp = await projectWith(
      ["import:", "  - secrets", "default: ask", "secrets:", "  allow:", "    paths:", '      - "**/.env.example"', ""].join("\n"),
    );
    const compiled = await compileConfig(tmp);
    expect(compiled.config.secrets?.enabled).toBe(true); // preset value survives
    expect(compiled.config.secrets?.allow?.paths).toContain("**/.env.example");
  });

  it("user scalar overrides win over the preset", async () => {
    const tmp = await projectWith(
      ["import:", "  - secrets", "default: ask", "secrets:", "  scanner: gitleaks", "  timeoutMs: 1500", ""].join("\n"),
    );
    const compiled = await compileConfig(tmp);
    expect(compiled.config.secrets?.enabled).toBe(true);
    expect(compiled.config.secrets?.scanner).toBe("gitleaks");
    expect(compiled.config.secrets?.timeoutMs).toBe(1500);
  });

  it("warns on an unknown scanner name and ignores it", async () => {
    const tmp = await projectWith("secrets:\n  enabled: true\n  scanner: nonsense\n");
    const compiled = await compileConfig(tmp);
    expect(compiled.ok).toBe(true); // warning, not fatal
    expect(compiled.warnings.some((w) => w.message.includes("unknown scanner"))).toBe(true);
    expect(compiled.config.secrets?.scanner).toBe("auto"); // default survives
  });
});
