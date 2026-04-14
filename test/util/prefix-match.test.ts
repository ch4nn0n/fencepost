import { describe, expect, it } from "bun:test";
import { prefixMatch } from "../../src/util/prefix-match.js";

describe("prefixMatch", () => {
  it("matches exact string", () => {
    expect(prefixMatch("git branch", "git branch")).toBe(true);
  });

  it("matches prefix followed by space", () => {
    expect(prefixMatch("git branch -D main", "git branch")).toBe(true);
    expect(prefixMatch("git branch -D main", "git branch -D")).toBe(true);
  });

  it("does not match without word boundary", () => {
    expect(prefixMatch("git branchless", "git branch")).toBe(false);
  });

  it("does not match partial overlap", () => {
    expect(prefixMatch("git status", "git branch")).toBe(false);
  });

  it("does not match substring in the middle", () => {
    expect(prefixMatch("my git branch foo", "git branch")).toBe(false);
  });
});
