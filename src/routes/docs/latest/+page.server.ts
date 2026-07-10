import { getManifest } from "$lib/server/content";
import { renderMarkdown } from "$lib/markdown/render";
import fs from "node:fs";
import path from "node:path";

/**
 * Load the index page from content/zh-CN/index.md
 */
export async function load() {
  const manifest = getManifest();

  // Try to find the index.md content
  const contentDir = path.resolve("content/zh-CN");
  const indexPath = path.join(contentDir, "index.md");

  let html = "";
  let headings: Array<{ id: string; text: string; depth: 2 | 3 }> = [];

  try {
    const markdown = fs.readFileSync(indexPath, "utf-8");
    const rendered = await renderMarkdown(markdown, "index");
    html = rendered.html;
    headings = rendered.headings;
  } catch {
    // index.md not found yet
  }

  return {
    html,
    headings,
    slug: "index",
    manifest
  };
}
