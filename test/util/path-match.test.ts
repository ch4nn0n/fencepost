import { describe, expect, it } from "bun:test";
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
