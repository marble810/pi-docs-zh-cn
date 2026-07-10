import { describe, it, expect } from "vitest";
import { normalizeChinese } from "../../scripts/normalize-chinese.js";
import type { ProtectedToken } from "../../scripts/lib/types.js";

describe("normalizeChinese", () => {
  it("applies glossary corrections", () => {
    const result = normalizeChinese("Use coding agent to build", []);
    expect(result).toContain("编程代理");
  });

  it("restores placeholders", () => {
    const tokens: ProtectedToken[] = [
      { placeholder: "{{CODE_1}}", original: "`npm install`", type: "inline-code" }
    ];
    const result = normalizeChinese("运行 {{CODE_1}} 以安装", tokens);
    expect(result).toContain("`npm install`");
    expect(result).not.toContain("{{CODE_1}}");
  });

  it("adds CJK/Latin spacing", () => {
    const result = normalizeChinese("请使用Node.js进行开发", []);
    expect(result).toContain("使用 Node.js");
  });

  it("normalizes punctuation", () => {
    const result = normalizeChinese("Hello,世界。", []);
    expect(result).toContain("，");
  });
});
