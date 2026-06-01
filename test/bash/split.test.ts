import { describe, expect, it } from "bun:test";
import { splitCommand, splitCommandDetailed, hasSequencing } from "../../src/bash/split.js";

describe("splitCommand", () => {
  it("returns single command unchanged", () => {
    expect(splitCommand("ls -la")).toEqual(["ls -la"]);
  });

  it("splits on &&", () => {
    expect(splitCommand("ls && git status")).toEqual(["ls", "git status"]);
  });

  it("splits on ||", () => {
    expect(splitCommand("ls || echo fail")).toEqual(["ls", "echo fail"]);
  });

  it("splits on |", () => {
    expect(splitCommand("cat foo | grep bar")).toEqual(["cat foo", "grep bar"]);
  });

  it("splits on ;", () => {
    expect(splitCommand("ls; git status")).toEqual(["ls", "git status"]);
  });

  it("does not split inside double quotes", () => {
    expect(splitCommand('echo "hello && world"')).toEqual(['echo "hello && world"']);
  });

  it("does not split inside single quotes", () => {
    expect(splitCommand("echo 'hello | world'")).toEqual(["echo 'hello | world'"]);
  });

  it("does not split escaped operators", () => {
    expect(splitCommand("echo hello \\&\\& world")).toEqual(["echo hello \\&\\& world"]);
  });

  it("handles multiple operators", () => {
    expect(splitCommand("ls && git status; echo done")).toEqual(["ls", "git status", "echo done"]);
  });

  it("trims whitespace around parts", () => {
    expect(splitCommand("ls  &&  git status")).toEqual(["ls", "git status"]);
  });
});

describe("splitCommandDetailed", () => {
  it("reports the joining operators", () => {
    const r = splitCommandDetailed("ls && git status; echo done");
    expect(r.parts).toEqual(["ls", "git status", "echo done"]);
    expect(r.operators).toEqual(["&&", ";"]);
  });

  it("distinguishes pipes from sequencing", () => {
    expect(splitCommandDetailed("cat foo | grep bar").operators).toEqual(["|"]);
    expect(splitCommandDetailed("a || b").operators).toEqual(["||"]);
  });

  it("has no operators for a single command", () => {
    const r = splitCommandDetailed("ls -la");
    expect(r.parts).toEqual(["ls -la"]);
    expect(r.operators).toEqual([]);
  });

  it("drops a dangling trailing operator", () => {
    const r = splitCommandDetailed("ls ;");
    expect(r.parts).toEqual(["ls"]);
    expect(r.operators).toEqual([]);
  });
});

describe("hasSequencing", () => {
  it("is true for &&, ||, ;", () => {
    expect(hasSequencing(["&&"])).toBe(true);
    expect(hasSequencing(["||"])).toBe(true);
    expect(hasSequencing([";"])).toBe(true);
  });

  it("is false for pipes only", () => {
    expect(hasSequencing(["|"])).toBe(false);
    expect(hasSequencing([])).toBe(false);
  });

  it("is true for a mix of pipe and sequencing", () => {
    expect(hasSequencing(["|", "&&"])).toBe(true);
  });
});
