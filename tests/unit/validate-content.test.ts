import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateContent } from "../../scripts/validate-content.js";

const temps: string[] = [];

function makePair(enBody: string, zhBody: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "validate-content-"));
  temps.push(root);
  const enDir = path.join(root, "en");
  const zhDir = path.join(root, "zh-CN");
  fs.mkdirSync(enDir, { recursive: true });
  fs.mkdirSync(zhDir, { recursive: true });
  fs.writeFileSync(path.join(enDir, "page.md"), enBody);
  fs.writeFileSync(path.join(zhDir, "page.md"), zhBody);
  return { enDir, zhDir };
}

afterEach(() => {
  for (const t of temps.splice(0)) {
    fs.rmSync(t, { recursive: true, force: true });
  }
});

describe("validateContent link resolution", () => {
  it("does not treat non-markdown resource links as broken by appending .md", () => {
    const body = [
      "---",
      "title: Page",
      "---",
      "",
      "See [example](../examples/extensions/tools.ts) and [theme](../src/modes/theme/dark.json).",
      "Also [sibling](./other)."
    ].join("\n");

    const { enDir, zhDir } = makePair(body, body);
    // sibling doc exists as other.md
    fs.writeFileSync(path.join(enDir, "other.md"), "---\ntitle: Other\n---\n\nOk.\n");
    fs.writeFileSync(path.join(zhDir, "other.md"), "---\ntitle: Other\n---\n\nOk.\n");

    const result = validateContent(enDir, zhDir);
    expect(result.summary.brokenInternalLinks).toBe(0);
    expect(result.errors.filter((e) => e.includes(".ts.md") || e.includes(".json.md"))).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("still reports missing markdown doc links introduced by translation", () => {
    const enBody = ["---", "title: Page", "---", "", "Ok."].join("\n");
    const zhBody = ["---", "title: Page", "---", "", "Missing [doc](./missing-page)."].join("\n");
    const { enDir, zhDir } = makePair(enBody, zhBody);
    const result = validateContent(enDir, zhDir);
    expect(result.valid).toBe(false);
    expect(result.summary.brokenInternalLinks).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("missing-page.md"))).toBe(true);
  });
});
