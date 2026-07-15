import { visit } from "unist-util-visit";
import { parseBilingualTitle } from "../bilingual.js";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
};

function plainText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map(plainText).join("");
}

function isHeadingAnchor(node: HastNode): boolean {
  if (node.type !== "element" || node.tagName !== "a") return false;
  const cls = node.properties?.className;
  if (Array.isArray(cls)) return cls.includes("heading-anchor");
  return typeof cls === "string" && cls.split(/\s+/).includes("heading-anchor");
}

function bilingualChildren(zh: string, en: string): HastNode[] {
  return [
    {
      type: "element",
      tagName: "span",
      properties: { className: ["bilingual-title__zh"] },
      children: [{ type: "text", value: zh }]
    },
    {
      type: "element",
      tagName: "span",
      properties: { className: ["bilingual-title__sep"] },
      children: [{ type: "text", value: "|" }]
    },
    {
      type: "element",
      tagName: "span",
      properties: { className: ["bilingual-title__en"] },
      children: [{ type: "text", value: en }]
    }
  ];
}

function addClass(node: HastNode, ...names: string[]) {
  const props = (node.properties ??= {});
  const existing = Array.isArray(props.className)
    ? (props.className as string[])
    : props.className
      ? [String(props.className)]
      : [];
  for (const n of names) {
    if (!existing.includes(n)) existing.push(n);
  }
  props.className = existing;
}

/**
 * Turn H1 text `中文｜English` into bilingual span structure for the page title block.
 * Preserves a trailing `.heading-anchor` link if present.
 */
export function rehypeBilingualH1() {
  return (tree: HastNode) => {
    visit(tree as never, "element", (node: HastNode) => {
      if (node.tagName !== "h1" || !node.children?.length) return;

      const kids = node.children;
      const anchor = kids.find(isHeadingAnchor);
      const bodyNodes = kids.filter((c) => !isHeadingAnchor(c));
      if (!bodyNodes.length) return;

      const text = bodyNodes.map(plainText).join("").trim();
      const { zh, en } = parseBilingualTitle(text);
      if (!en) return;

      addClass(node, "bilingual-title", "bilingual-title--display");
      node.children = anchor ? [...bilingualChildren(zh, en), anchor] : bilingualChildren(zh, en);
    });
  };
}
