import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect } from "vitest";
import {
  groupIntoBatches,
  runConcurrent,
  translateWithFallback,
  serializedCommit,
  resetCommitChain
} from "../../scripts/translate-batches.js";
import type { TranslationProvider } from "../../scripts/providers/provider.js";
import { loadTranslationPolicy } from "../../scripts/lib/config.js";
import type { TranslationSegment, TranslationMemoryEntry } from "../../scripts/lib/types.js";
import { protectTokens, resetCounters } from "../../scripts/protect-tokens.js";

const policy: ReturnType<typeof loadTranslationPolicy> = {
  version: 1,
  maxSegmentsPerBatch: 24,
  maxInputCharactersPerBatch: 20000,
  maxFilesPerBatch: 2,
  maxRequestsPerRun: 35,
  maxConcurrency: 8,
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

function providerReturning(text: string): TranslationProvider {
  return {
    id: "test",
    async getCandidateModels() {
      return [];
    },
    async translateBatch(request, model) {
      return {
        translations: request.segments.map((segment) => ({ id: segment.id, text })),
        metadata: {
          provider: "test",
          requestedModel: model.id,
          actualModel: model.id,
          protocol: model.protocol,
          latencyMs: 0
        }
      };
    },
    classifyError(error) {
      return { kind: "unknown", safeMessage: String(error), fatal: false };
    }
  };
}

const candidate = {
  id: "test/model",
  protocol: "structured-json" as const,
  position: 0,
  available: true as const
};

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

describe("batch concurrency", () => {
  it("keeps eight requests in flight and returns deterministic cache data out of order", async () => {
    const items = Array.from({ length: 12 }, (_, index) => index);
    const completionOrder: number[] = [];
    let active = 0;
    let maxActive = 0;
    let releaseFirstWave!: () => void;
    const firstWaveStarted = new Promise<void>((resolve) => {
      releaseFirstWave = resolve;
    });

    const results = await runConcurrent(items, 8, async (index) => {
      active++;
      maxActive = Math.max(maxActive, active);
      if (maxActive === 8) releaseFirstWave();
      await firstWaveStarted;
      await new Promise((resolve) => setTimeout(resolve, (12 - index) * 2));
      completionOrder.push(index);
      active--;
      return { completed: index, cacheEntry: `cache-${index}` };
    });

    expect(maxActive).toBe(8);
    expect(completionOrder).not.toEqual(items);
    expect(results.map((result) => result.completed)).toEqual(items);
    expect(results.map((result) => result.cacheEntry)).toEqual(
      items.map((index) => `cache-${index}`)
    );
  });
});

describe("protocol batch splitting", () => {
  it("falls back when one segment exceeds the current protocol limit without empty requests", async () => {
    const calls: { modelId: string; segmentCount: number }[] = [];
    const provider: TranslationProvider = {
      id: "test",
      async getCandidateModels() {
        return [];
      },
      async translateBatch(request, model) {
        calls.push({ modelId: model.id, segmentCount: request.segments.length });
        return {
          translations: request.segments.map((segment) => ({ id: segment.id, text: "翻译" })),
          metadata: {
            provider: "test",
            requestedModel: model.id,
            actualModel: model.id,
            protocol: model.protocol,
            latencyMs: 0
          }
        };
      },
      classifyError(error) {
        return { kind: "unknown", safeMessage: String(error), fatal: false };
      }
    };
    const segment = makeSeg("a.md", "a".repeat(7_001));
    const result = await translateWithFallback(
      provider,
      { segments: [segment], glossary: {}, preserve: [], prompt: "" },
      [{ ...candidate, id: "test/riva", protocol: "tagged-text" }, candidate]
    );

    expect(calls).toEqual([{ modelId: candidate.id, segmentCount: 1 }]);
    expect(result.metadata.actualModel).toBe(candidate.id);
  });
});

describe("translation validation", () => {
  it("allows code-only identifier segments without Chinese", async () => {
    resetCounters();
    const source = "registerTool ui.select ctx.reload sendUserMessage";
    const { text: normalizedSource, tokens } = protectTokens(source);
    const segment = {
      ...makeSeg("a.md", source),
      normalizedSource,
      protectedTokens: tokens
    };
    const result = await translateWithFallback(
      providerReturning(normalizedSource),
      { segments: [segment], glossary: {}, preserve: [], prompt: "" },
      [candidate]
    );
    expect(result.translations).toHaveLength(1);
  });

  it("allows Title-case product/API name segments without Chinese", async () => {
    resetCounters();
    const source = "Azure OpenAI Responses API";
    const { text: normalizedSource, tokens } = protectTokens(source);
    const segment = {
      ...makeSeg("a.md", source),
      normalizedSource,
      protectedTokens: tokens
    };
    const result = await translateWithFallback(
      providerReturning(normalizedSource),
      { segments: [segment], glossary: {}, preserve: [], prompt: "" },
      [candidate]
    );
    expect(result.translations).toHaveLength(1);
  });

  it("rejects dropped protected Markdown markers", async () => {
    resetCounters();
    const source = "Read [the docs](https://example.com) and **start here**.";
    const { text: normalizedSource, tokens } = protectTokens(source);
    const segment = {
      ...makeSeg("a.md", source),
      normalizedSource,
      protectedTokens: tokens
    };
    const missingMarker = normalizedSource.replace(/\{\{MARKDOWN_[^}]+\}\}/g, "");
    await expect(
      translateWithFallback(
        providerReturning(missingMarker),
        { segments: [segment], glossary: {}, preserve: [], prompt: "" },
        [candidate]
      )
    ).rejects.toThrow("All models failed");
  });
});

describe("serialized batch persistence", () => {
  it("persists early successful out-of-order batches when a later batch fails", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-docs-test-"));
    try {
      resetCommitChain();

      const items = Array.from({ length: 12 }, (_, i) => `item-${i}`);
      const allIds = items.map((_, i) => `seg-${i}`);

      await expect(
        runConcurrent(items, 8, async (item, index) => {
          // Out-of-order completion: shorter items finish first
          await new Promise((resolve) => setTimeout(resolve, (12 - index) * 2));

          // A later refill fails after earlier out-of-order batches commit.
          if (index === 8) {
            throw new Error(`Simulated failure on item ${index}`);
          }

          const cacheEntry: TranslationMemoryEntry = {
            key: `key-${index}`,
            source: item,
            translation: `trans-${index}`,
            metadata: {
              targetLocale: "zh-CN",
              filePath: `file-${index % 3}.md`,
              sectionPath: ["test"],
              modelRequested: "test/model",
              modelUsed: "test/model",
              translatedAt: new Date().toISOString()
            }
          };

          await serializedCommit(
            [cacheEntry],
            [`seg-${index}`],
            allIds,
            new Date().toISOString(),
            tmpDir
          );

          return index;
        })
      ).rejects.toThrow();

      // ── Verify persistence ──────────────────────────────────────────

      // Checkpoint must exist and contain early-completed items
      const syncPath = path.join(tmpDir, "pending-sync.json");
      expect(fs.existsSync(syncPath)).toBe(true);
      const sync = JSON.parse(fs.readFileSync(syncPath, "utf-8"));

      // Items 6 and 7 finish out of order before the refilled item 8 fails.
      expect(sync.completedSegmentIds).toContain("seg-6");
      expect(sync.completedSegmentIds).toContain("seg-7");

      // Failed item must remain pending.
      expect(sync.remainingSegmentIds).toContain("seg-8");

      // Status is still translating (not all segments completed)
      expect(sync.status).toBe("translating");

      // Translation-memory JSONL must exist with matching entry count
      const cachePath = path.join(tmpDir, "translation-memory.jsonl");
      expect(fs.existsSync(cachePath)).toBe(true);
      const lines = fs.readFileSync(cachePath, "utf-8").trim().split("\n").filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBe(sync.completedSegmentIds.length);

      // Each entry is valid JSON with expected fields
      for (const line of lines) {
        const entry = JSON.parse(line);
        expect(entry).toHaveProperty("key");
        expect(entry).toHaveProperty("source");
        expect(entry).toHaveProperty("translation");
        expect(entry.metadata).toHaveProperty("targetLocale", "zh-CN");
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("per-segment batch validation", () => {
  it("keeps valid translations and returns only passing segments when one fails", async () => {
    resetCounters();
    const goodSource = "Hello world";
    const goodProtected = protectTokens(goodSource);
    const goodSeg = {
      ...makeSeg("a.md", goodSource),
      id: "good-seg",
      normalizedSource: goodProtected.text,
      protectedTokens: goodProtected.tokens
    };

    const badSource = "Read [the docs](https://example.com) and **start here**.";
    const badProtected = protectTokens(badSource);
    const badSeg = {
      ...makeSeg("a.md", badSource),
      id: "bad-seg",
      normalizedSource: badProtected.text,
      protectedTokens: badProtected.tokens
    };

    // Provider returns correct placeholders for good-seg but drops them for bad-seg
    // Note: TranslationSegmentRequest.source IS the normalizedSource (see toTranslationSegmentRequest)
    const provider: TranslationProvider = {
      id: "test",
      async getCandidateModels() {
        return [];
      },
      async translateBatch(request, model) {
        return {
          translations: request.segments.map((seg) => ({
            id: seg.id,
            text: seg.id === "bad-seg" ? seg.source.replace(/\{\{[^}]+\}\}/g, "") : seg.source
          })),
          metadata: {
            provider: "test",
            requestedModel: model.id,
            actualModel: model.id,
            protocol: model.protocol,
            latencyMs: 0
          }
        };
      },
      classifyError(error) {
        return { kind: "unknown", safeMessage: String(error), fatal: false };
      }
    };

    const result = await translateWithFallback(
      provider,
      { segments: [goodSeg, badSeg], glossary: {}, preserve: [], prompt: "" },
      [candidate]
    );

    // Only the good segment should survive
    expect(result.translations).toHaveLength(1);
    expect(result.translations[0].id).toBe("good-seg");
  });

  it("throws when all segments in a batch fail validation", async () => {
    resetCounters();
    const badSource = "Read [the docs](https://example.com) and **start here**.";
    const badProtected = protectTokens(badSource);
    const badSeg = {
      ...makeSeg("a.md", badSource),
      normalizedSource: badProtected.text,
      protectedTokens: badProtected.tokens
    };

    const missingMarker = badProtected.text.replace(/\{\{[^}]+\}\}/g, "");
    await expect(
      translateWithFallback(
        providerReturning(missingMarker),
        { segments: [badSeg], glossary: {}, preserve: [], prompt: "" },
        [candidate]
      )
    ).rejects.toThrow("All models failed");
  });
});
