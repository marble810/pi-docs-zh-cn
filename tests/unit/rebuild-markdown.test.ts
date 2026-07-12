import { describe, it, expect, beforeEach } from "vitest";
import { rebuildMarkdown, rebuildAndSave } from "../../scripts/rebuild-markdown.js";
import { protectTokens, resetCounters, restoreTokens } from "../../scripts/protect-tokens.js";
import type { ProtectedToken, TranslationSegment } from "../../scripts/lib/types.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

function makeSeg(
  id: string,
  source: string,
  normalizedSource?: string,
  tokens?: ProtectedToken[]
): TranslationSegment {
  const { text: norm } = protectTokens(source);
  return {
    id,
    filePath: "test.md",
    nodeType: "paragraph",
    sectionPath: ["test"],
    source,
    normalizedSource: normalizedSource ?? norm,
    sourceHash: "abc",
    contextHash: "def",
    protectedTokens: tokens ?? []
  };
}

describe("rebuildMarkdown", () => {
  beforeEach(() => {
    resetCounters();
  });

  it("replaces translated segments in content", () => {
    const original = "# Hello\n\nWorld.\n";
    const segs = [makeSeg("s1", "Hello"), makeSeg("s2", "World.")];
    const translations = new Map([
      ["s1", "你好"],
      ["s2", "世界。"]
    ]);
    const result = rebuildMarkdown(original, segs, translations);
    expect(result).toContain("你好");
    expect(result).toContain("世界。");
    expect(result).not.toContain("Hello");
    expect(result).not.toContain("World.");
  });

  it("restores protected tokens after rebuild", () => {
    resetCounters();
    const source = "Run `npm install` to start";
    const { text: normSource, tokens } = protectTokens(source);
    const seg = makeSeg("s1", source, normSource, tokens);

    const original = "# Guide\n\nRun `npm install` to start\n";
    const segs = [seg];
    // Translation has the placeholder still in it
    const translationWithPlaceholder = restoreTokens(`运行 {{INLINE-CODE_1}} 以开始`, tokens);
    const translations = new Map([["s1", translationWithPlaceholder]]);
    const result = rebuildMarkdown(original, segs, translations);
    // The token should be restored
    expect(result).toContain("`npm install`");
    expect(result).not.toContain("{{INLINE-CODE_1}}");
  });

  it("applies normalizeChinese: glossary + CJK spacing", () => {
    const original = "# Guide\n\nUse coding agent to build.\n";
    const segs = [makeSeg("s1", "Use coding agent to build.")];
    const translations = new Map([["s1", "使用 coding agent 构建"]]);
    const result = rebuildMarkdown(original, segs, translations);
    // Glossary: "coding agent" -> "编程代理"
    expect(result).toContain("编程代理");
    // CJK/Latin spacing
    expect(result).not.toContain("coding agent 构建"); // glossary replaced it
  });

  it("rejects missing segment translations", () => {
    const original = "# Hello\n\nWorld.\n";
    const segs = [makeSeg("s1", "Hello"), makeSeg("s2", "World.")];
    const translations = new Map([["s1", "你好"]]);
    expect(() => rebuildMarkdown(original, segs, translations)).toThrow(
      "Missing or empty translation for segment s2"
    );
  });

  it("restores protected Markdown around translated prose", () => {
    const source = "Read [the docs](https://example.com) and **start here**.";
    const { text: normalizedSource, tokens } = protectTokens(source);
    const segment = makeSeg("s1", source, normalizedSource, tokens);
    const translation = normalizedSource
      .replace("Read ", "阅读 ")
      .replace("the docs", "文档")
      .replace(" and ", " 并 ")
      .replace("start here", "从这里开始");

    expect(translation).not.toContain("[");
    expect(translation).not.toContain("]");
    expect(translation).not.toContain("*");
    expect(rebuildMarkdown(source, [segment], new Map([["s1", translation]]))).toBe(
      "阅读 [文档](https://example.com) 并 **从这里开始**."
    );
  });

  it("replaces duplicate sources at their distinct positions", () => {
    const original = "Same.\n\nSame.\n";
    const segs = [makeSeg("s1", "Same."), makeSeg("s2", "Same.")];
    const result = rebuildMarkdown(
      original,
      segs,
      new Map([
        ["s1", "第一处。"],
        ["s2", "第二处。"]
      ])
    );
    expect(result).toBe("第一处。\n\n第二处。\n");
  });

  it("rebuilds with headings and preserves heading hierarchy", () => {
    const original = "# Top\n\n## Sub\n\nContent.\n";
    const segs = [
      { ...makeSeg("h1", "Top"), nodeType: "heading" },
      { ...makeSeg("h2", "Sub"), nodeType: "heading" },
      makeSeg("p1", "Content.")
    ];
    const translations = new Map([
      ["h1", "顶部"],
      ["h2", "子章节"],
      ["p1", "内容。"]
    ]);
    const result = rebuildMarkdown(original, segs, translations);
    expect(result).toBe("# 顶部\n\n## 子章节\n\n内容。\n");
  });
});

describe("rebuildAndSave", () => {
  beforeEach(() => {
    resetCounters();
  });

  it("writes rebuilt files to output directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rebuild-test-"));
    try {
      const files = new Map([
        [
          "sub/test.md",
          {
            original: "# Hello\n\nWorld.\n",
            segments: [makeSeg("s1", "Hello"), makeSeg("s2", "World.")]
          }
        ]
      ]);
      const translations = new Map([
        ["s1", "你好"],
        ["s2", "世界。"]
      ]);
      const results = rebuildAndSave(files, translations, tmpDir);
      expect(results).toHaveLength(1);
      expect(results[0].filePath).toBe("sub/test.md");

      const saved = fs.readFileSync(path.join(tmpDir, "sub/test.md"), "utf-8");
      expect(saved).toContain("你好");
      expect(saved).toContain("世界。");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
