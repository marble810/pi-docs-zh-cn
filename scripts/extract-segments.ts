import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, Heading, List, Table, Node } from "mdast";
import type { TranslationSegment } from "./lib/types.js";
import { protectTokens, resetCounters } from "./protect-tokens.js";
import { hashString } from "./lib/config.js";

export function resetSegmentCounter(): void {
  // no-op; retained for API compatibility
}

function buildSectionPath(headings: string[]): string[] {
  return headings.filter(Boolean).map((h) => h.toLowerCase().replace(/\s+/g, "-"));
}

function stableSegmentId(
  filePath: string,
  sectionPath: string[],
  nodeType: string,
  normalizedSource: string,
  occurrence: number
): string {
  const raw = `${filePath}::${sectionPath.join("/")}::${nodeType}::${normalizedSource}::${occurrence}`;
  return hashString(raw);
}

interface HeadingInfo {
  depth: number;
  text: string;
}

function extractText(node: Node): string {
  if (node.type === "text" || node.type === "inlineCode") {
    return (node as unknown as { value: string }).value;
  }
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map(extractText).join("");
  }
  return "";
}

export function extractSegments(content: string, filePath: string): TranslationSegment[] {
  resetCounters();

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .parse(content) as Root;

  const children = tree.children.filter((n) => n.type !== "yaml");

  const headingStack: HeadingInfo[] = [];
  const segments: TranslationSegment[] = [];

  function getSectionPath(): string[] {
    return headingStack.slice(1).map((h) => h.text);
  }

  function addSegment(node: Node, nodeType: string): void {
    const children = "children" in node && Array.isArray(node.children) ? node.children : [];
    const sourceStart = children[0]?.position?.start.offset ?? node.position?.start.offset;
    const sourceEnd = children.at(-1)?.position?.end.offset ?? node.position?.end.offset;
    if (sourceStart === undefined || sourceEnd === undefined) return;

    const source = content.slice(sourceStart, sourceEnd);
    if (!source.trim()) return;
    const { text: normalizedSource, tokens } = protectTokens(source);
    const sectionPath = getSectionPath();
    const occurrence = segments.filter(
      (s) => s.nodeType === nodeType && s.sectionPath.join("/") === sectionPath.join("/")
    ).length;
    const id = stableSegmentId(filePath, sectionPath, nodeType, normalizedSource, occurrence);

    segments.push({
      id,
      filePath,
      nodeType,
      sectionPath,
      source,
      normalizedSource,
      sourceStart,
      sourceEnd,
      sourceHash: hashString(normalizedSource),
      contextHash: hashString(`${filePath}::${sectionPath.join("/")}::${nodeType}`),
      protectedTokens: tokens
    });
  }

  for (const node of children) {
    if (node.type === "heading") {
      const h = node as Heading;
      const text = extractText(h);
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].depth >= h.depth) {
        headingStack.pop();
      }
      headingStack.push({ depth: h.depth, text });
      addSegment(h, "heading");
    } else if (node.type === "paragraph") {
      addSegment(node, "paragraph");
    } else if (node.type === "list") {
      const list = node as List;
      for (const item of list.children || []) {
        addSegment(item, "listItem");
      }
    } else if (node.type === "table") {
      const table = node as Table;
      for (const row of table.children || []) {
        for (const cell of row.children || []) {
          addSegment(cell, "tableCell");
        }
      }
    } else if (node.type === "code") {
      // Skip fenced code blocks — never translate code
      continue;
    } else if (node.type === "blockquote") {
      addSegment(node, "blockquote");
    }
  }

  void buildSectionPath;

  return segments;
}

export { extractText };
