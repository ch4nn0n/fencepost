import { describe, expect, it } from "bun:test";
import { redirectTmpString, redirectToolInput } from "../src/redirect.js";
import type { FencepostConfig } from "../src/types.js";

describe("redirectTmpString", () => {
  it("rewrites /tmp/ subpaths to the sandbox", () => {
    expect(redirectTmpString("rm -rf /tmp/foo")).toBe("rm -rf /tmp/claude/foo");
  });

  it("rewrites a bare /tmp at a boundary", () => {
    expect(redirectTmpString("cd /tmp")).toBe("cd /tmp/claude");
    expect(redirectTmpString("cd /tmp && ls")).toBe("cd /tmp/claude && ls");
  });

  it("leaves paths already under the target untouched", () => {
    expect(redirectTmpString("cat /tmp/claude/x")).toBe("cat /tmp/claude/x");
    expect(redirectTmpString("ls /tmp/claude")).toBe("ls /tmp/claude");
  });

  it("does not touch non-/tmp paths or lookalikes", () => {
    expect(redirectTmpString("cat /tmpfile")).toBe("cat /tmpfile");
    expect(redirectTmpString("cat /var/tmp/x")).toBe("cat /var/tmp/x");
  });

  it("handles multiple occurrences", () => {
    expect(redirectTmpString("cp /tmp/a /tmp/b")).toBe("cp /tmp/claude/a /tmp/claude/b");
  });

  it("supports a custom target", () => {
    expect(redirectTmpString("rm /tmp/x", "/tmp/scratch")).toBe("rm /tmp/scratch/x");
  });

  it("is a no-op for targets not under /tmp", () => {
    expect(redirectTmpString("rm /tmp/x", "/home/work")).toBe("rm /tmp/x");
  });
});

function configWithRedirect(tmp: boolean): FencepostConfig {
  return {
    default: "ask",
    tools: { deny: [], ask: [], allow: [], bash: { normalise: [], deny: [], checks: [], ask: [], allow: [] } },
    redirect: { tmp, tmpTarget: "/tmp/claude" },
  };
}

describe("redirectToolInput", () => {
  it("rewrites the Bash command field when enabled", () => {
    const { input, changed } = redirectToolInput("Bash", { command: "ls /tmp/x" }, configWithRedirect(true));
    expect(changed).toBe(true);
    expect(input["command"]).toBe("ls /tmp/claude/x");
  });

  it("rewrites file_path for file tools", () => {
    const { input } = redirectToolInput("Write", { file_path: "/tmp/note.md", content: "hi" }, configWithRedirect(true));
    expect(input["file_path"]).toBe("/tmp/claude/note.md");
    expect(input["content"]).toBe("hi");
  });

  it("does nothing when redirect is disabled", () => {
    const { input, changed } = redirectToolInput("Bash", { command: "ls /tmp/x" }, configWithRedirect(false));
    expect(changed).toBe(false);
    expect(input["command"]).toBe("ls /tmp/x");
  });

  it("does nothing for tools without path fields", () => {
    const { changed } = redirectToolInput("Grep", { pattern: "/tmp/x" }, configWithRedirect(true));
    expect(changed).toBe(false);
  });

  it("reports unchanged when no /tmp path is present", () => {
    const { changed } = redirectToolInput("Bash", { command: "ls /home" }, configWithRedirect(true));
    expect(changed).toBe(false);
  });
});
