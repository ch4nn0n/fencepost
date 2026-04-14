import { describe, expect, it } from "bun:test";
import { splitCommand } from "../../src/bash/split.js";

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
