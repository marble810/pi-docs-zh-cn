import fs from "node:fs";
import path from "node:path";
import {
  loadTranslationPolicy,
  getConfigVersions,
  loadGlossary,
  loadTranslationPrompt
} from "./lib/config.js";
import { STATE_DIR } from "./lib/paths.js";
import type {
  TranslationSegment,
  SegmentBatch,
  TranslationCacheIdentity,
  TranslationMemoryEntry,
  PendingSync
} from "./lib/types.js";
import {
  type TranslationProvider,
  type TranslationBatchRequest,
  type TranslationBatchResult,
  type ModelCandidate,
  toTranslationSegmentRequest
} from "./providers/provider.js";
import { AllModelsFailedError } from "./providers/errors.js";
import { createTranslationProvider } from "./providers/provider-factory.js";
import { maxBatchConfig } from "./providers/deepseek/deepseek-protocol.js";

interface TranslateBatchesOptions {
  segments: TranslationSegment[];
  onProgress?: (done: number, total: number) => void;
}

interface TranslatedSegment {
  segmentId: string;
  translation: string;
  modelUsed: string;
}

function loadCache(): Map<string, TranslationMemoryEntry> {
  const cachePath = path.join(STATE_DIR, "translation-memory.jsonl");
  const cache = new Map<string, TranslationMemoryEntry>();
  if (!fs.existsSync(cachePath)) return cache;
  const lines = fs.readFileSync(cachePath, "utf-8").trim().split("\n");
  for (const line of lines) {
    if (!line) continue;
    const entry = JSON.parse(line) as TranslationMemoryEntry;
    if (entry.translation?.trim()) cache.set(entry.key, entry);
  }
  return cache;
}

function buildCacheKey(
  seg: TranslationSegment,
  versions: ReturnType<typeof getConfigVersions>
): string {
  const identity: TranslationCacheIdentity = {
    sourceHash: seg.sourceHash,
    contextHash: seg.contextHash,
    targetLocale: "zh-CN",
    promptVersion: versions.promptVersion,
    glossaryVersion: versions.glossaryVersion,
    translationPolicyVersion: versions.translationPolicyVersion
  };
  return Object.values(identity).join("::");
}

function groupIntoBatches(
  segments: TranslationSegment[],
  policy: ReturnType<typeof loadTranslationPolicy>
): SegmentBatch[] {
  const batches: SegmentBatch[] = [];
  let current: TranslationSegment[] = [];
  let charCount = 0;
  const fileSet = new Set<string>();
  let currentFile: string | null = null;

  for (const seg of segments) {
    if (
      current.length >= policy.maxSegmentsPerBatch ||
      charCount + seg.source.length > policy.maxInputCharactersPerBatch ||
      (currentFile !== null &&
        seg.filePath !== currentFile &&
        fileSet.size >= policy.maxFilesPerBatch)
    ) {
      if (current.length > 0) {
        batches.push({ segments: [...current], estimatedChars: charCount });
      }
      current = [];
      charCount = 0;
      fileSet.clear();
      currentFile = null;
    }

    current.push(seg);
    charCount += seg.source.length;
    currentFile = seg.filePath;
    fileSet.add(seg.filePath);
  }

  if (current.length > 0) {
    batches.push({ segments: [...current], estimatedChars: charCount });
  }

  return batches;
}

function splitSegmentsForProtocol(
  segments: TranslationSegment[],
  maxPerBatch: number,
  maxChars: number
): TranslationSegment[][] {
  const result: TranslationSegment[][] = [];
  let current: TranslationSegment[] = [];
  let charCount = 0;

  for (const seg of segments) {
    if (seg.source.length > maxChars) {
      throw new Error(`Segment ${seg.id} exceeds this model's ${maxChars}-character input limit`);
    }
    if (
      current.length >= maxPerBatch ||
      (current.length > 0 && charCount + seg.source.length > maxChars)
    ) {
      result.push([...current]);
      current = [];
      charCount = 0;
    }
    current.push(seg);
    charCount += seg.source.length;
  }
  if (current.length > 0) result.push([...current]);
  return result;
}

export async function translateWithFallback(
  provider: TranslationProvider,
  batchData: {
    segments: TranslationSegment[];
    glossary: Record<string, string>;
    preserve: string[];
    prompt: string;
  },
  candidates: ModelCandidate[]
): Promise<TranslationBatchResult> {
  const failures: string[] = [];

  for (const candidate of candidates) {
    if (candidate.available === false) {
      console.log(`   ⏭  ${candidate.id}: unavailable, skipping`);
      continue;
    }

    const protocolConfig = maxBatchConfig(candidate.protocol);
    const segsForThisModel = batchData.segments;
    const inputCharacters = segsForThisModel.reduce((sum, seg) => sum + seg.source.length, 0);
    const needsSplit =
      segsForThisModel.length > protocolConfig.maxSegmentsPerBatch ||
      inputCharacters > protocolConfig.maxInputCharactersPerBatch;

    try {
      if (needsSplit) {
        const subBatches = splitSegmentsForProtocol(
          segsForThisModel,
          protocolConfig.maxSegmentsPerBatch,
          protocolConfig.maxInputCharactersPerBatch
        );
        console.log(
          `   ✂️  ${candidate.id}: splitting ${segsForThisModel.length} segments → ${subBatches.length} sub-batches`
        );

        const subResults: TranslationBatchResult[] = [];
        for (const subSegs of subBatches) {
          const request: TranslationBatchRequest = {
            segments: subSegs.map(toTranslationSegmentRequest),
            targetLocale: "zh-CN",
            glossary: batchData.glossary,
            preserve: batchData.preserve,
            systemPrompt: batchData.prompt,
            maxOutputTokens: protocolConfig.maxOutputTokens
          };
          const subResult = await provider.translateBatch(request, candidate);
          const subFailed = validateTranslationBatch(subSegs, subResult);
          if (subFailed.size > 0) {
            if (subFailed.size === subResult.translations.length)
              throw new Error(`All ${subFailed.size} segments failed validation`);
            subResult.translations = subResult.translations.filter((t) => !subFailed.has(t.id));
          }
          subResults.push(subResult);
        }

        const result: TranslationBatchResult = {
          translations: subResults.flatMap((r) => r.translations),
          metadata: {
            provider: provider.id,
            requestedModel: candidate.id,
            actualModel: candidate.id,
            protocol: candidate.protocol,
            latencyMs: subResults.reduce((sum, r) => sum + r.metadata.latencyMs, 0)
          }
        };
        const finalFailed = validateTranslationBatch(segsForThisModel, result);
        if (finalFailed.size > 0) {
          if (finalFailed.size === result.translations.length)
            throw new Error(`All ${finalFailed.size} segments failed validation`);
          result.translations = result.translations.filter((t) => !finalFailed.has(t.id));
        }
        return result;
      }

      const request: TranslationBatchRequest = {
        segments: segsForThisModel.map(toTranslationSegmentRequest),
        targetLocale: "zh-CN",
        glossary: batchData.glossary,
        preserve: batchData.preserve,
        systemPrompt: batchData.prompt,
        maxOutputTokens: protocolConfig.maxOutputTokens
      };
      const result = await provider.translateBatch(request, candidate);
      const failed = validateTranslationBatch(segsForThisModel, result);
      if (failed.size > 0) {
        if (failed.size === result.translations.length)
          throw new Error(`All ${failed.size} segments failed validation`);
        result.translations = result.translations.filter((t) => !failed.has(t.id));
      }
      return result;
    } catch (err) {
      const info = provider.classifyError(err);
      failures.push(`${candidate.id}: ${info.kind}`);
      console.log(`   ❌ ${candidate.id}: ${info.safeMessage}`);
      if (info.fatal) throw new AllModelsFailedError([info]);
    }
  }

  throw new AllModelsFailedError(
    failures.map((f) => ({ kind: "unknown", safeMessage: f, fatal: false }))
  );
}

function hasLowercaseProse(text: string): boolean {
  // Pure product/API/identifier lists stay Title Case or camelCase with no
  // standalone lowercase word. Real prose has common lowercase words.
  return /\b[a-z]{2,}\b/.test(text);
}

function validateTranslationBatch(
  segments: TranslationSegment[],
  result: TranslationBatchResult
): Set<string> {
  const resultIds = new Map(result.translations.map((t) => [t.id, t.text]));
  if (resultIds.size !== result.translations.length) {
    throw new Error("Response contains duplicate segment IDs");
  }

  const empty = result.translations.filter((t) => typeof t.text !== "string" || !t.text.trim());
  if (empty.length > 0) {
    throw new Error(`Empty translations: ${empty.map((t) => t.id.slice(0, 12)).join(", ")}`);
  }

  const missing = segments.filter((s) => !resultIds.has(s.id));
  if (missing.length > 0) {
    throw new Error(`Missing segments: ${missing.map((s) => s.id.slice(0, 12)).join(", ")}`);
  }

  // Extra segments in result
  const expectedIds = new Set(segments.map((s) => s.id));
  const extra = result.translations.filter((t) => !expectedIds.has(t.id));
  if (extra.length > 0) {
    throw new Error(`Extra segments: ${extra.map((t) => t.id.slice(0, 12)).join(", ")}`);
  }

  // Per-segment placeholder preservation and untranslated-prose rejection.
  // Returns the set of segment IDs that failed validation so the caller can
  // accept the valid translations and leave the failing ones for retry.
  const failedSegments = new Set<string>();
  for (const seg of segments) {
    const translation = resultIds.get(seg.id) ?? "";
    const srcPlaceholders = seg.protectedTokens.map((token) => token.placeholder).sort();
    const tgtPlaceholders = (translation.match(/\{\{[^}]+\}\}/g) ?? []).sort();
    if (JSON.stringify(srcPlaceholders) !== JSON.stringify(tgtPlaceholders)) {
      console.error(
        `Placeholder mismatch in ${seg.id}: expected [${srcPlaceholders.join(", ")}], got [${tgtPlaceholders.join(", ")}]`
      );
      failedSegments.add(seg.id);
      continue;
    }

    const prose = seg.normalizedSource.replace(/\{\{[^}]+\}\}/g, "");
    const proseWords = prose.match(/[A-Za-z]{2,}/g) ?? [];
    if (
      proseWords.length >= 4 &&
      hasLowercaseProse(prose) &&
      !/[\u3400-\u9fff]/.test(translation)
    ) {
      console.error(`Untranslated English prose in segment ${seg.id}`);
      failedSegments.add(seg.id);
    }
  }

  return failedSegments;
}

export async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await worker(items[index], index);
      }
    })
  );
  return results;
}

async function processSingleBatch(
  batch: SegmentBatch,
  provider: TranslationProvider,
  candidates: ModelCandidate[],
  glossary: ReturnType<typeof loadGlossary>,
  prompt: string,
  versions: ReturnType<typeof getConfigVersions>,
  cache: Map<string, TranslationMemoryEntry>
): Promise<{ translated: TranslatedSegment[]; cacheEntries: TranslationMemoryEntry[] }> {
  const cachedResults: TranslatedSegment[] = [];
  const uncached: TranslationSegment[] = [];

  for (const seg of batch.segments) {
    const key = buildCacheKey(seg, versions);
    const entry = cache.get(key);
    if (entry) {
      cachedResults.push({
        segmentId: seg.id,
        translation: entry.translation,
        modelUsed: entry.metadata.modelUsed
      });
    } else {
      uncached.push(seg);
    }
  }

  if (uncached.length === 0) {
    return { translated: cachedResults, cacheEntries: [] };
  }

  try {
    const result = await translateWithFallback(
      provider,
      { segments: uncached, glossary: glossary.terms, preserve: glossary.preserve, prompt },
      candidates
    );

    const batchTranslated: TranslatedSegment[] = result.translations.map((t) => ({
      segmentId: t.id,
      translation: t.text,
      modelUsed: result.metadata.actualModel
    }));

    const resultMap = new Map(result.translations.map((t) => [t.id, t]));
    const cacheEntries: TranslationMemoryEntry[] = uncached
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const rt = resultMap.get(s.id)!;
        return {
          key: buildCacheKey(s, versions),
          source: s.source,
          translation: rt.text,
          metadata: {
            targetLocale: "zh-CN",
            filePath: s.filePath,
            sectionPath: s.sectionPath,
            modelRequested: result.metadata.requestedModel,
            modelUsed: result.metadata.actualModel,
            translatedAt: new Date().toISOString()
          }
        };
      });

    return { translated: [...cachedResults, ...batchTranslated], cacheEntries };
  } catch (err) {
    if (err instanceof AllModelsFailedError) {
      console.log(
        `   🚫 Batch: all models failed — skipping, ${uncached.length} segments untranslated`
      );
      return { translated: cachedResults, cacheEntries: [] };
    }
    throw err;
  }
}

export async function translateBatches(
  options: TranslateBatchesOptions
): Promise<TranslatedSegment[]> {
  const { segments, onProgress } = options;
  const policy = loadTranslationPolicy();
  const versions = getConfigVersions();
  const cache = loadCache();
  const glossary = loadGlossary();
  const prompt = loadTranslationPrompt();

  // Create provider
  const provider = createTranslationProvider();
  const candidates = await provider.getCandidateModels();
  const availableCandidates = candidates.filter((c) => c.available !== false);

  if (availableCandidates.length === 0) {
    console.log("   ⚠ No available models. Translation skipped.");
    return [];
  }

  console.log(`   📋 Model chain: ${availableCandidates.map((c) => c.id).join(" → ")}`);

  const batches = groupIntoBatches(segments, policy);
  console.log(`   📊 ${segments.length} segments → ${batches.length} batches`);

  const startedAt = new Date().toISOString();
  const allSegmentIds = segments.map((s) => s.id);
  resetCommitChain();

  let completedCount = 0;
  let batchResults: Awaited<ReturnType<typeof processSingleBatch>>[];
  try {
    batchResults = await runConcurrent(batches, policy.maxConcurrency, async (batch, index) => {
      const result = await processSingleBatch(
        batch,
        provider,
        availableCandidates,
        glossary,
        prompt,
        versions,
        cache
      );
      completedCount += result.translated.length;
      onProgress?.(completedCount, segments.length);
      console.log(
        result.cacheEntries.length > 0
          ? `   ✅ Batch ${index + 1}/${batches.length}: ${result.translated.length} segments`
          : `   💾 Batch ${index + 1}/${batches.length}: all cached (${result.translated.length} segments)`
      );

      // Queue the coordinator-owned durable commit without holding the request
      // slot; runConcurrent immediately refills it while commits stay serialized.
      void serializedCommit(
        result.cacheEntries,
        result.translated.map((t) => t.segmentId),
        allSegmentIds,
        startedAt
      );

      return result;
    });
  } catch (error) {
    await __commitChain;
    throw error;
  }
  await __commitChain;

  const translated = batchResults.flatMap((result) => result.translated);
  onProgress?.(translated.length, segments.length);

  // No final bulk write needed — each batch already committed through the
  // serialized path. Checkpoint merge is fully incremental.

  return translated;
}

function atomicWriteJsonSync(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + ".tmp." + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

// Serialized commit chain — ensures one-at-a-time durable writes so that
// every successfully settled batch is persisted before the next commit begins.
let __commitChain: Promise<void> = Promise.resolve();

export function resetCommitChain(): void {
  __commitChain = Promise.resolve();
}

export async function serializedCommit(
  cacheEntries: TranslationMemoryEntry[],
  newCompletedIds: string[],
  allSegmentIds: string[],
  startedAt: string,
  stateDir: string = STATE_DIR
): Promise<void> {
  __commitChain = __commitChain.then(
    () =>
      new Promise<void>((resolve, reject) => {
        setImmediate(() => {
          try {
            // Refill the freed request slot before doing serialized disk I/O.
            if (cacheEntries.length > 0) {
              const cachePath = path.join(stateDir, "translation-memory.jsonl");
              const dir = path.dirname(cachePath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              const lines = cacheEntries.map((e) => JSON.stringify(e)).join("\n") + "\n";
              fs.appendFileSync(cachePath, lines, "utf-8");
            }

            // 2. Merge with existing checkpoint and write atomically
            const syncPath = path.join(stateDir, "pending-sync.json");
            const existing: PendingSync = fs.existsSync(syncPath)
              ? (JSON.parse(fs.readFileSync(syncPath, "utf-8")) as PendingSync)
              : {
                  targetCommit: "",
                  startedAt: "",
                  completedSegmentIds: [],
                  remainingSegmentIds: [],
                  validCacheEntries: 0,
                  status: "translating"
                };
            const merged = [...new Set([...existing.completedSegmentIds, ...newCompletedIds])];
            atomicWriteJsonSync(syncPath, {
              targetCommit: existing.targetCommit,
              startedAt,
              completedSegmentIds: merged,
              remainingSegmentIds: allSegmentIds.filter((id) => !merged.includes(id)),
              validCacheEntries: merged.length,
              status: merged.length === allSegmentIds.length ? "completed" : "translating"
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      })
  );
  return __commitChain;
}

export { groupIntoBatches, buildCacheKey };
