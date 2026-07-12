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

  it("protects HTML tags containing URLs before the URL", () => {
    const source = '<a href="https://example.com/docs">Docs</a>';
    const { text, tokens } = protectTokens(source);
    expect(
      tokens.filter((token) => token.type === "markdown").map((token) => token.original)
    ).toEqual(['<a href="https://example.com/docs">', "</a>"]);
    expect(tokens.some((token) => token.type === "url")).toBe(false);
    expect(restoreTokens(text, tokens)).toBe(source);
  });

  it("keeps inline code ahead of HTML tags containing URLs", () => {
    const source = '`<a href="https://example.com/docs">Docs</a>`';
    const { tokens } = protectTokens(source);
    expect(tokens).toEqual([
      { placeholder: "{{INLINE-CODE_1}}", original: source, type: "inline-code" }
    ]);
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

  it("protects Markdown delimiters and line breaks", () => {
    const source = "Read [docs](https://example.com) and **continue**.\nNext line.";
    const { text, tokens } = protectTokens(source);
    expect(text).not.toContain("[");
    expect(text).not.toContain("]");
    expect(text).not.toContain("*");
    expect(tokens.some((token) => token.type === "markdown")).toBe(true);
    expect(restoreTokens(text, tokens)).toBe(source);
  });

  it("protects literal braces adjacent to inline-code placeholders", () => {
    // Literal { and } outside backticks adjacent to {{INLINE-CODE_n}}
    // would create {{{ triple-brace patterns that break validation regex.
    const source = "Use {`config`}";
    const { text, tokens } = protectTokens(source);
    expect(text).not.toContain("{{{");
    expect(text).not.toContain("}}}");
    const braceTokens = tokens.filter(
      (t) => t.type === "markdown" && (t.original === "{" || t.original === "}")
    );
    expect(braceTokens.length).toBeGreaterThanOrEqual(2);
    expect(restoreTokens(text, tokens)).toBe(source);
  });

  it("does not match prose fragments as commands", () => {
    const { tokens } = protectTokens("provider. If no auth is configured for sources here.");
    const commandTokens = tokens.filter((t) => t.type === "command");
    expect(commandTokens).toHaveLength(0);
  });

  it("still matches real shell commands", () => {
    const { tokens } = protectTokens("Run git commit to save changes.");
    const commandTokens = tokens.filter((t) => t.type === "command");
    expect(commandTokens).toHaveLength(1);
    expect(commandTokens[0].original).toBe("git commit");
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
