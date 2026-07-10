import { loadUpstreamConfig } from "./lib/config.js";
import { UPSTREAM_DIR, STAGING_EN_DIR, STAGING_ASSETS_DIR } from "./lib/paths.js";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export interface FetchResult {
  commit: string;
  files: number;
  assets: number;
}

export function fetchUpstream(): FetchResult {
  const cfg = loadUpstreamConfig();

  // Clean and recreate upstream dir
  if (fs.existsSync(UPSTREAM_DIR)) {
    fs.rmSync(UPSTREAM_DIR, { recursive: true });
  }
  fs.mkdirSync(UPSTREAM_DIR, { recursive: true });

  const repoUrl = `https://github.com/${cfg.repository}.git`;

  execSync("git init", { cwd: UPSTREAM_DIR, stdio: "pipe" });
  execSync(`git remote add origin ${repoUrl}`, { cwd: UPSTREAM_DIR, stdio: "pipe" });

  // Sparse checkout - only the docsPath
  execSync("git sparse-checkout init --cone", { cwd: UPSTREAM_DIR, stdio: "pipe" });
  execSync(`git sparse-checkout set "${cfg.docsPath}"`, { cwd: UPSTREAM_DIR, stdio: "pipe" });
  execSync(`git fetch --depth 1 origin ${cfg.branch}`, { cwd: UPSTREAM_DIR, stdio: "pipe" });
  execSync("git checkout FETCH_HEAD", { cwd: UPSTREAM_DIR, stdio: "pipe" });

  const commit = execSync("git rev-parse HEAD", { cwd: UPSTREAM_DIR, encoding: "utf-8" }).trim();

  // Copy to staging
  const srcDir = path.join(UPSTREAM_DIR, cfg.docsPath);

  if (fs.existsSync(STAGING_EN_DIR)) {
    fs.rmSync(STAGING_EN_DIR, { recursive: true });
  }
  if (fs.existsSync(STAGING_ASSETS_DIR)) {
    fs.rmSync(STAGING_ASSETS_DIR, { recursive: true });
  }
  fs.mkdirSync(STAGING_EN_DIR, { recursive: true });
  fs.mkdirSync(STAGING_ASSETS_DIR, { recursive: true });

  let files = 0;
  let assets = 0;

  function copyDir(src: string, dest: string, isAssets: boolean): void {
    if (!fs.existsSync(src)) return;
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        fs.mkdirSync(d, { recursive: true });
        copyDir(s, d, isAssets);
      } else {
        fs.copyFileSync(s, d);
        if (isAssets) assets++;
        else files++;
      }
    }
  }

  // Copy content/en docs
  const contentSrc = path.join(srcDir, "content", "en");
  const docsAssetsSrc = path.join(srcDir, "static", "docs-assets");

  copyDir(contentSrc, STAGING_EN_DIR, false);
  copyDir(docsAssetsSrc, STAGING_ASSETS_DIR, true);

  return { commit, files, assets };
}

if (import.meta.main) {
  const result = fetchUpstream();
  console.log(JSON.stringify(result, null, 2));
}
