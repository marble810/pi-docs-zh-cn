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
const URL_RE = /https?:\/\/[^\s<>"']+/g;
const PATH_RE = /(?<![a-zA-Z])(?:\/[a-zA-Z0-9_.-]+)+(?:\/[a-zA-Z0-9_.-]+)?/g;
const COMMAND_RE =
  /(?<![a-zA-Z])(?:\$?\s*(?:npx|npm|pnpm|yarn|node|tsx|git|curl|ls|cd|mkdir|cp|mv|rm|echo|cat|grep|find|xargs|tee|chmod|touch|source|\.\s+))\s*[a-zA-Z0-9_.-]+/g;
const PRODUCT_RE =
  /\b(Pi|SvelteKit|Svelte|Bits UI|GitHub|OpenRouter|Markdown|TypeScript|Node\.js)\b/g;

export function protectTokens(source: string): { text: string; tokens: ProtectedToken[] } {
  const tokens: ProtectedToken[] = [];
  // Collect all matches as { start, end, type, text } on the original source
  const rawMatches: { start: number; end: number; type: ProtectedTokenType; matchText: string }[] =
    [];

  const IDENTIFIER_RE =
    /(?<![a-zA-Z])(?:[A-Z][a-z]+(?:[A-Z][a-z]+)+|[a-z]+(?:-[a-z]+)+)(?![a-zA-Z])/g;

  const patterns: [RegExp, ProtectedTokenType][] = [
    [INLINE_CODE_RE, "inline-code"],
    [URL_RE, "url"],
    [PATH_RE, "path"],
    [IDENTIFIER_RE, "identifier"],
    [COMMAND_RE, "command"],
    [PRODUCT_RE, "product"]
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
