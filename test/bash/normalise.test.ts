import { describe, expect, it } from "bun:test";
import { normaliseCommand } from "../../src/bash/normalise.js";
import type { NormaliseRule } from "../../src/types.js";

const kubectlRules: NormaliseRule[] = [
  {
    prefix: "kubectl",
    strip: ["-n \\S+", "--namespace \\S+", "--context \\S+"],
  },
];

describe("normaliseCommand", () => {
  it("strips matching patterns from prefixed command", () => {
    expect(normaliseCommand("kubectl -n production get pods", kubectlRules))
      .toBe("kubectl get pods");
  });

  it("strips multiple patterns", () => {
    expect(normaliseCommand("kubectl -n prod get pods --context staging", kubectlRules))
      .toBe("kubectl get pods");
  });

  it("does not modify commands that don't match prefix", () => {
    expect(normaliseCommand("docker -n prod run image", kubectlRules))
      .toBe("docker -n prod run image");
  });

  it("returns unchanged when no rules match", () => {
    expect(normaliseCommand("git status", kubectlRules)).toBe("git status");
  });

  it("collapses multiple spaces after stripping", () => {
    expect(normaliseCommand("kubectl  -n prod  get  pods", kubectlRules))
      .toBe("kubectl get pods");
  });

  it("handles empty rules", () => {
    expect(normaliseCommand("kubectl get pods", [])).toBe("kubectl get pods");
  });
});
