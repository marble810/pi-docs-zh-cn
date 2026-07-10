import type { Heading } from "./types.js";

/**
 * Generate a slug for a heading from its text content.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract headings from rendered HTML headings for TOC construction.
 */
export function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  const regex = /<h([2-3])\s+id="([^"]+)"[^>]*>(.*?)<\/h[2-3]>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const depth = parseInt(match[1], 10) as 2 | 3;
    const id = match[2];
    const text = match[3].replace(/<[^>]*>/g, "");
    headings.push({ id, text, depth });
  }
  return headings;
}
