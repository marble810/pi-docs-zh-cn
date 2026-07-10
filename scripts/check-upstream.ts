import { loadUpstreamConfig } from "./lib/config.js";
import { STATE_DIR } from "./lib/paths.js";
import fs from "node:fs";
import path from "node:path";
import type { PublishedUpstream } from "./lib/types.js";

const GITHUB_API = "https://api.github.com";

interface GitHubCommit {
  sha: string;
  commit: { committer: { date: string } };
}

export interface UpstreamCheckResult {
  latestCommit: string;
  latestDate: string;
  publishedCommit: string | null;
  publishedDate: string | null;
  hasChanges: boolean;
}

function loadPublished(): PublishedUpstream | null {
  const p = path.join(STATE_DIR, "published-upstream.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as PublishedUpstream;
}

export async function checkUpstream(): Promise<UpstreamCheckResult> {
  const cfg = loadUpstreamConfig();
  const published = loadPublished();

  const url = `${GITHUB_API}/repos/${cfg.repository}/commits?path=${cfg.docsPath}&sha=${cfg.branch}&per_page=1`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "pi-docs-zh-cn/1.0"
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as GitHubCommit[];
  const latest = body[0];

  return {
    latestCommit: latest.sha,
    latestDate: latest.commit.committer.date,
    publishedCommit: published?.publishedCommit ?? null,
    publishedDate: published?.publishedAt ?? null,
    hasChanges: published ? latest.sha !== published.publishedCommit : true
  };
}

// Allow direct run
if (import.meta.main) {
  const result = await checkUpstream();
  console.log(JSON.stringify(result, null, 2));
}
