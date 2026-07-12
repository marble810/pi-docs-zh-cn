import { loadUpstreamConfig } from "./lib/config.js";
import { STATE_DIR } from "./lib/paths.js";
import fs from "node:fs";
import path from "node:path";
import type { PublishedUpstream } from "./lib/types.js";

const GITHUB_API = "https://api.github.com";

interface GitHubRelease {
  tag_name: string;
}

export interface ReleaseCheckResult {
  latestTag: string;
  publishedTag: string | null;
  hasNewRelease: boolean;
}

function loadPublished(): PublishedUpstream | null {
  const file = path.join(STATE_DIR, "published-upstream.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as PublishedUpstream;
}

export async function checkRelease(): Promise<ReleaseCheckResult> {
  const cfg = loadUpstreamConfig();
  const published = loadPublished();
  const res = await fetch(`${GITHUB_API}/repos/${cfg.repository}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "pi-docs-zh-cn/1.0"
    }
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const latest = (await res.json()) as GitHubRelease;
  return {
    latestTag: latest.tag_name,
    publishedTag: published?.releaseTag ?? null,
    hasNewRelease: latest.tag_name !== published?.releaseTag
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(await checkRelease(), null, 2));
}
