import { describe, expect, it } from "bun:test";
import { buildGuidance } from "../src/guidance.js";
import type { FencepostConfig } from "../src/types.js";

function baseConfig(overrides: Partial<FencepostConfig> = {}): FencepostConfig {
  return {
    default: "ask",
    tools: { deny: [], ask: [], allow: [], bash: { normalise: [], deny: [], checks: [], ask: [], allow: [] } },
    ...overrides,
  };
}

describe("buildGuidance", () => {
  it("includes default guidance when enabled (default)", () => {
    const text = buildGuidance(baseConfig());
    expect(text).not.toBeNull();
    expect(text).toContain("fencepost");
    expect(text).toContain("authenticate");
    expect(text).toContain("/tmp/claude");
  });

  it("returns null when guidance is disabled", () => {
    const text = buildGuidance(baseConfig({ guidance: { enabled: false, includeDefaults: true, extra: [] } }));
    expect(text).toBeNull();
  });

  it("appends extra lines after the defaults", () => {
    const text = buildGuidance(
      baseConfig({ guidance: { enabled: true, includeDefaults: true, extra: ["Use bun, not npm."] } }),
    );
    expect(text).toContain("Use bun, not npm.");
  });

  it("can emit only extra lines when defaults are off", () => {
    const text = buildGuidance(
      baseConfig({ guidance: { enabled: true, includeDefaults: false, extra: ["Only this."] } }),
    );
    expect(text).toContain("Only this.");
    expect(text).not.toContain("authenticate");
  });

  it("returns null when enabled but there is nothing to say", () => {
    const text = buildGuidance(baseConfig({ guidance: { enabled: true, includeDefaults: false, extra: [] } }));
    expect(text).toBeNull();
  });

  it("phrases the temp guidance differently when redirect is active", () => {
    const on = buildGuidance(baseConfig({ redirect: { tmp: true, tmpTarget: "/tmp/claude" } }));
    expect(on).toContain("automatically redirected");
  });
});
