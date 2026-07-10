import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/paths.js";

const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "OpenRouter API Key", re: /sk-or-[a-zA-Z0-9]{20,}/g },
  { name: "Authorization Bearer", re: /Authorization:\s*Bearer\s+[a-zA-Z0-9_.-]{20,}/gi },
  {
    name: "Suspected token value",
    re: /(?:api[_-]?key|token|secret)\s*[:=]\s*["']?[a-zA-Z0-9_.-]{20,}/gi
  }
];

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".svelte-kit",
  "build",
  ".work",
  ".pi-subagents",
  "coverage"
]);

function shouldExclude(dir: string): boolean {
  const basename = path.basename(dir);
  return EXCLUDE_DIRS.has(basename) || basename.startsWith(".");
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (shouldExclude(path.join(dir, entry.name))) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(p));
      } else {
        // Only text files
        const ext = path.extname(entry.name).toLowerCase();
        if (
          [
            ".ts",
            ".js",
            ".json",
            ".yml",
            ".yaml",
            ".md",
            ".mdx",
            ".svelte",
            ".html",
            ".css",
            ".env",
            ".txt",
            ".cfg",
            ".conf",
            ".toml"
          ].includes(ext)
        ) {
          files.push(p);
        }
      }
    }
  } catch {
    // Permission issues
  }
  return files;
}

interface ScanResult {
  findings: {
    file: string;
    pattern: string;
    snippet: string;
    line: number;
  }[];
  exitCode: number;
}

function findSecrets(startDir: string): ScanResult {
  const findings: ScanResult["findings"] = [];
  const files = walkDir(startDir);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const pattern of SECRET_PATTERNS) {
        for (let i = 0; i < lines.length; i++) {
          const matches = lines[i].matchAll(pattern.re);
          for (const match of matches) {
            const val = match[0];
            // Sanitize: show first 8 chars + "..."
            const snippet =
              val.length > 12 ? val.slice(0, 8) + "..." + val.slice(-4) : val.slice(0, 4) + "...";
            findings.push({
              file: path.relative(startDir, file),
              pattern: pattern.name,
              snippet,
              line: i + 1
            });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return {
    findings,
    exitCode: findings.length > 0 ? 1 : 0
  };
}

export function scanSecrets(dir?: string): ScanResult {
  if (dir) return findSecrets(dir);

  const roots = ["src", "static", "content", "state", "build", ".svelte-kit"];
  const findings = roots.flatMap((relative) => {
    const target = path.join(ROOT, relative);
    return fs.existsSync(target) ? findSecrets(target).findings : [];
  });
  return { findings, exitCode: findings.length > 0 ? 1 : 0 };
}

if (import.meta.main) {
  const result = scanSecrets();
  for (const f of result.findings) {
    console.log(`[${f.pattern}] ${f.file}:${f.line} - ${f.snippet}`);
  }
  if (result.findings.length > 0) {
    console.error(`\n⚠ Found ${result.findings.length} potential secrets.`);
  } else {
    console.log("✓ No secrets found.");
  }
  process.exit(result.exitCode);
}
