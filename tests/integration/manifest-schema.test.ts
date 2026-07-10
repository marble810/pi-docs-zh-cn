import { describe, it, expect } from "vitest";
import type { DocsManifest, DocsManifestPage } from "../../scripts/lib/types.js";

/**
 * Generated manifest schema validation tests.
 * Tests that the DocsManifest type and its structure are correct.
 */
describe("Generated manifest schema", () => {
  function validateManifest(manifest: unknown): manifest is DocsManifest {
    if (!Array.isArray(manifest)) return false;
    return manifest.every(isValidPage);
  }

  function isValidPage(page: unknown): page is DocsManifestPage {
    if (typeof page !== "object" || page === null) return false;
    const p = page as Record<string, unknown>;
    return (
      typeof p.slug === "string" && typeof p.filePath === "string" && typeof p.title === "string"
    );
  }

  it("validates an empty manifest", () => {
    expect(validateManifest([])).toBe(true);
  });

  it("validates a single-page manifest", () => {
    const manifest: DocsManifest = [
      {
        slug: "docs/latest/guide",
        filePath: "content/en/guide.md",
        title: "Guide",
        description: "A guide",
        section: "getting-started"
      }
    ];
    expect(validateManifest(manifest)).toBe(true);
  });

  it("rejects a manifest with missing slug", () => {
    const manifest = [{ filePath: "test.md", title: "Test" }];
    expect(validateManifest(manifest)).toBe(false);
  });

  it("rejects a manifest with missing filePath", () => {
    const manifest = [{ slug: "test", title: "Test" }];
    expect(validateManifest(manifest)).toBe(false);
  });

  it("rejects a manifest with missing title", () => {
    const manifest = [{ slug: "test", filePath: "test.md" }];
    expect(validateManifest(manifest)).toBe(false);
  });

  it("rejects non-array input", () => {
    expect(validateManifest({})).toBe(false);
    expect(validateManifest(null)).toBe(false);
    expect(validateManifest("string")).toBe(false);
  });

  it("handles multi-page manifest with optional fields", () => {
    const manifest: DocsManifest = [
      {
        slug: "docs/latest/a",
        filePath: "content/en/a.md",
        title: "Page A"
      },
      {
        slug: "docs/latest/b",
        filePath: "content/en/b.md",
        title: "Page B",
        description: "Page B description",
        section: "reference"
      }
    ];
    expect(validateManifest(manifest)).toBe(true);
  });
});
