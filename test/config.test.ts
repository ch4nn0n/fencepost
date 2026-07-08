import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { resolveConfig } from "../src/config.js";

const FIXTURES_DIR = resolve(import.meta.dir, "fixtures");

// The fixtures directory has .claude/fencepost/config/ inside it via symlink trick —
// we use a directory that contains a .claude/fencepost/config/ structure.
// Actually our fixtures ARE the fencepost dir, so we need a parent that has .claude/fencepost/.
// We'll create a temp dir pointing at the fixtures for config loading tests.

describe("resolveConfig", () => {
  it("loads conf.d directory and merges files alphabetically", async () => {
    // Create a temp cwd that has .claude/fencepost/config/ pointing to fixtures
    const { mkdtemp, symlink } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

    const tmp = await mkdtemp(join(tmpdir(), "fencepost-test-"));
    const claudeDir = join(tmp, ".claude");
    const fencepostDir = join(claudeDir, "fencepost");
    await import("node:fs/promises").then((m) => m.mkdir(fencepostDir, { recursive: true }));
    await symlink(join(FIXTURES_DIR, "fencepost", "config"), join(fencepostDir, "config"));

    const config = await resolveConfig(tmp);

    // Should have merged all 3 fixture config files
    expect(config._sources).toHaveLength(3);
    expect(config.tools.allow).toContain("Read");     // from 00-defaults.yaml
    expect(config.tools.allow).toContain("Glob");
    expect(config.tools.bash.allow).toContain("ls");   // from 10-tools.yaml
    expect(config.tools.bash.deny).toContain("git branch -D"); // from 20-bash.yaml
    expect(config.tools.bash.normalise).toHaveLength(1); // kubectl normalise from 20-bash.yaml
  });

  it("falls back to single file config", async () => {
    const { mkdtemp, copyFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { mkdir } = await import("node:fs/promises");

    const tmp = await mkdtemp(join(tmpdir(), "fencepost-test-"));
    const claudeDir = join(tmp, ".claude");
    await mkdir(claudeDir, { recursive: true });
    await copyFile(join(FIXTURES_DIR, "single-config.yaml"), join(claudeDir, "fencepost.yaml"));

    const config = await resolveConfig(tmp);
    expect(config._sources).toHaveLength(1);
    expect(config.default).toBe("allow");
    expect(config.tools.allow).toContain("Read");
    expect(config.tools.deny).toHaveLength(1);
  });

  it("returns defaults when no config found", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

    const tmp = await mkdtemp(join(tmpdir(), "fencepost-empty-"));
    const config = await resolveConfig(tmp);
    expect(config._sources).toHaveLength(0);
    expect(config.default).toBe("ask");
  });
});
