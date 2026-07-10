import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONTENT_EN_DIR, STAGING_EN_DIR } from "./lib/paths.js";
import type { FileChange } from "./lib/types.js";

function sha256(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(p));
    } else {
      files.push(p);
    }
  }
  return files;
}

function relativePath(base: string, full: string): string {
  return path.relative(base, full);
}

export interface DiffResult {
  changes: FileChange[];
  stagingFiles: number;
  currentFiles: number;
}

export function computeDiff(): DiffResult {
  const stagingFiles = walkDir(STAGING_EN_DIR);
  const currentFiles = walkDir(CONTENT_EN_DIR);

  const stagingMap = new Map<string, string>();
  const currentMap = new Map<string, string>();

  for (const f of stagingFiles) {
    const rel = relativePath(STAGING_EN_DIR, f);
    const h = sha256(f);
    if (h) stagingMap.set(rel, h);
  }
  for (const f of currentFiles) {
    const rel = relativePath(CONTENT_EN_DIR, f);
    const h = sha256(f);
    if (h) currentMap.set(rel, h);
  }

  const changes: FileChange[] = [];
  const allPaths = new Set([...stagingMap.keys(), ...currentMap.keys()]);

  // Detect renames: a deleted file + an added file with same hash
  const deletedHashes = new Map<string, string[]>();
  const addedHashes = new Map<string, string[]>();

  for (const p of allPaths) {
    const stagingHash = stagingMap.get(p);
    const currentHash = currentMap.get(p);

    if (stagingHash && !currentHash) {
      // Added in staging
      const arr = addedHashes.get(stagingHash) ?? [];
      arr.push(p);
      addedHashes.set(stagingHash, arr);
    } else if (!stagingHash && currentHash) {
      // Deleted from staging
      const arr = deletedHashes.get(currentHash) ?? [];
      arr.push(p);
      deletedHashes.set(currentHash, arr);
    } else if (stagingHash && currentHash && stagingHash !== currentHash) {
      changes.push({ type: "modified", path: p });
    } else if (stagingHash && currentHash && stagingHash === currentHash) {
      changes.push({ type: "unchanged", path: p });
    }
  }

  // Match deleted + added with same hash as renames
  const matchedDeletions = new Set<string>();
  const matchedAdditions = new Set<string>();

  for (const [hash, added] of addedHashes) {
    const deleted = deletedHashes.get(hash);
    if (deleted) {
      const min = Math.min(added.length, deleted.length);
      for (let i = 0; i < min; i++) {
        changes.push({ type: "renamed", from: deleted[i], to: added[i] });
        matchedDeletions.add(deleted[i]);
        matchedAdditions.add(added[i]);
      }
    }
  }

  // Remaining deletions
  for (const [, paths] of deletedHashes) {
    for (const p of paths) {
      if (!matchedDeletions.has(p)) {
        changes.push({ type: "deleted", path: p });
      }
    }
  }

  // Remaining additions
  for (const [, paths] of addedHashes) {
    for (const p of paths) {
      if (!matchedAdditions.has(p)) {
        changes.push({ type: "added", path: p });
      }
    }
  }

  return { changes, stagingFiles: stagingFiles.length, currentFiles: currentFiles.length };
}

if (import.meta.main) {
  const result = computeDiff();
  console.log(JSON.stringify(result, null, 2));
}
