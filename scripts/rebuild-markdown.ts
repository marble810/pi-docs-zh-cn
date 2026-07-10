import fs from "node:fs";
import path from "node:path";
import type { TranslationSegment } from "./lib/types.js";
import { restoreTokens } from "./protect-tokens.js";
import { normalizeChinese } from "./normalize-chinese.js";

export interface RebuildResult {
  filePath: string;
  content: string;
}

/**
 * Rebuild translated Markdown content by mapping translated segments back
 * into the original document structure. Restores protected placeholders
 * and applies normalizeChinese on every replaced segment.
 */
export function rebuildMarkdown(
  originalContent: string,
  segments: TranslationSegment[],
  translations: Map<string, string>
): string {
  // Build a map of segment position markers
  const markers: { position: number; length: number; translation: string }[] = [];

  // We need to locate each segment's source in the original content
  for (const seg of segments) {
    const rawTranslation = translations.get(seg.id);
    if (rawTranslation === undefined) continue;

    // Restore protected tokens in the translation
    const translation = restoreTokens(
      normalizeChinese(rawTranslation, seg.protectedTokens),
      seg.protectedTokens
    );

    // Find the source text in the original content (after previous replacements)
    const idx = originalContent.indexOf(seg.source);
    if (idx === -1) {
      // Try normalized source
      const normIdx = originalContent.indexOf(seg.normalizedSource);
      if (normIdx === -1) continue;
      markers.push({
        position: normIdx,
        length: seg.normalizedSource.length,
        translation
      });
    } else {
      markers.push({
        position: idx,
        length: seg.source.length,
        translation
      });
    }
  }

  // Sort markers in reverse order to replace from end to start
  markers.sort((a, b) => b.position - a.position);

  let result = originalContent;
  for (const m of markers) {
    result = result.slice(0, m.position) + m.translation + result.slice(m.position + m.length);
  }

  return result;
}

/**
 * Rebuild and save translated Markdown files.
 */
export function rebuildAndSave(
  files: Map<string, { original: string; segments: TranslationSegment[] }>,
  translations: Map<string, string>,
  outputDir: string
): RebuildResult[] {
  const results: RebuildResult[] = [];

  for (const [filePath, { original, segments }] of files) {
    const content = rebuildMarkdown(original, segments, translations);
    const outputPath = path.join(outputDir, filePath);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content, "utf-8");
    results.push({ filePath, content });
  }

  return results;
}
