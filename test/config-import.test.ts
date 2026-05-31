import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { resolveConfig } from "../src/config.js";

const PRESETS_DIR = resolve(import.meta.dir, "..", "presets");

// Point the resolver at the real bundled presets for these tests.
const prevPresetsDir = process.env["FENCEPOST_PRESETS_DIR"];
beforeAll(() => {
  process.env["FENCEPOST_PRESETS_DIR"] = PRESETS_DIR;
});
afterAll(() => {
  if (prevPresetsDir === undefined) delete process.env["FENCEPOST_PRESETS_DIR"];
  else process.env["FENCEPOST_PRESETS_DIR"] = prevPresetsDir;
});

async function projectWithConfig(yaml: string): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), "fencepost-import-"));
  const claudeDir = join(tmp, ".claude");
  await mkdir(claudeDir, { recursive: true });
  await writeFile(join(claudeDir, "fencepost.yaml"), yaml, "utf8");
  return tmp;
}

describe("import directive", () => {
  it("merges a bundled preset as the base config", async () => {
    const tmp = await projectWithConfig("import:\n  - git\ndefault: ask\n");
    const config = await resolveConfig(tmp);

    // git preset rules are present
    expect(config.tools.bash.allow).toContain("git status");
    expect(config.tools.bash.ask).toContain("git rebase");
    expect(config.tools.bash.deny).toContain("git clean -xfd");
    // force-push is a smart-deny check, not a plain ask
    expect(config.tools.bash.checks.some((c) => /--force/.test(c.test))).toBe(true);
    // preset path is recorded in provenance, before the user's own file
    expect(config._sources.some((s) => s.endsWith("git.yaml"))).toBe(true);
    expect(config._sources.some((s) => s.endsWith("fencepost.yaml"))).toBe(true);
  });

  it("merges multiple presets in listed order and keeps the user's own rules", async () => {
    const tmp = await projectWithConfig(
      "import:\n  - kubernetes\n  - context7\ndefault: ask\ntools:\n  allow:\n    - MyCustomTool\n",
    );
    const config = await resolveConfig(tmp);

    expect(config.tools.bash.ask).toContain("kubectl apply");
    expect(config.tools.bash.normalise.some((n) => n.prefix === "kubectl")).toBe(true);
    expect(config.tools.allow).toContain("mcp__*context7*"); // from context7 preset
    expect(config.tools.allow).toContain("MyCustomTool"); // user's own rule layered on top
  });

  it("the user's default wins over presets (presets do not set default)", async () => {
    const tmp = await projectWithConfig("import:\n  - helm\ndefault: deny\n");
    const config = await resolveConfig(tmp);
    expect(config.default).toBe("deny");
    expect(config.tools.bash.ask).toContain("helm upgrade");
  });

  it("ignores unknown preset names without failing", async () => {
    const tmp = await projectWithConfig("import:\n  - git\n  - does-not-exist\ndefault: ask\n");
    const config = await resolveConfig(tmp);
    expect(config.tools.bash.allow).toContain("git status");
    expect(config._sources.some((s) => s.endsWith("does-not-exist.yaml"))).toBe(false);
  });

  it("rejects path-traversal preset names", async () => {
    const tmp = await projectWithConfig('import:\n  - "../../../etc/passwd"\ndefault: ask\n');
    const config = await resolveConfig(tmp);
    // Nothing imported; only the user's own (empty) config file is a source.
    expect(config._sources).toHaveLength(1);
    expect(config._sources[0]?.endsWith("fencepost.yaml")).toBe(true);
  });
});
