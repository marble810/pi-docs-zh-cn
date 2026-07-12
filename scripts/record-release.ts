import fs from "node:fs";
import path from "node:path";
import { STATE_DIR } from "./lib/paths.js";
import type { PublishedUpstream } from "./lib/types.js";

const tag = process.argv[2];
if (!tag) throw new Error("Usage: tsx scripts/record-release.ts <tag>");

const file = path.join(STATE_DIR, "published-upstream.json");
const published = JSON.parse(fs.readFileSync(file, "utf-8")) as PublishedUpstream;
published.releaseTag = tag;
fs.writeFileSync(file, `${JSON.stringify(published, null, 2)}\n`, "utf-8");
console.log(`Recorded release ${tag}`);
