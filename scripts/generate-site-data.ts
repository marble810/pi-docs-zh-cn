import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_ZH_DIR, GENERATED_DIR, STATIC_DIR, STATE_DIR } from "./lib/paths.js";
import type {
  DocsManifest,
  DocsManifestPage,
  NavigationGroup,
  NavigationItem,
  SearchDocument,
  SyncMetadata
} from "./lib/types.js";

interface ParsedDoc {
  slug: string;
  filePath: string;
  title: string;
  description?: string;
  section?: string;
  headings: string[];
  body: string;
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

function parseDoc(filePath: string, relPath: string): ParsedDoc | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(content);
    const data = parsed.data as Record<string, unknown>;
    const body = parsed.content;

    const relativeSlug = relPath.replace(/\.(md|mdx)$/, "");
    const slug = relativeSlug === "index" ? "" : relativeSlug;
    const title = (data.title as string) ?? relativeSlug.split("/").pop() ?? relativeSlug;
    const description = data.description as string | undefined;
    const sectionSlug = slug ? slug.split("/")[0] : "getting-started";

    // Extract headings
    const headings: string[] = [];
    for (const h of body.matchAll(/^#{2,4}\s+(.+)$/gm)) {
      headings.push(h[1]);
    }

    return {
      slug,
      filePath: path.join("content", "zh-CN", relPath),
      title,
      description,
      section: sectionSlug,
      headings,
      body
    };
  } catch {
    return null;
  }
}

export function generateSiteData(): void {
  const zhFiles = walkDir(CONTENT_ZH_DIR);

  const docs: ParsedDoc[] = [];

  for (const f of zhFiles) {
    const rel = path.relative(CONTENT_ZH_DIR, f);
    const parsed = parseDoc(f, rel);
    if (parsed) docs.push(parsed);
  }

  // Generate docs-manifest.json
  const manifest: DocsManifest = docs.map((d): DocsManifestPage => ({
    slug: d.slug,
    filePath: d.filePath,
    title: d.title,
    description: d.description,
    section: d.section
  }));

  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GENERATED_DIR, "docs-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  // docs.json is the upstream navigation source of truth. Building groups from
  // file paths loses its hierarchy and creates a one-item group for every page.
  const sourceNav = JSON.parse(
    fs.readFileSync(path.join(CONTENT_ZH_DIR, "docs.json"), "utf-8")
  ) as { navigation: Array<{ title: string; items: Array<{ title: string; path: string }> }> };
  const availableSlugs = new Set(docs.map((d) => d.slug));
  const toSlug = (filePath: string) => {
    const slug = filePath.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
    return slug === "index" ? "" : slug;
  };
  const navigation: NavigationGroup[] = sourceNav.navigation
    .map((group) => ({
      id: group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title: group.title,
      items: group.items
        .map((item): NavigationItem => ({ slug: toSlug(item.path), title: item.title }))
        .filter((item) => availableSlugs.has(item.slug))
    }))
    .filter((group) => group.items.length > 0);

  fs.writeFileSync(
    path.join(GENERATED_DIR, "navigation.json"),
    JSON.stringify(navigation, null, 2),
    "utf-8"
  );

  // Generate search-index.json
  const searchIndex: SearchDocument[] = docs
    .filter((d) => d.slug !== "")
    .map((d) => ({
      id: d.slug,
      slug: d.slug,
      title: d.title,
      section: d.section ?? "",
      headings: d.headings.join(" "),
      body: d.body.slice(0, 5000)
    }));

  const searchIndexJson = JSON.stringify(searchIndex, null, 2);
  fs.writeFileSync(path.join(GENERATED_DIR, "search-index.json"), searchIndexJson, "utf-8");
  fs.writeFileSync(path.join(STATIC_DIR, "search-index.json"), searchIndexJson, "utf-8");

  // Generate sync-metadata.json from the published state. Never use the
  // current time here: a no-op build must not dirty generated source files.
  let published: { publishedCommit?: string; publishedAt?: string } = {};
  const publishedPath = path.join(STATE_DIR, "published-upstream.json");
  if (fs.existsSync(publishedPath)) {
    try {
      published = JSON.parse(fs.readFileSync(publishedPath, "utf-8")) as typeof published;
    } catch {
      // Bootstrap state remains empty until the first complete promotion.
    }
  }
  const syncMeta: SyncMetadata = {
    upstreamCommit: published.publishedCommit ?? "",
    publishedAt: published.publishedAt ?? "",
    sourceSite: "https://pi.dev/docs/latest",
    targetLocale: "zh-CN"
  };

  fs.writeFileSync(
    path.join(GENERATED_DIR, "sync-metadata.json"),
    JSON.stringify(syncMeta, null, 2),
    "utf-8"
  );

  console.log(
    `Generated site data: ${manifest.length} pages, ${navigation.length} nav groups, ${searchIndex.length} search docs`
  );
}

if (import.meta.main) {
  generateSiteData();
}
