import { describe, it, expect, beforeEach } from "vitest";
import { extractSegments, resetSegmentCounter } from "../../scripts/extract-segments.js";
import { restoreTokens } from "../../scripts/protect-tokens.js";

describe("extractSegments", () => {
  beforeEach(() => resetSegmentCounter());

  it("extracts a heading and paragraph", () => {
    const md = `# Getting Started\n\nWelcome to the docs.\n`;
    const segments = extractSegments(md, "getting-started.md");
    expect(segments.length).toBeGreaterThanOrEqual(2);
    const heading = segments.find((s) => s.nodeType === "heading");
    expect(heading).toBeDefined();
    expect(heading!.source).toBe("Getting Started");
    const para = segments.find((s) => s.nodeType === "paragraph");
    expect(para).toBeDefined();
    expect(para!.source).toBe("Welcome to the docs.");
  });

  it("extracts list items", () => {
    const md = `- First item\n- Second item\n`;
    const segments = extractSegments(md, "list.md");
    const items = segments.filter((s) => s.nodeType === "listItem");
    expect(items.length).toBe(2);
    expect(items[0].source).toBe("First item");
    expect(items[1].source).toBe("Second item");
  });

  it("generates stable IDs", () => {
    const md = `# Heading\n\nParagraph.\n`;
    const segments1 = extractSegments(md, "test.md");
    const segments2 = extractSegments(md, "test.md");
    expect(segments1.length).toBe(segments2.length);
    for (let i = 0; i < segments1.length; i++) {
      expect(segments1[i].id).toBe(segments2[i].id);
    }
  });

  it("handles table cells", () => {
    const md = `| A | B |\n|---|---|\n| 1 | 2 |\n`;
    const segments = extractSegments(md, "table.md");
    const cells = segments.filter((s) => s.nodeType === "tableCell");
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });

  it("has sectionPath for nested headings", () => {
    const md = `# Top\n\n## Sub\n\nContent.\n`;
    const segments = extractSegments(md, "nested.md");
    const para = segments.find((s) => s.nodeType === "paragraph");
    expect(para).toBeDefined();
    expect(para!.sectionPath).toContain("Sub");
  });

  it("skips fenced code blocks — no codeBlock segments emitted", () => {
    const md = "# Code Example\n\n```ts\nconst x = 1;\nconsole.log(x);\n```\n\nSome text.\n";
    const segments = extractSegments(md, "code.md");
    const codeSegments = segments.filter((s) => s.nodeType === "codeBlock");
    expect(codeSegments).toHaveLength(0);
    // Heading and paragraph should still be extracted
    const headings = segments.filter((s) => s.nodeType === "heading");
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const paras = segments.filter((s) => s.nodeType === "paragraph");
    expect(paras.length).toBeGreaterThanOrEqual(1);
  });

  it("does not emit inlineCode segments (inline code is part of paragraph)", () => {
    const md = "# API\n\nUse `fetch()` to get data.\n";
    const segments = extractSegments(md, "api.md");
    // Inline code is not a separate segment type
    const inlineSegments = segments.filter((s) => s.nodeType === "inlineCode");
    expect(inlineSegments).toHaveLength(0);
    // The paragraph contains the inline code text
    const para = segments.find((s) => s.nodeType === "paragraph");
    expect(para).toBeDefined();
    expect(para!.source).toBe("Use `fetch()` to get data.");
    expect(para!.sourceStart).toBe(md.indexOf("Use"));
    expect(para!.sourceEnd).toBe(md.indexOf("data.") + "data.".length);
  });

  it("protects inline Markdown markers in a positioned segment", () => {
    const md = "Read [the docs](https://example.com) and **start here**.\n";
    const [segment] = extractSegments(md, "links.md");
    expect(segment.source).toBe("Read [the docs](https://example.com) and **start here**.");
    expect(md.slice(segment.sourceStart, segment.sourceEnd)).toBe(segment.source);
    expect(segment.normalizedSource).not.toContain("[");
    expect(segment.normalizedSource).not.toContain("]");
    expect(segment.normalizedSource).not.toContain("*");
    expect(segment.protectedTokens.some((token) => token.type === "markdown")).toBe(true);
    expect(restoreTokens(segment.normalizedSource, segment.protectedTokens)).toBe(segment.source);
  });
});
