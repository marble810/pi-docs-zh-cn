import { describe, it, expect, beforeEach } from "vitest";
import { protectTokens, resetCounters, restoreTokens } from "../../scripts/protect-tokens.js";

describe("protectTokens", () => {
  beforeEach(() => resetCounters());

  it("protects inline code", () => {
    const { text, tokens } = protectTokens("Use `npm install` to install");
    expect(text).toContain("{{INLINE-CODE_1}}");
    expect(tokens[0].original).toBe("`npm install`");
    expect(tokens[0].type).toBe("inline-code");
  });

  it("protects URLs", () => {
    const { text: _text, tokens } = protectTokens("Visit https://example.com/path");
    expect(_text).toContain("{{URL_1}}");
    expect(tokens[0].original).toBe("https://example.com/path");
  });

  it("protects multiple token types", () => {
    const { tokens } = protectTokens(
      "Run `npm test` at /home/user/project. See https://example.com"
    );
    expect(tokens.length).toBeGreaterThanOrEqual(3);
    const types = tokens.map((t) => t.type);
    expect(types).toContain("inline-code");
    expect(types).toContain("path");
    expect(types).toContain("url");
  });

  it("protects product names", () => {
    const { tokens } = protectTokens("Install SvelteKit and Node.js");
    const productTokens = tokens.filter((t) => t.type === "product");
    // Node.js is a product; SvelteKit matches as identifier (CamelCase)
    expect(productTokens.length).toBeGreaterThanOrEqual(1);
    expect(productTokens.some((t) => t.original === "Node.js")).toBe(true);
  });
});

describe("restoreTokens", () => {
  it("restores original text", () => {
    resetCounters();
    const { text: protectedText, tokens } = protectTokens("Use `code` and https://url.com");
    const restored = restoreTokens(protectedText, tokens);
    expect(restored).toBe("Use `code` and https://url.com");
  });
});
