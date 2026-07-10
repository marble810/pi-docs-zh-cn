import fs from "node:fs";
import path from "node:path";
import {
  STAGING_EN_DIR,
  STAGING_ZH_DIR,
  STAGING_ASSETS_DIR,
  STAGING_DIR,
  CONTENT_EN_DIR,
  CONTENT_ZH_DIR,
  STATE_DIR,
  ASSETS_DIR
} from "./lib/paths.js";
import type { PublishedUpstream } from "./lib/types.js";
import { loadUpstreamConfig } from "./lib/config.js";

export interface PromoteResult {
  enFiles: number;
  zhFiles: number;
  assets: number;
  commit: string;
}

function copyRecursive(src: string, dest: string): number {
  if (!fs.existsSync(src)) return 0;
  let count = 0;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

/**
 * Atomically promote staging to content directories.
 * Uses a temp dir and rename for atomicity on supported filesystems.
 */
export function promoteStaging(): PromoteResult {
  const cfg = loadUpstreamConfig();

  // Read commit from upstream
  const commitPath = path.join(STAGING_DIR, "..", "upstream", ".git", "HEAD");
  let commit = "unknown";
  if (fs.existsSync(commitPath)) {
    commit = fs.readFileSync(commitPath, "utf-8").trim();
  }

  // Promote content/en
  let enFiles = 0;
  if (fs.existsSync(STAGING_EN_DIR)) {
    const tmp = path.join(STAGING_DIR, "..", "_tmp_en");
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
    copyRecursive(STAGING_EN_DIR, tmp);
    if (fs.existsSync(CONTENT_EN_DIR)) fs.rmSync(CONTENT_EN_DIR, { recursive: true });
    fs.renameSync(tmp, CONTENT_EN_DIR);
    enFiles = countFiles(CONTENT_EN_DIR);
  }

  // Promote content/zh-CN
  let zhFiles = 0;
  if (fs.existsSync(STAGING_ZH_DIR)) {
    const tmp = path.join(STAGING_DIR, "..", "_tmp_zh");
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
    copyRecursive(STAGING_ZH_DIR, tmp);
    if (fs.existsSync(CONTENT_ZH_DIR)) fs.rmSync(CONTENT_ZH_DIR, { recursive: true });
    fs.renameSync(tmp, CONTENT_ZH_DIR);
    zhFiles = countFiles(CONTENT_ZH_DIR);
  }

  // Promote static/docs-assets
  let assets = 0;
  if (fs.existsSync(STAGING_ASSETS_DIR)) {
    const tmp = path.join(STAGING_DIR, "..", "_tmp_assets");
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true });
    copyRecursive(STAGING_ASSETS_DIR, tmp);
    if (fs.existsSync(ASSETS_DIR)) fs.rmSync(ASSETS_DIR, { recursive: true });
    fs.renameSync(tmp, ASSETS_DIR);
    assets = countFiles(ASSETS_DIR);
  }

  // Update published-upstream.json
  const published: PublishedUpstream = {
    repository: cfg.repository,
    branch: cfg.branch,
    docsPath: cfg.docsPath,
    publishedCommit: commit,
    publishedAt: new Date().toISOString(),
    files: {}
  };

  const stateDir = STATE_DIR;
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, "published-upstream.json"),
    JSON.stringify(published, null, 2),
    "utf-8"
  );

  return { enFiles, zhFiles, assets, commit };
}

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(p);
    } else {
      count++;
    }
  }
  return count;
}

if (import.meta.main) {
  const result = promoteStaging();
  console.log(JSON.stringify(result, null, 2));
}
