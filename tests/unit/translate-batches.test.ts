import { describe, it, expect } from "vitest";
import { groupIntoBatches } from "../../scripts/translate-batches.js";
import { loadTranslationPolicy } from "../../scripts/lib/config.js";
import type { TranslationSegment } from "../../scripts/lib/types.js";

const policy: ReturnType<typeof loadTranslationPolicy> = {
  version: 1,
  maxSegmentsPerBatch: 24,
  maxInputCharactersPerBatch: 20000,
  maxFilesPerBatch: 2,
  maxRequestsPerRun: 35,
  maxConcurrency: 1,
  minimumRequestIntervalMs: 3200,
  maxContextLength: 32768,
  minContextLength: 32768,
  priceValidation: { prompt: 0, completion: 0, request: 0, internalReasoning: 0 },
  modelFilters: {
    inputModalities: ["text"],
    outputModalities: ["text"],
    supportedParameters: ["response_format"],
    excludeExpiringWithinDays: 14
  },
  fallback: {
    finalRouter: "openrouter/free",
    maxRetriesPerModel: 1,
    circuitBreakerFailures: 3
  }
};

function makeSeg(path: string, source: string): TranslationSegment {
  return {
    id: "test",
    filePath: path,
    nodeType: "paragraph",
    sectionPath: ["test"],
    source,
    normalizedSource: source,
    sourceHash: "abc",
    contextHash: "def",
    protectedTokens: []
  };
}

describe("groupIntoBatches", () => {
  it("groups segments into batches respecting limits", () => {
    const segments = [
      makeSeg("a.md", "Hello"),
      makeSeg("a.md", "World"),
      makeSeg("b.md", "Foo"),
      makeSeg("c.md", "Bar") // 3rd file should start new batch
    ];
    const batches = groupIntoBatches(segments, policy);
    expect(batches.length).toBeGreaterThanOrEqual(2);
    // First batch should have at most 2 files
    const firstFiles = new Set(batches[0].segments.map((s) => s.filePath));
    expect(firstFiles.size).toBeLessThanOrEqual(2);
  });

  it("respects maxSegmentsPerBatch", () => {
    const manySegs = Array.from({ length: 30 }, (_, i) => makeSeg("a.md", `Segment ${i}`));
    const batches = groupIntoBatches(manySegs, policy);
    for (const b of batches) {
      expect(b.segments.length).toBeLessThanOrEqual(24);
    }
  });
});
