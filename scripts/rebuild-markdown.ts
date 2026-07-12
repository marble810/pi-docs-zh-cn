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
  const markers: { position: number; length: number; translation: string; id: string }[] = [];
  const nextSearchPosition = new Map<string, number>();

  for (const seg of segments) {
    const rawTranslation = translations.get(seg.id);
    if (rawTranslation === undefined || !rawTranslation.trim()) {
      throw new Error(`Missing or empty translation for segment ${seg.id}`);
    }

    const translation = restoreTokens(
      normalizeChinese(rawTranslation, seg.protectedTokens),
      seg.protectedTokens
    );

    let position = seg.sourceStart;
    if (
      position === undefined ||
      seg.sourceEnd === undefined ||
      originalContent.slice(position, seg.sourceEnd) !== seg.source
    ) {
      const from = nextSearchPosition.get(seg.source) ?? 0;
      position = originalContent.indexOf(seg.source, from);
      if (position === -1) throw new Error(`Cannot locate source for segment ${seg.id}`);
      nextSearchPosition.set(seg.source, position + seg.source.length);
    }

    markers.push({ position, length: seg.source.length, translation, id: seg.id });
  }

  markers.sort((a, b) => b.position - a.position);
  for (let i = 1; i < markers.length; i++) {
    const previous = markers[i - 1];
    const current = markers[i];
    if (current.position + current.length > previous.position) {
      throw new Error(`Overlapping segments ${current.id} and ${previous.id}`);
    }
  }

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
