import { error } from "@sveltejs/kit";
import { getManifest } from "$lib/server/content";
import { renderMarkdown } from "$lib/markdown/render";
import fs from "node:fs";
import path from "node:path";
import type { EntryGenerator } from "./$types.js";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getManifest()
    .filter((page) => page.slug !== "")
    .map((page) => ({ slug: page.slug }));
};

export async function load({ params }) {
  const slug: string = params.slug;
  const manifest = getManifest();

  // Find the page in the manifest
  const pageData = manifest.find((p) => p.slug === slug || p.slug === slug.replace(/\/$/, ""));
  if (!pageData) {
    error(404, "Page not found");
  }

  // Determine the file path from the manifest or construct it
  let filePath = pageData.filePath;
  if (!filePath) {
    filePath = path.join("content/zh-CN", slug + ".md");
  }

  const fullPath = path.resolve(filePath);

  let html = "";
  let headings: Array<{ id: string; text: string; depth: 2 | 3 }> = [];

  try {
    const markdown = fs.readFileSync(fullPath, "utf-8");
    const rendered = await renderMarkdown(markdown, slug);
    html = rendered.html;
    headings = rendered.headings;
  } catch {
    // Markdown file not found on disk
    error(404, "Page content not found");
  }

  return {
    html,
    headings,
    slug,
    title: pageData.title,
    description: pageData.description,
    manifest
  };
}
