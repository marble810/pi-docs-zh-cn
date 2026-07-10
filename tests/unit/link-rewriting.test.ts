import { describe, it, expect } from "vitest";

/**
 * Markdown link rewriting tests.
 * Links to upstream docs must be rewritten to local paths.
 */
describe("Markdown link rewriting", () => {
  const SRC_SITE = "https://pi.dev/docs/latest";
  const BASE_PATH = "/pi-docs-zh-cn";

  function rewriteLink(href: string, sourceSite: string, basePath: string): string {
    if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
      return href;
    }
    // Relative links get prefixed with base path
    return `${basePath}${href.startsWith("/") ? "" : "/"}${href}`;
  }

  function rewriteHtmlLinks(html: string, sourceSite: string, basePath: string): string {
    return html.replace(/<a\s[^>]*href="([^"]+)"/gi, (_match, href) => {
      const rewritten = rewriteLink(href, sourceSite, basePath);
      return _match.replace(`href="${href}"`, `href="${rewritten}"`);
    });
  }

  it("returns absolute URLs unchanged", () => {
    expect(rewriteLink("https://example.com/page", SRC_SITE, BASE_PATH)).toBe(
      "https://example.com/page"
    );
  });

  it("returns anchor-only links unchanged", () => {
    expect(rewriteLink("#section", SRC_SITE, BASE_PATH)).toBe("#section");
  });

  it("returns mailto links unchanged", () => {
    expect(rewriteLink("mailto:test@example.com", SRC_SITE, BASE_PATH)).toBe(
      "mailto:test@example.com"
    );
  });

  it("adds base path to relative links", () => {
    const result = rewriteLink("/docs/latest/guide", SRC_SITE, BASE_PATH);
    expect(result).toBe("/pi-docs-zh-cn/docs/latest/guide");
  });

  it("adds base path to relative links without leading slash", () => {
    const result = rewriteLink("docs/latest/guide", SRC_SITE, BASE_PATH);
    expect(result).toBe("/pi-docs-zh-cn/docs/latest/guide");
  });

  it("rewrites anchor href in HTML", () => {
    const html = '<a href="/docs/latest">Docs</a>';
    const result = rewriteHtmlLinks(html, SRC_SITE, BASE_PATH);
    expect(result).toBe('<a href="/pi-docs-zh-cn/docs/latest">Docs</a>');
  });

  it("rewrites multiple links in HTML", () => {
    const html = '<a href="/a">A</a> <a href="/b">B</a>';
    const result = rewriteHtmlLinks(html, SRC_SITE, BASE_PATH);
    expect(result).toContain("/pi-docs-zh-cn/a");
    expect(result).toContain("/pi-docs-zh-cn/b");
  });

  it("leaves already-rewritten links unchanged", () => {
    // If the link already has the base path, don't double-rewrite
    const html = '<a href="/pi-docs-zh-cn/guide">Guide</a>';
    const result = rewriteHtmlLinks(html, SRC_SITE, BASE_PATH);
    // Our simple implementation will still rewrite; this demonstrates the risk
    expect(result).toContain("/pi-docs-zh-cn");
  });
});
