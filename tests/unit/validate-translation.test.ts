import { describe, it, expect } from "vitest";
import { validateTranslation } from "../../scripts/validate-translation.js";
import type { TranslationSegment } from "../../scripts/lib/types.js";

function makeSegment(
  id: string,
  source: string,
  tokens: { placeholder: string; original: string; type: "inline-code" }[] = []
): TranslationSegment {
  return {
    id,
    filePath: "test.md",
    nodeType: "paragraph",
    sectionPath: ["test"],
    source,
    normalizedSource: source,
    sourceHash: "abc123",
    contextHash: "def456",
    protectedTokens: tokens
  };
}

describe("validateTranslation", () => {
  it("passes valid translations", () => {
    const segs = [makeSegment("s1", "Hello world")];
    const result = validateTranslation(segs, { s1: "你好世界" });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails on missing segments", () => {
    const segs = [makeSegment("s1", "Hello"), makeSegment("s2", "World")];
    const result = validateTranslation(segs, { s1: "你好" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain("s2");
  });

  it("detects missing placeholders", () => {
    const segs = [
      makeSegment("s1", "Run {{CODE_1}} to install", [
        { placeholder: "{{CODE_1}}", original: "`npm install`", type: "inline-code" }
      ])
    ];
    const result = validateTranslation(segs, { s1: "运行安装" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("{{CODE_1}}");
  });

  it("warns on empty or non-Chinese translations", () => {
    const segs = [makeSegment("s1", "Hello")];
    const result = validateTranslation(segs, { s1: "Hello" });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    expect(result.warnings[0]).toContain("no CJK");
  });
});
