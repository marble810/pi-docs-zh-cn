import { describe, it, expect } from "vitest";
import { computeDiff } from "../../scripts/diff-upstream.js";

describe("computeDiff", () => {
  // We'll test the diff logic indirectly via the helper
  it("exists and is a function", () => {
    expect(typeof computeDiff).toBe("function");
  });

  it("returns a DiffResult structure", () => {
    // This will run against actual staging/content dirs
    // In CI they may be empty, but the structure should be valid
    const result = computeDiff();
    expect(result).toHaveProperty("changes");
    expect(result).toHaveProperty("stagingFiles");
    expect(result).toHaveProperty("currentFiles");
    expect(Array.isArray(result.changes)).toBe(true);
  });
});
