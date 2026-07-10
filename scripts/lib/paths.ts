import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, "../..");
export const CONFIG_DIR = path.join(ROOT, "config");
export const CONTENT_DIR = path.join(ROOT, "content");
export const CONTENT_EN_DIR = path.join(CONTENT_DIR, "en");
export const CONTENT_ZH_DIR = path.join(CONTENT_DIR, "zh-CN");
export const STATE_DIR = path.join(ROOT, "state");
export const STATIC_DIR = path.join(ROOT, "static");
export const ASSETS_DIR = path.join(STATIC_DIR, "docs-assets");
export const WORK_DIR = path.join(ROOT, ".work");
export const STAGING_DIR = path.join(WORK_DIR, "staging");
export const STAGING_EN_DIR = path.join(STAGING_DIR, "content/en");
export const STAGING_ZH_DIR = path.join(STAGING_DIR, "content/zh-CN");
export const STAGING_ASSETS_DIR = path.join(STAGING_DIR, "static/docs-assets");
export const UPSTREAM_DIR = path.join(WORK_DIR, "upstream");
export const GENERATED_DIR = path.join(ROOT, "src/lib/generated");
