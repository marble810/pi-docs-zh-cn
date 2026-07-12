import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRelease } from "../../scripts/check-release.js";

afterEach(() => vi.unstubAllGlobals());

describe("checkRelease", () => {
  it("compares the latest release tag with the recorded tag", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ tag_name: "v-test" })))
    );

    const result = await checkRelease();

    expect(result.latestTag).toBe("v-test");
    expect(result.hasNewRelease).toBe(result.publishedTag !== "v-test");
  });
});
