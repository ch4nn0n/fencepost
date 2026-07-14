import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { load } from "js-yaml";
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

  it("the 'all' token expands to every bundled preset", async () => {
    const tmp = await projectWithConfig("import:\n  - all\ndefault: ask\n");
    const config = await resolveConfig(tmp);

    // Rules from presets spread across the set are all present.
    expect(config.tools.bash.allow).toContain("git status"); // git
    expect(config.tools.bash.ask).toContain("kubectl apply"); // kubernetes
    expect(config.tools.bash.ask).toContain("helm upgrade"); // helm
    expect(config.tools.allow).toContain("Read"); // claude

    // Every bundled preset became a source, deduped against the user file.
    const presetFiles = (await readdir(PRESETS_DIR)).filter((f) => f.endsWith(".yaml"));
    for (const f of presetFiles) {
      expect(config._sources.some((s) => s.endsWith(f))).toBe(true);
    }
  });

  it("dedupes 'all' against explicitly listed presets", async () => {
    const tmp = await projectWithConfig("import:\n  - git\n  - all\ndefault: ask\n");
    const config = await resolveConfig(tmp);
    const gitSources = config._sources.filter((s) => s.endsWith("git.yaml"));
    expect(gitSources).toHaveLength(1);
  });

  it("ignores unknown preset names without failing", async () => {
    const tmp = await projectWithConfig("import:\n  - git\n  - does-not-exist\ndefault: ask\n");
    const config = await resolveConfig(tmp);
    expect(config.tools.bash.allow).toContain("git status");
    expect(config._sources.some((s) => s.endsWith("does-not-exist.yaml"))).toBe(false);
  });

  it("the claude preset enables /tmp redirect and allows built-in tools", async () => {
    const tmp = await projectWithConfig("import:\n  - claude\ndefault: ask\n");
    const config = await resolveConfig(tmp);
    expect(config.redirect?.tmp).toBe(true);
    expect(config.redirect?.tmpTarget).toBe("/tmp/claude");
    expect(config.tools.allow).toContain("Read");
    expect(config.tools.allow).toContain("Write");
    expect(config.tools.allow).not.toContain("WebFetch");
    expect(config.tools.allow).not.toContain("Bash");
  });

  it("defaults discourageChaining to true when unset", async () => {
    const tmp = await projectWithConfig("default: ask\n");
    const config = await resolveConfig(tmp);
    expect(config.tools.bash.discourageChaining).toBe(true);
  });

  it("lets a user disable discourageChaining explicitly", async () => {
    const tmp = await projectWithConfig("default: ask\ntools:\n  bash:\n    discourageChaining: false\n");
    const config = await resolveConfig(tmp);
    expect(config.tools.bash.discourageChaining).toBe(false);
  });

  it("rejects path-traversal preset names", async () => {
    const tmp = await projectWithConfig('import:\n  - "../../../etc/passwd"\ndefault: ask\n');
    const config = await resolveConfig(tmp);
    // Nothing imported; only the user's own (empty) config file is a source.
    expect(config._sources).toHaveLength(1);
    expect(config._sources[0]?.endsWith("fencepost.yaml")).toBe(true);
  });
});

describe("preset metadata", () => {
  // docs/scripts/generate-preset-docs.ts builds a docs page per preset from
  // this block, so every bundled preset must carry one.
  it("every bundled preset has meta.title and meta.description", async () => {
    const files = (await readdir(PRESETS_DIR)).filter((f) => f.endsWith(".yaml")).sort();
    expect(files.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const file of files) {
      const parsed = load(await readFile(join(PRESETS_DIR, file), "utf8")) as {
        meta?: { title?: unknown; description?: unknown };
      } | null;
      const title = parsed?.meta?.title;
      const description = parsed?.meta?.description;
      if (typeof title !== "string" || title.trim() === "") missing.push(`${file}: meta.title`);
      if (typeof description !== "string" || description.trim() === "")
        missing.push(`${file}: meta.description`);
    }
    expect(missing).toEqual([]);
  });
});
