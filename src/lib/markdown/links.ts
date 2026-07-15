import { visit } from "unist-util-visit";
import type { Root } from "hast";

/**
 * Rewrite internal .md links to /docs/latest/<slug> and relative images to /docs-assets/.
 * Operates on HAST tree after remark-rehype.
 */
export function rewriteDocLinks() {
  return function transform(tree: Root): void {
    visit(tree, "element", (node) => {
      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        const rewritten = rewriteDocHref(node.properties.href as string);
        if (rewritten !== null) node.properties.href = rewritten;
      }
      if (node.tagName === "img" && typeof node.properties?.src === "string") {
        const src = node.properties.src as string;
        if (!src.startsWith("http") && !src.startsWith("/") && !src.startsWith("data:")) {
          node.properties.src = `/docs-assets/${src}`;
        }
      }
    });
  };
}

/** Pure rewrite for unit tests. Returns null when href should stay as-is. */
export function rewriteDocHref(href: string): string | null {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("//") ||
    href.startsWith("/")
  ) {
    return null;
  }

  // packages.md, packages.md#uninstall, path/to.md?x=1
  const m = href.match(/^([^#?]*?)\.mdx?([#?].*)?$/);
  if (!m) return null;

  let path = m[1];
  // leave repo-relative escapes alone (../examples/...)
  if (path === ".." || path.startsWith("../") || path.includes("/../")) return null;

  path = path.replace(/\/index$/, "").replace(/^index$/, "");
  const route = path ? `/docs/latest/${path}` : "/docs/latest/";
  return route + (m[2] ?? "");
}
