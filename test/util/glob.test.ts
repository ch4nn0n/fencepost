import { describe, expect, it } from "bun:test";
import { matchesGlob } from "../../src/util/glob.js";

describe("matchesGlob", () => {
  it("matches exact names", () => {
    expect(matchesGlob("Read", "Read")).toBe(true);
    expect(matchesGlob("Write", "Read")).toBe(false);
  });

  it("matches wildcard *", () => {
    expect(matchesGlob("mcp__plugin_slack__send", "mcp__plugin_slack__*")).toBe(true);
    expect(matchesGlob("mcp__plugin_slack__send", "mcp__*")).toBe(true);
    expect(matchesGlob("Read", "mcp__*")).toBe(false);
  });

  it("matches single char ?", () => {
    expect(matchesGlob("Read", "R?ad")).toBe(true);
    expect(matchesGlob("Read", "R??d")).toBe(true);
    expect(matchesGlob("Rd", "R?ad")).toBe(false);
  });

  it("escapes regex metacharacters in pattern", () => {
    expect(matchesGlob("foo.bar", "foo.bar")).toBe(true);
    expect(matchesGlob("fooXbar", "foo.bar")).toBe(false);
  });
});
