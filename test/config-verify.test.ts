import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { compileConfig } from "../src/config.js";

async function project(yaml: string): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), "fp-verify-"));
  await mkdir(join(tmp, ".claude"), { recursive: true });
  await writeFile(join(tmp, ".claude", "fencepost.yaml"), yaml, "utf8");
  return tmp;
}

describe("compileConfig", () => {
  it("is ok with no config and defaults onError to ask", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "fp-empty-"));
    const c = await compileConfig(tmp);
    expect(c.ok).toBe(true);
    expect(c.errors).toHaveLength(0);
    expect(c.config.onError).toBe("ask");
  });

  it("is ok for a valid config and parses onError", async () => {
    const c = await compileConfig(await project("default: ask\nonError: allow\n"));
    expect(c.ok).toBe(true);
    expect(c.config.onError).toBe("allow");
  });

  it("fails closed on a YAML syntax error", async () => {
    const c = await compileConfig(await project("default: ask\n  bad: : indent\n"));
    expect(c.ok).toBe(false);
    expect(c.errors[0]?.message).toMatch(/YAML parse error/);
  });

  it("fails closed on an invalid default", async () => {
    const c = await compileConfig(await project("default: maybe\n"));
    expect(c.ok).toBe(false);
    expect(c.errors.some((e) => /invalid 'default'/.test(e.message))).toBe(true);
  });

  it("fails closed on an invalid onError", async () => {
    const c = await compileConfig(await project("onError: sometimes\n"));
    expect(c.ok).toBe(false);
    expect(c.errors.some((e) => /invalid 'onError'/.test(e.message))).toBe(true);
  });

  it("treats a bad rule regex as a non-fatal warning (still ok)", async () => {
    const yaml = "default: ask\ntools:\n  bash:\n    checks:\n      - { test: '([', description: 'broken' }\n";
    const c = await compileConfig(await project(yaml));
    expect(c.ok).toBe(true);
    expect(c.warnings.length).toBeGreaterThan(0);
  });

  it("render() reports errors and the fail-closed posture", async () => {
    const c = await compileConfig(await project("default: nope\n"));
    const text = c.render();
    expect(text).toContain("Errors");
    expect(text).toContain("FAIL CLOSED");
  });
});
