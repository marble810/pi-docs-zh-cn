import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_ZH_DIR, GENERATED_DIR, STATIC_DIR } from "./lib/paths.js";
import type {
  DocsManifest,
  DocsManifestPage,
  NavigationGroup,
  NavigationItem,
  SearchDocument,
  SyncMetadata
} from "./lib/types.js";
import { loadNavigationOverrides } from "./lib/config.js";

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

  // Generate navigation.json
  const navOverrides = loadNavigationOverrides();
  const sections = new Map<string, ParsedDoc[]>();
  for (const d of docs) {
    const section = d.section ?? "other";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push(d);
  }

  const navigation: NavigationGroup[] = [];
  for (const [sectionId, sectionDocs] of sections) {
    const groupTitle = navOverrides.groups[sectionId]?.title ?? sectionId;
    const items: NavigationItem[] = sectionDocs
      .filter((d) => d.slug !== "")
      .map((d) => ({
        slug: d.slug,
        title: d.title
      }));
    if (items.length === 0) continue;
    navigation.push({ id: sectionId, title: groupTitle, items });
  }

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

  // Generate sync-metadata.json
  const syncMeta: SyncMetadata = {
    upstreamCommit: "",
    publishedAt: new Date().toISOString(),
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
