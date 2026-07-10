import type { TranslationSegment } from "./lib/types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a translated batch of segments.
 */
export function validateTranslation(
  segments: TranslationSegment[],
  translations: Record<string, string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Schema completeness: all segments present
  for (const seg of segments) {
    if (translations[seg.id] === undefined) {
      errors.push(
        `Missing translation for segment ${seg.id} (${seg.nodeType}: ${seg.source.slice(0, 50)})`
      );
    }
  }

  // Check for extra IDs
  for (const id of Object.keys(translations)) {
    if (!segments.find((s) => s.id === id)) {
      warnings.push(`Extra translation ID ${id} not in batch`);
    }
  }

  // 2. Placeholder multiset match
  for (const seg of segments) {
    const translation = translations[seg.id];
    if (!translation) continue;

    // Extract all placeholders from source and translation
    const srcPhs = seg.protectedTokens.map((t) => t.placeholder);
    const tgtPhs = [...translation.matchAll(/\{\{[^}]+\}\}/g)].map((m) => m[0]);

    // Check each source placeholder appears in target
    for (const ph of srcPhs) {
      if (!tgtPhs.includes(ph)) {
        errors.push(`Segment ${seg.id}: missing placeholder ${ph} in translation`);
      }
    }

    // Check no unknown placeholders
    const knownPhs = new Set(srcPhs);
    for (const ph of tgtPhs) {
      if (!knownPhs.has(ph)) {
        errors.push(`Segment ${seg.id}: unknown placeholder ${ph} in translation`);
      }
    }
  }

  // 3. Language check: translation should contain Chinese characters
  const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  for (const seg of segments) {
    const translation = translations[seg.id];
    if (!translation) continue;
    if (!CJK_RE.test(translation)) {
      warnings.push(`Segment ${seg.id}: translation may not be Chinese (no CJK characters)`);
    }
  }

  // 4. Length ratio check: translation shouldn't be >3x or <0.2x source
  for (const seg of segments) {
    const translation = translations[seg.id];
    if (!translation) continue;
    const ratio = translation.length / Math.max(seg.source.length, 1);
    if (ratio > 3) {
      warnings.push(
        `Segment ${seg.id}: translation is ${ratio.toFixed(2)}x source length (${seg.source.length} → ${translation.length})`
      );
    }
    if (ratio < 0.2) {
      warnings.push(
        `Segment ${seg.id}: translation is only ${ratio.toFixed(2)}x source length (${seg.source.length} → ${translation.length})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
