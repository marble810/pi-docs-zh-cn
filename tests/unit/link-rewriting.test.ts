import { describe, it, expect } from "vitest";
import { rewriteDocHref } from "../../src/lib/markdown/links";

describe("rewriteDocHref", () => {
  it("strips .md from doc links", () => {
    expect(rewriteDocHref("packages.md")).toBe("/docs/latest/packages");
  });

  it("preserves hash anchors", () => {
    expect(rewriteDocHref("quickstart.md#uninstall")).toBe("/docs/latest/quickstart#uninstall");
  });

  it("maps index.md to docs root", () => {
    expect(rewriteDocHref("index.md")).toBe("/docs/latest/");
  });

  it("prefixes GitHub Pages base path", () => {
    expect(rewriteDocHref("settings.md", "/pi-docs-zh-cn")).toBe(
      "/pi-docs-zh-cn/docs/latest/settings"
    );
    expect(rewriteDocHref("custom-provider.md#oauth", "/pi-docs-zh-cn")).toBe(
      "/pi-docs-zh-cn/docs/latest/custom-provider#oauth"
    );
  });

  it("leaves external and non-md links alone", () => {
    expect(rewriteDocHref("https://example.com/x.md")).toBeNull();
    expect(rewriteDocHref("#section")).toBeNull();
    expect(rewriteDocHref("mailto:a@b.c")).toBeNull();
    expect(rewriteDocHref("/docs/latest/packages")).toBeNull();
    expect(rewriteDocHref("../examples/foo.ts")).toBeNull();
  });
});
