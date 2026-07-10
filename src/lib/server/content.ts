import type {
  DocsManifest,
  DocsManifestPage,
  NavigationGroup,
  SearchDocument,
  SyncMetadata
} from "../../../scripts/lib/types.js";

// Generated data is imported as JSON (static analysis enables prerender)
// The files are produced by scripts/generate-site-data.ts
import docsManifestJson from "$lib/generated/docs-manifest.json";
import navJson from "$lib/generated/navigation.json";
import searchIndexJson from "$lib/generated/search-index.json";
import syncMetaJson from "$lib/generated/sync-metadata.json";

const manifest: DocsManifest = docsManifestJson as DocsManifest;
const navigation: NavigationGroup[] = navJson as NavigationGroup[];
const searchDocs: SearchDocument[] = searchIndexJson as SearchDocument[];
const syncMetadata: SyncMetadata = {
  upstreamCommit: ((syncMetaJson as Record<string, unknown>)?.upstreamCommit as string) ?? "",
  publishedAt: ((syncMetaJson as Record<string, unknown>)?.publishedAt as string) ?? "",
  sourceSite: ((syncMetaJson as Record<string, unknown>)?.sourceSite as string) ?? "",
  targetLocale: ((syncMetaJson as Record<string, unknown>)?.targetLocale as string) ?? "",
  lastModelUsed: (syncMetaJson as Record<string, unknown>)?.lastModelUsed as string | undefined
};

/** Build a map of slug -> page for quick lookup */
const pageMap = new Map<string, DocsManifestPage>();
for (const page of manifest) {
  pageMap.set(page.slug, page);
  pageMap.set(page.slug + "/", page);
}

export function getManifest(): DocsManifest {
  return manifest;
}

export function getNavigation(): NavigationGroup[] {
  return navigation;
}

export function getSearchIndex(): SearchDocument[] {
  return searchDocs;
}

export function getSyncMetadata(): SyncMetadata {
  return syncMetadata;
}

export function getPage(slug: string): DocsManifestPage | undefined {
  return pageMap.get(slug) || pageMap.get(slug.replace(/\/$/, ""));
}

export function getPageByFilePath(filePath: string): DocsManifestPage | undefined {
  return manifest.find((p) => p.filePath === filePath);
}

export function getAllSlugs(): string[] {
  return manifest.map((p) => p.slug);
}
