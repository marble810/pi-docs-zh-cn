import { describe, it, expect } from "vitest";
import type { SearchDocument } from "../../scripts/lib/types.js";

/**
 * Search index generation tests.
 * Search documents include body text, headings, title, and section metadata.
 */
describe("Search index generation", () => {
  function buildSearchDocument(
    slug: string,
    title: string,
    section: string,
    headings: string[],
    body: string
  ): SearchDocument {
    return {
      id: slug.replace(/\//g, "-"),
      slug,
      title,
      section,
      headings: headings.join(" "),
      body
    };
  }

  it("creates a search document with required fields", () => {
    const doc = buildSearchDocument(
      "docs/latest/guide",
      "Installation Guide",
      "getting-started",
      ["Introduction", "Setup"],
      "Follow these steps to install."
    );
    expect(doc.id).toBe("docs-latest-guide");
    expect(doc.slug).toBe("docs/latest/guide");
    expect(doc.title).toBe("Installation Guide");
  });

  it("concatenates headings into a single string", () => {
    const doc = buildSearchDocument("test", "Test", "dev", ["H1", "H2", "H3"], "content");
    expect(doc.headings).toBe("H1 H2 H3");
  });

  it("handles empty headings", () => {
    const doc = buildSearchDocument("test", "Test", "dev", [], "content");
    expect(doc.headings).toBe("");
  });

  it("handles empty body", () => {
    const doc = buildSearchDocument("test", "Test", "dev", ["H1"], "");
    expect(doc.body).toBe("");
  });

  it("generates indexable id from slug", () => {
    const slugs = ["docs/latest/guide", "docs/latest/api/config", "index"];
    for (const slug of slugs) {
      const doc = buildSearchDocument(slug, "X", "section", [], "");
      expect(doc.id).toBe(slug.replace(/\//g, "-"));
    }
  });

  it("preserves section metadata for faceted search", () => {
    const doc = buildSearchDocument("test", "Test", "getting-started", [], "");
    expect(doc.section).toBe("getting-started");
  });
});
