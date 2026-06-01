import { describe, expect, it } from "bun:test";
import { stripControlFlow } from "../../src/bash/control-flow.js";

describe("stripControlFlow", () => {
  it("strips a simple for loop, leaving the body", () => {
    const r = stripControlFlow("for f in a b; do echo $f; done");
    expect(r.wasControlFlow).toBe(true);
    expect(r.command).toBe("echo $f");
  });

  it("exposes a destructive loop body for evaluation", () => {
    const r = stripControlFlow("for f in *.txt; do rm -rf /data/$f; done");
    expect(r.command).toBe("rm -rf /data/$f");
  });

  it("handles while ... done with input redirection", () => {
    const r = stripControlFlow("while read l; do process $l; done < file");
    expect(r.wasControlFlow).toBe(true);
    expect(r.command).toBe("process $l");
  });

  it("handles if/then/else/fi", () => {
    const r = stripControlFlow("if [ -f x ]; then cat x; else echo no; fi");
    expect(r.command).toBe("cat x; echo no");
  });

  it("handles newline-delimited loops", () => {
    const r = stripControlFlow("for i in 1 2\ndo\n  echo $i\ndone");
    expect(r.wasControlFlow).toBe(true);
    expect(r.command).toBe("echo $i");
  });

  it("keeps multiple body statements", () => {
    const r = stripControlFlow("for f in a b; do echo $f; ls; done");
    expect(r.command).toBe("echo $f; ls");
  });

  it("does not treat a keyword used as an argument as control flow", () => {
    expect(stripControlFlow("echo for loop is fun").wasControlFlow).toBe(false);
    expect(stripControlFlow("git status && echo done-ish").wasControlFlow).toBe(false);
    expect(stripControlFlow("ls && rm -rf /tmp/x").wasControlFlow).toBe(false);
  });
});
