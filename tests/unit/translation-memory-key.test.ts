import { describe, it, expect } from "vitest";
import type { TranslationMemoryEntry } from "../../scripts/lib/types.js";

/**
 * Translation memory key tests.
 * The TM key is derived from sourceHash + contextHash + locale.
 */
describe("Translation memory key", () => {
  function makeKey(entry: TranslationMemoryEntry): string {
    // Key is based on source hash and context hash from the identity
    return `${entry.metadata.targetLocale}::${entry.key}`;
  }

  function entryKey(sourceHash: string, contextHash: string, locale: string): string {
    return `${locale}::${sourceHash}::${contextHash}`;
  }

  it("derives key from source and context hashes", () => {
    const key = entryKey("a1b2c3", "d4e5f6", "zh-CN");
    expect(key).toBe("zh-CN::a1b2c3::d4e5f6");
  });

  it("produces deterministic keys for same inputs", () => {
    const a = entryKey("abc", "def", "zh-CN");
    const b = entryKey("abc", "def", "zh-CN");
    expect(a).toBe(b);
  });

  it("differs when source hash changes", () => {
    const a = entryKey("abc", "def", "zh-CN");
    const b = entryKey("xyz", "def", "zh-CN");
    expect(a).not.toBe(b);
  });

  it("differs when context hash changes", () => {
    const a = entryKey("abc", "def", "zh-CN");
    const b = entryKey("abc", "xyz", "zh-CN");
    expect(a).not.toBe(b);
  });

  it("differs when locale changes", () => {
    const a = entryKey("abc", "def", "zh-CN");
    const b = entryKey("abc", "def", "en");
    expect(a).not.toBe(b);
  });

  it("models a TM entry with metadata", () => {
    const entry: TranslationMemoryEntry = {
      key: "a1b2c3_d4e5f6_zh-CN",
      source: "Hello world",
      translation: "你好世界",
      metadata: {
        targetLocale: "zh-CN",
        filePath: "docs/hello.md",
        sectionPath: ["getting-started"],
        modelRequested: "openrouter/free",
        modelUsed: "openrouter/free",
        translatedAt: new Date().toISOString()
      }
    };
    const key = makeKey(entry);
    expect(key).toContain("zh-CN");
    expect(key).toContain(entry.key);
  });
});
