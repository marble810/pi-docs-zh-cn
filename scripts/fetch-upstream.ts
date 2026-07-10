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

  // Copy to staging — upstream docs are flat .md + images/
  const srcDir = path.join(UPSTREAM_DIR, cfg.docsPath);

  if (fs.existsSync(STAGING_EN_DIR)) fs.rmSync(STAGING_EN_DIR, { recursive: true });
  if (fs.existsSync(STAGING_ASSETS_DIR)) fs.rmSync(STAGING_ASSETS_DIR, { recursive: true });
  fs.mkdirSync(STAGING_EN_DIR, { recursive: true });
  fs.mkdirSync(STAGING_ASSETS_DIR, { recursive: true });

  let files = 0;
  let assets = 0;

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    if (entry.isDirectory()) {
      // Copy asset directories (images/, etc.) to staging assets
      fs.cpSync(s, path.join(STAGING_ASSETS_DIR, entry.name), { recursive: true });
      assets++;
    } else if (
      entry.name.endsWith(".md") ||
      entry.name.endsWith(".mdx") ||
      entry.name.endsWith(".json")
    ) {
      fs.copyFileSync(s, path.join(STAGING_EN_DIR, entry.name));
      files++;
    }
  }

  return { commit, files, assets };
}

if (import.meta.main) {
  const result = fetchUpstream();
  console.log(JSON.stringify(result, null, 2));
}
