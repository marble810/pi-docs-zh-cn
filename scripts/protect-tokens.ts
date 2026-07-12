import type { ProtectedToken, ProtectedTokenType } from "./lib/types.js";

const tokenCounters: Record<string, number> = {};

function nextToken(type: ProtectedTokenType): string {
  tokenCounters[type] ??= 0;
  tokenCounters[type]++;
  return `{{${type.toUpperCase()}_${tokenCounters[type]}}}`;
}

export function resetCounters(): void {
  for (const k of Object.keys(tokenCounters)) delete tokenCounters[k];
}

const INLINE_CODE_RE = /`[^`]+`/g;
const URL_RE = /https?:\/\/[^\s<>"'()]+/g;
const PATH_RE = /(?<![a-zA-Z])(?:\/[a-zA-Z0-9_.-]+)+(?:\/[a-zA-Z0-9_.-]+)?/g;
const COMMAND_RE =
  /(?<![a-zA-Z])(?:\$?\s*(?:npx|npm|pnpm|yarn|node|tsx|git|curl|ls|cd|mkdir|cp|mv|rm|echo|cat|grep|find|xargs|tee|chmod|touch|source))\s+[a-zA-Z0-9_.-]+/g;
const PRODUCT_RE =
  /\b(Pi|SvelteKit|Svelte|Bits UI|GitHub|OpenRouter|Markdown|TypeScript|Node\.js)\b/g;
// Protect Markdown delimiters so the model only translates prose, not syntax.
const MARKDOWN_RE =
  /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|(?:^|\n)[ \t]{0,3}(?:[-+*]|\d+[.)])\s+|(?:^|\n)[ \t]{0,3}> ?|(?: {2}|\\)\n|\\[^\n]|\n|(?:[!()*_~{}]|\[|\])/gm;

export function protectTokens(source: string): { text: string; tokens: ProtectedToken[] } {
  const tokens: ProtectedToken[] = [];
  // Collect all matches as { start, end, type, text } on the original source
  const rawMatches: { start: number; end: number; type: ProtectedTokenType; matchText: string }[] =
    [];

  const IDENTIFIER_RE =
    /(?<![a-zA-Z])(?:[A-Z][a-z]+[A-Z][A-Za-z0-9]*|[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][A-Z0-9_]{2,}|[a-z]+(?:-[a-z]+)+|[A-Za-z_][\w$]*\.[A-Za-z_][\w$]*)(?![a-zA-Z])/g;

  const patterns: [RegExp, ProtectedTokenType][] = [
    [INLINE_CODE_RE, "inline-code"],
    [MARKDOWN_RE, "markdown"],
    [URL_RE, "url"],
    [PATH_RE, "path"],
    [PRODUCT_RE, "product"],
    [IDENTIFIER_RE, "identifier"],
    [COMMAND_RE, "command"]
  ];

  for (const [re, type] of patterns) {
    for (const match of source.matchAll(re)) {
      rawMatches.push({
        start: match.index!,
        end: match.index! + match[0].length,
        type,
        matchText: match[0]
      });
    }
  }

  // Deduplicate overlapping matches: patterns earlier in the list win
  const kept: typeof rawMatches = [];
  for (const m of rawMatches) {
    const overlap = kept.some((k) => m.start < k.end && m.end > k.start);
    if (!overlap) {
      kept.push(m);
    }
  }
  // Sort by start position descending so replacements don't shift indices
  kept.sort((a, b) => b.start - a.start);

  let text = source;
  for (const m of kept) {
    const placeholder = nextToken(m.type);
    tokens.push({ placeholder, original: m.matchText, type: m.type });
    text = text.slice(0, m.start) + placeholder + text.slice(m.end);
  }

  tokens.reverse(); // restore original order

  return { text, tokens };
}

export function restoreTokens(text: string, tokens: ProtectedToken[]): string {
  let result = text;
  for (const t of tokens) {
    result = result.replace(t.placeholder, t.original);
  }
  return result;
}
