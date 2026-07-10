import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { createHighlighter } from "shiki";
import { visit } from "unist-util-visit";
import { rewriteDocLinks } from "./links.js";
import { extractHeadings } from "./headings.js";
import { sanitizeSchema } from "./sanitize.js";
import type { RenderedContent } from "./types.js";

// ponytail: singleton highlighter, re-create if theme/language set grows
let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "typescript",
        "javascript",
        "python",
        "bash",
        "shell",
        "json",
        "yaml",
        "markdown",
        "html",
        "css",
        "rust",
        "go",
        "sql",
        "diff"
      ]
    });
  }
  return highlighter;
}

/** Simple inline node-to-string */
function nodeText(node: Record<string, unknown>): string {
  if (node.type === "text") return (node.value as string) ?? "";
  if (node.children && Array.isArray(node.children)) {
    return node.children.map((c) => nodeText(c as Record<string, unknown>)).join("");
  }
  return "";
}

/**
 * Render markdown content into HTML with syntax highlighting and heading IDs.
 * Optionally rewrites internal links to docs routes.
 */
export async function renderMarkdown(markdown: string, slug?: string): Promise<RenderedContent> {
  const hl = await getHighlighter();

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rewriteDocLinks(slug) as never)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeSanitize as never, sanitizeSchema)
    .use(function shikiPlugin() {
      return (tree: Record<string, unknown>) => {
        visit(
          tree as never,
          "element",
          (
            node: Record<string, unknown>,
            index: number | undefined,
            parent: Record<string, unknown> | undefined
          ) => {
            if (
              node.tagName === "pre" &&
              Array.isArray(node.children) &&
              node.children[0]?.type === "element" &&
              (node.children[0] as Record<string, unknown>).tagName === "code"
            ) {
              const codeNode = node.children[0] as Record<string, unknown>;
              const className = (codeNode.properties as Record<string, unknown>)?.className as
                string[] | undefined;
              const langAttr = (className?.[0] ?? "").replace(/^language-/, "");
              const code = nodeText(codeNode);
              const html = hl.codeToHtml(code, {
                lang: langAttr || "text",
                themes: {
                  light: "github-light",
                  dark: "github-dark"
                }
              });
              if (parent && index !== undefined && Array.isArray(parent.children)) {
                parent.children[index] = { type: "raw", value: html } as never;
              }
            }
          }
        );
      };
    } as never)
    .use(rehypeStringify);

  const file = await processor.process(markdown);
  const html = String(file);
  const headings = extractHeadings(html);

  return { html, headings };
}
