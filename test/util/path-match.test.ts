import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isUnderRoot, isOutsideAllRoots, matchesPathGlob, pathValueOf } from "../../src/util/path-match.js";

const CWD = "/home/me/proj";

describe("isUnderRoot", () => {
  it("matches the root and nested paths", () => {
    expect(isUnderRoot("/tmp/claude/x", "/tmp/claude", CWD)).toBe(true);
    expect(isUnderRoot("/tmp/claude", "/tmp/claude", CWD)).toBe(true);
  });
  it("rejects siblings and prefixes", () => {
    expect(isUnderRoot("/tmp/claudex", "/tmp/claude", CWD)).toBe(false);
    expect(isUnderRoot("/etc/passwd", "/tmp/claude", CWD)).toBe(false);
  });
  it("resolves relative roots/targets against cwd", () => {
    expect(isUnderRoot("build/x", ".", CWD)).toBe(true);
    expect(isUnderRoot("../../etc/x", ".", CWD)).toBe(false);
  });

  it("rejects escape via a symlink planted inside an allowed root", () => {
    const base = mkdtempSync(join(tmpdir(), "fp-symlink-"));
    const sandbox = join(base, "claude");
    const secret = join(base, "outside-secret");
    mkdirSync(sandbox);
    mkdirSync(secret);
    // Attacker (or an earlier command) plants a symlink inside the sandbox
    // that points outside it. A never-yet-created file under that symlink
    // must not be reported as "under" the sandbox root.
    symlinkSync(secret, join(sandbox, "escape"));
    expect(isUnderRoot(join(sandbox, "escape", "authorized_keys"), sandbox, CWD)).toBe(false);
  });

  it("still allows a symlinked root's own contents (target and root resolve together)", () => {
    const base = mkdtempSync(join(tmpdir(), "fp-symlink-"));
    const real = join(base, "real");
    const linkedRoot = join(base, "claude");
    mkdirSync(real);
    symlinkSync(real, linkedRoot);
    expect(isUnderRoot(join(linkedRoot, "scratch.txt"), linkedRoot, CWD)).toBe(true);
  });
});

describe("isOutsideAllRoots", () => {
  it("is true only when outside every root", () => {
    expect(isOutsideAllRoots("/etc/x", ["/tmp/claude", "."], CWD)).toBe(true);
    expect(isOutsideAllRoots("/tmp/claude/x", ["/tmp/claude", "."], CWD)).toBe(false);
    expect(isOutsideAllRoots("build/x", ["/tmp/claude", "."], CWD)).toBe(false);
  });
});

describe("matchesPathGlob", () => {
  it("supports ** across separators and * within a segment", () => {
    expect(matchesPathGlob("/etc/ssh/sshd_config", "/etc/**", CWD)).toBe(true);
    expect(matchesPathGlob("/var/log/app.log", "/var/log/*.log", CWD)).toBe(true);
    expect(matchesPathGlob("/var/log/sub/app.log", "/var/log/*.log", CWD)).toBe(false);
  });
});

describe("pathValueOf", () => {
  it("returns non-flags and the value of --flag=path", () => {
    expect(pathValueOf("/etc/x")).toBe("/etc/x");
    expect(pathValueOf("--output=/etc/x")).toBe("/etc/x");
    expect(pathValueOf("-rf")).toBeNull();
  });
});
