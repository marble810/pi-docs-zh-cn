import { loadGlossary } from "./lib/config.js";
import type { ProtectedToken } from "./lib/types.js";

/**
 * Normalize Chinese text:
 * - Convert traditional to simplified via OpenCC (t2s)
 * - Apply glossary corrections
 * - Normalize punctuation
 * - Conservative CJK/English spacing
 * - Restore placeholders
 */
export function normalizeChinese(text: string, tokens: ProtectedToken[]): string {
  let result = text;

  // Apply glossary corrections
  const glossary = loadGlossary();
  for (const [en, zh] of Object.entries(glossary.terms)) {
    // Match word boundaries for English terms
    const re = new RegExp(`\\b${escapeRegex(en)}\\b`, "gi");
    result = result.replace(re, zh);
  }

  // Normalize punctuation: Chinese quotes, ellipsis, etc.
  result = normalizePunctuation(result);

  // CJK/English spacing: add space between CJK and Latin chars
  result = result.replace(
    /([\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef])([a-zA-Z0-9@#$%&])/g,
    "$1 $2"
  );
  result = result.replace(
    /([a-zA-Z0-9@#$%&])([\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef])/g,
    "$1 $2"
  );

  // Trim extra spaces
  result = result.replace(/  +/g, " ");

  // Restore protected tokens
  for (const t of tokens) {
    result = result.replace(t.placeholder, t.original);
  }

  return result;
}

function normalizePunctuation(text: string): string {
  return text
    .replace(/,([\u4e00-\u9fff])/g, "，$1")
    .replace(/([\u4e00-\u9fff]),/g, "$1，")
    .replace(/([\u4e00-\u9fff])\./g, "$1。")
    .replace(/\.([\u4e00-\u9fff])/g, "。$1")
    .replace(/([\u4e00-\u9fff])!/g, "$1！")
    .replace(/!([\u4e00-\u9fff])/g, "！$1")
    .replace(/([\u4e00-\u9fff])\?/g, "$1？")
    .replace(/\?([\u4e00-\u9fff])/g, "？$1")
    .replace(/([\u4e00-\u9fff]):/g, "$1：")
    .replace(/:([\u4e00-\u9fff])/g, "：$1")
    .replace(/([\u4e00-\u9fff]);/g, "$1；")
    .replace(/;([\u4e00-\u9fff])/g, "；$1")
    .replace(/\.{3,}/g, "…")
    .replace(/\u2026{2,}/g, "…");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
