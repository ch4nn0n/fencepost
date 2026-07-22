import { describe, expect, it } from "bun:test";
import { safeCompileRegex } from "../../src/util/safe-regex.js";

describe("safeCompileRegex", () => {
  it("compiles a valid pattern", () => {
    expect(safeCompileRegex("^foo.*bar$")?.test("fooXbar")).toBe(true);
  });

  it("passes flags through", () => {
    expect(safeCompileRegex("foo", "gi")?.test("FOO")).toBe(true);
  });

  it("rejects invalid syntax", () => {
    expect(safeCompileRegex("(unclosed")).toBeUndefined();
  });

  it("rejects nested-quantifier (ReDoS) shapes", () => {
    expect(safeCompileRegex("(a+)+$")).toBeUndefined();
    expect(safeCompileRegex("(a*)*b")).toBeUndefined();
  });
});
