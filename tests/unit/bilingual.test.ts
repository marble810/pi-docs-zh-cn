import { describe, it, expect } from "vitest";
import { parseBilingualTitle } from "../../src/lib/bilingual.js";

describe("parseBilingualTitle", () => {
  it("splits 中文｜English", () => {
    expect(parseBilingualTitle("快速入门｜Quickstart")).toEqual({
      zh: "快速入门",
      en: "Quickstart"
    });
  });

  it("returns plain text when no separator", () => {
    expect(parseBilingualTitle("目录")).toEqual({ zh: "目录" });
  });

  it("handles identical zh/en", () => {
    expect(parseBilingualTitle("SDK｜SDK")).toEqual({ zh: "SDK", en: "SDK" });
  });
});
