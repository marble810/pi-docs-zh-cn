import { visit } from "unist-util-visit";
import type { Root } from "hast";

/**
 * Rewrite internal .md links to /docs/latest/<slug>/ and image paths to base.
 * Operates on HAST tree after remark-rehype.
 */
export function rewriteDocLinks(slug: string | undefined) {
  void slug;
  // ponytail: simple anchor rewrite; a full route resolver can replace this
  return function transform(tree: Root): void {
    visit(tree, "element", (node) => {
      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        const href = node.properties.href as string;
        const url = tryParse(href);
        if (!url) return;
        // Internal .md links or paths without protocol
        if (
          !url.protocol &&
          (href.endsWith(".md") ||
            (!href.startsWith("#") && !href.startsWith("http") && !href.startsWith("/")))
        ) {
          const path = href.replace(/\.md$/, "").replace(/index$/, "");
          node.properties.href = `/docs/latest/${path}`;
        }
      }
      if (node.tagName === "img" && typeof node.properties?.src === "string") {
        const src = node.properties.src as string;
        if (!src.startsWith("http") && !src.startsWith("/")) {
          // Relative image path — map to docs-assets base-aware
          // ponytail: assumes base path aware; base is prepended at render time
          node.properties.src = `/docs-assets/${src}`;
        }
      }
    });
  };
}

function tryParse(url: string): URL | null {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return null;
  }
}
