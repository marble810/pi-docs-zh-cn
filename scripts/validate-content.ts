import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_EN_DIR, CONTENT_ZH_DIR } from "./lib/paths.js";
export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    enFiles: number;
    zhFiles: number;
    missingTranslations: number;
    codeBlockMismatches: number;
    invalidFrontmatter: number;
    brokenInternalLinks: number;
    remainingPlaceholders: number;
  };
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(p));
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      files.push(p);
    }
  }
  return files;
}

export function validateContent(enDir?: string, zhDir?: string): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const enDirResolved = enDir ?? CONTENT_EN_DIR;
  const zhDirResolved = zhDir ?? CONTENT_ZH_DIR;

  const enFiles = walkDir(enDirResolved);
  const zhFiles = walkDir(zhDirResolved);

  const enRelative = new Set(enFiles.map((f) => path.relative(enDirResolved, f)));
  const zhRelative = new Set(zhFiles.map((f) => path.relative(zhDirResolved, f)));

  // 1. Every en file should have zh counterpart
  let missingTranslations = 0;
  for (const rel of enRelative) {
    if (!zhRelative.has(rel)) {
      missingTranslations++;
      warnings.push(`Missing zh-CN translation: ${rel}`);
    }
  }

  // 2. Parse zh files for validation
  let invalidFrontmatter = 0;
  const codeBlockMismatches = 0;
  let brokenInternalLinks = 0;
  let remainingPlaceholders = 0;

  const allAnchors = new Map<string, Set<string>>();
  const allPaths = new Set<string>();

  // Collect all zh paths and anchors (use resolved dir so staging validation works)
  for (const f of zhFiles) {
    const rel = path.relative(zhDirResolved, f);
    allPaths.add(rel);
    const content = fs.readFileSync(f, "utf-8");
    const anchors = new Set<string>();

    // Extract headings as anchors
    for (const h of content.matchAll(/^#{1,6}\s+(.+)$/gm)) {
      const anchor = h[1]
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
        .replace(/\s+/g, "-");
      anchors.add(anchor);
    }
    allAnchors.set(rel, anchors);

    // Check frontmatter
    try {
      matter(content);
    } catch {
      errors.push(`Invalid frontmatter in ${rel}`);
      invalidFrontmatter++;
    }

    // Check remaining placeholders {{...}}
    const phs = content.match(/\{\{[A-Z_]+_\d+\}\}/g);
    if (phs) {
      remainingPlaceholders += phs.length;
    }
  }

  // 3. Validate internal links in zh files
  const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
  for (const f of zhFiles) {
    const rel = path.relative(zhDirResolved, f);
    const content = fs.readFileSync(f, "utf-8");
    const dir = path.dirname(rel);

    for (const match of content.matchAll(LINK_RE)) {
      const href = match[2];
      if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) continue;

      // Resolve relative link
      const resolved = href.startsWith("/") ? href.slice(1) : path.normalize(path.join(dir, href));

      // Check if target exists (strip anchor)
      const [targetPath, anchor] = resolved.split("#");
      if (targetPath) {
        const ext = path.extname(targetPath.replace(/\/+$/, ""));
        const escapesContent =
          targetPath === ".." ||
          targetPath.startsWith("../") ||
          targetPath.includes("/../") ||
          targetPath.endsWith("/");
        // Outside the docs content tree, or directory / non-doc resource links
        // (upstream examples/source). Do not force-append .md or fail existence.
        if (escapesContent || (ext && ext !== ".md" && ext !== ".mdx")) {
          // skip existence check
        } else {
          const targetRel =
            ext === ".md" || ext === ".mdx" ? targetPath : `${targetPath.replace(/\/+$/, "")}.md`;
          if (!allPaths.has(targetRel) && !allPaths.has(targetPath)) {
            // Try also checking in en content tree
            const enTarget = path.join(enDirResolved, targetRel);
            if (!fs.existsSync(enTarget)) {
              // Same unresolved href in EN = upstream illustrative/external link, not a translation defect
              const enSource = path.join(enDirResolved, rel);
              const upstreamSame =
                fs.existsSync(enSource) &&
                fs.readFileSync(enSource, "utf-8").includes(`](${href})`);
              if (upstreamSame) {
                warnings.push(
                  `Unresolved upstream link in ${rel}: -> ${href} (resolved: ${targetRel})`
                );
              } else {
                brokenInternalLinks++;
                errors.push(`Broken link in ${rel}: -> ${href} (resolved: ${targetRel})`);
              }
            }
          }
        }
      }

      // Check anchor exists (only for doc targets)
      if (anchor && allAnchors.get(targetPath) && !allAnchors.get(targetPath)!.has(anchor)) {
        warnings.push(`Broken anchor in ${rel}: #${anchor} not found in ${targetPath}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      enFiles: enFiles.length,
      zhFiles: zhFiles.length,
      missingTranslations,
      codeBlockMismatches,
      invalidFrontmatter,
      brokenInternalLinks,
      remainingPlaceholders
    }
  };
}

if (import.meta.main) {
  const result = validateContent();
  console.log(JSON.stringify(result, null, 2));
}
