#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { checkUpstream } from "./check-upstream.js";
import { computeDiff } from "./diff-upstream.js";
import { fetchUpstream } from "./fetch-upstream.js";
import { extractSegments } from "./extract-segments.js";
import { translateBatches } from "./translate-batches.js";
import { promoteStaging } from "./promote-staging.js";
import { validateContent } from "./validate-content.js";
import { rebuildAndSave } from "./rebuild-markdown.js";
import { STAGING_EN_DIR, STAGING_ZH_DIR, CONTENT_ZH_DIR } from "./lib/paths.js";
import type { TranslationSegment } from "./lib/types.js";

const COMMANDS = ["check", "sync", "resume"] as const;
type Command = (typeof COMMANDS)[number];

interface CliOptions {
  command: Command;
  force: boolean;
  retranslate: boolean;
  apiKey: string | undefined;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const command = args.find((a) => !a.startsWith("--")) as Command | undefined;
  const force = args.includes("--force");
  const retranslate = args.includes("--retranslate");
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!command || !COMMANDS.includes(command as Command)) {
    console.error(`Usage: tsx scripts/cli.ts <${COMMANDS.join("|")}> [--force] [--retranslate]`);
    console.error(`  check   - Check for upstream changes`);
    console.error(`  sync    - Full sync: check, fetch, diff, translate, promote`);
    console.error(`  resume  - Resume a previous sync from checkpoint`);
    process.exit(1);
  }

  return { command: command as Command, force, retranslate, apiKey };
}

async function cmdCheck(options: CliOptions): Promise<void> {
  console.log("🔍 Checking upstream...");

  const result = await checkUpstream();
  console.log(`   Latest commit:  ${result.latestCommit}`);
  console.log(`   Latest date:    ${result.latestDate}`);
  console.log(`   Published:      ${result.publishedCommit ?? "(never)"}`);
  console.log(`   Has changes:    ${result.hasChanges}`);

  if (!result.hasChanges) {
    console.log("✓ No upstream changes detected.");
    return;
  }

  console.log("\n📦 Fetching upstream...");
  const fetchResult = fetchUpstream();
  console.log(`   Commit: ${fetchResult.commit}`);
  console.log(`   Files:  ${fetchResult.files} docs, ${fetchResult.assets} assets`);

  console.log("\n📊 Computing diff...");
  const diffResult = computeDiff();
  const changes = diffResult.changes.filter((c) => c.type !== "unchanged");
  console.log(
    `   Changes: ${changes.length} (${diffResult.stagingFiles} staging, ${diffResult.currentFiles} current)`
  );

  for (const c of changes) {
    if (c.type === "added") console.log(`   + ${c.path}`);
    else if (c.type === "deleted") console.log(`   - ${c.path}`);
    else if (c.type === "modified") console.log(`   ~ ${c.path}`);
    else if (c.type === "renamed") console.log(`   → ${c.from} -> ${c.to}`);
  }

  if (!options.apiKey) {
    console.log("\n⚠ OPENROUTER_API_KEY not set. Skipping translation.");
    console.log("  Set OPENROUTER_API_KEY in .env to run full pipeline.");
    return;
  }

  console.log("\n🌐 Full pipeline requires translation step (use 'sync' command).");
}

async function cmdSync(options: CliOptions): Promise<void> {
  if (!options.apiKey) {
    console.log("⚠ OPENROUTER_API_KEY not set.");
    console.log("  Running check-only mode (detect changes, no translation).");
    await cmdCheck(options);
    return;
  }

  // 1. Check upstream
  console.log("🔍 Step 1: Checking upstream...");
  const upstream = await checkUpstream();
  console.log(`   Commit: ${upstream.latestCommit}`);

  if (!upstream.hasChanges && !options.force) {
    console.log("✓ No changes. Use --force to sync anyway.");
    return;
  }

  // 2. Fetch upstream
  console.log("\n📦 Step 2: Fetching upstream...");
  const fetchResult = fetchUpstream();
  console.log(`   Fetched commit ${fetchResult.commit} (${fetchResult.files} files)`);

  // 3. Diff
  console.log("\n📊 Step 3: Computing diff...");
  const diff = computeDiff();
  const changed = diff.changes.filter((c) => c.type !== "unchanged");
  console.log(`   ${changed.length} changes`);

  // 4. Prepare .work/staging/content/zh-CN
  console.log("\n📁 Step 4: Preparing staging zh-CN...");

  // Ensure staging zh-CN dir exists
  if (!fs.existsSync(STAGING_ZH_DIR)) {
    fs.mkdirSync(STAGING_ZH_DIR, { recursive: true });
  }

  // 4a. Copy all existing content/zh-CN to staging (preserve unchanged zh docs)
  if (fs.existsSync(CONTENT_ZH_DIR)) {
    for (const entry of fs.readdirSync(CONTENT_ZH_DIR, { withFileTypes: true })) {
      const src = path.join(CONTENT_ZH_DIR, entry.name);
      const dest = path.join(STAGING_ZH_DIR, entry.name);
      if (entry.isDirectory()) {
        fs.cpSync(src, dest, { recursive: true, force: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    }
  }

  // 4b. Handle renamed docs: copy old zh path → new zh path
  const renamedChanges = changed.filter((c) => c.type === "renamed");
  for (const rc of renamedChanges) {
    if (rc.type === "renamed") {
      const oldZhPath = path.join(STAGING_ZH_DIR, rc.from);
      const newZhPath = path.join(STAGING_ZH_DIR, rc.to);
      if (fs.existsSync(oldZhPath)) {
        const dir = path.dirname(newZhPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(oldZhPath, newZhPath);
        console.log(`   Preserved renamed: ${rc.from} -> ${rc.to}`);
      }
    }
  }

  // 4c. Handle deleted zh docs (follow en deletions)
  const deletedChanges = changed.filter((c) => c.type === "deleted");
  for (const dc of deletedChanges) {
    if (dc.type === "deleted") {
      const zhPath = path.join(STAGING_ZH_DIR, dc.path);
      if (fs.existsSync(zhPath)) {
        fs.rmSync(zhPath);
        console.log(`   Removed deleted zh: ${dc.path}`);
      }
    }
  }

  // 5. Extract segments from changed files (only natural language; code blocks skipped)
  console.log("\n🔧 Step 5: Extracting segments from changed files...");
  const modifiedFiles = changed
    .filter((c) => c.type === "added" || c.type === "modified")
    .map((c) => (c.type === "added" || c.type === "modified" ? c.path : null))
    .filter(Boolean) as string[];

  // Build map of file -> { original, segments }
  const filesToTranslate = new Map<string, { original: string; segments: TranslationSegment[] }>();

  for (const file of modifiedFiles) {
    const fullPath = path.join(STAGING_EN_DIR, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    const segments = extractSegments(content, file);
    filesToTranslate.set(file, { original: content, segments });
  }

  const allSegments = Array.from(filesToTranslate.values()).flatMap((f) => f.segments);
  console.log(
    `   Extracted ${allSegments.length} natural-language segments from ${modifiedFiles.length} files`
  );

  // 6. Translate
  console.log("\n🌐 Step 6: Translating...");
  const translated = await translateBatches({
    segments: allSegments,
    apiKey: options.apiKey,
    maxRequestsPerRun: parseInt(process.env.OPENROUTER_MAX_REQUESTS_PER_RUN ?? "35", 10),
    onProgress: (done, total) => {
      process.stdout.write(`\r   Progress: ${done}/${total} segments`);
    }
  });
  console.log(`\n   Translated ${translated.length} of ${allSegments.length} segments`);

  // Build translation map
  const translationMap = new Map<string, string>();
  for (const t of translated) {
    translationMap.set(t.segmentId, t.translation);
  }

  // 7. Check if budget exhausted (translation incomplete)
  const allDone = translated.length === allSegments.length;
  if (!allDone) {
    console.log("\n⚠ Budget exhausted — translation incomplete. Saving checkpoint.");
    // Checkpoint already saved inside translateBatches; just report and return
    console.log("   Checkpoint saved. Run 'sync --force' to resume.");
    console.log("   Promotion skipped (not all segments translated).");
    return;
  }

  // 8. Rebuild translated files into staging zh-CN
  console.log("\n🔄 Step 8: Rebuilding translated Markdown...");
  const rebuilt = rebuildAndSave(filesToTranslate, translationMap, STAGING_ZH_DIR);
  console.log(`   Rebuilt ${rebuilt.length} files`);

  // 9. Validate staging content before promotion
  console.log("\n✅ Step 9: Validating staging content...");
  const validation = validateContent(STAGING_EN_DIR, STAGING_ZH_DIR);
  if (validation.valid) {
    console.log("   ✓ Content validation passed");
  } else {
    console.log(`   ⚠ ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
    for (const e of validation.errors.slice(0, 10)) {
      console.log(`   Error: ${e}`);
    }
  }

  // 10. Promote only if all segments translated AND validation passes
  if (allDone && validation.valid) {
    console.log("\n🚀 Step 10: Promoting staging...");
    const promoteResult = promoteStaging();
    console.log(
      `   Promoted: ${promoteResult.enFiles} en, ${promoteResult.zhFiles} zh, ${promoteResult.assets} assets`
    );
    console.log("\n✓ Sync complete.");
  } else {
    if (!allDone) {
      console.log("\n⚠ Promotion skipped: not all segments translated.");
    }
    if (!validation.valid) {
      console.log("\n⚠ Promotion skipped: content validation failed.");
    }
    console.log("   Fix issues and run 'sync' again.");
  }
}

async function cmdResume(options: CliOptions): Promise<void> {
  if (!options.apiKey) {
    console.log("⚠ OPENROUTER_API_KEY not set. Cannot resume translation.");
    process.exit(1);
  }

  const { STATE_DIR } = await import("./lib/paths.js");

  const pendingFile = path.join(STATE_DIR, "pending-sync.json");
  if (!fs.existsSync(pendingFile)) {
    console.log("No pending sync found. Nothing to resume.");
    return;
  }

  const pending = JSON.parse(fs.readFileSync(pendingFile, "utf-8"));
  console.log(
    `Resuming sync: ${pending.completedSegmentIds.length}/${pending.completedSegmentIds.length + pending.remainingSegmentIds.length} segments done`
  );
  console.log(`Status: ${pending.status}`);

  if (pending.status === "completed") {
    console.log("Sync already completed.");
    return;
  }

  console.log("Resume requires re-running 'sync' with --force to re-process remaining segments.");
  console.log("  Run: tsx scripts/cli.ts sync --force");
}

async function main(): Promise<void> {
  const options = parseArgs();

  switch (options.command) {
    case "check":
      await cmdCheck(options);
      break;
    case "sync":
      await cmdSync(options);
      break;
    case "resume":
      await cmdResume(options);
      break;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
