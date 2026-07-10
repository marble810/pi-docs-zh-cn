import { describe, it, expect, beforeEach } from "vitest";
import { protectTokens, restoreTokens, resetCounters } from "../../scripts/protect-tokens.js";

describe("protectTokens / restoreTokens", () => {
  beforeEach(() => {
    resetCounters();
  });

  it("protects and restores inline code", () => {
    const input = "Run `npm install` to start.";
    const { text, tokens } = protectTokens(input);
    expect(text).not.toContain("`npm install`");
    expect(text).toContain("{{INLINE-CODE_1}}");
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("protects and restores URLs", () => {
    const input = "See https://pi.dev/docs.";
    const { text, tokens } = protectTokens(input);
    expect(text).toContain("{{URL_");
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("protects and restores file paths", () => {
    const input = "Edit /usr/local/config.yml.";
    const { text, tokens } = protectTokens(input);
    expect(text).toContain("{{PATH_");
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("protects and restores product names", () => {
    const input = "Built with SvelteKit and OpenRouter.";
    const { text, tokens } = protectTokens(input);
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("protects and restores commands", () => {
    const input = "Run `pnpm dev` for development.";
    const { text, tokens } = protectTokens(input);
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("round-trips empty string", () => {
    const { text, tokens } = protectTokens("");
    expect(text).toBe("");
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe("");
  });

  it("round-trips string with no protectable tokens", () => {
    const input = "Hello world.";
    const { text, tokens } = protectTokens(input);
    expect(text).toBe(input);
    expect(tokens).toHaveLength(0);
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("handles multiple tokens of the same type", () => {
    const input = "Use `a` and `b` and `c`.";
    const { text, tokens } = protectTokens(input);
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });

  it("preserves order after restore", () => {
    const input = "`a` > `b` > `c`";
    const { text, tokens } = protectTokens(input);
    const restored = restoreTokens(text, tokens);
    expect(restored).toBe(input);
  });
});
