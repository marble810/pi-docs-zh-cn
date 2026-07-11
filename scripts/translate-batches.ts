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
  type TranslationSegmentRequest,
  toTranslationSegmentRequest
} from "./providers/provider.js";
import { AllModelsFailedError } from "./providers/errors.js";
import { createTranslationProvider } from "./providers/provider-factory.js";
import { maxBatchConfig } from "./providers/nvidia/nvidia-protocol.js";

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
    cache.set(entry.key, entry);
  }
  return cache;
}

function appendCache(entries: TranslationMemoryEntry[]): void {
  const cachePath = path.join(STATE_DIR, "translation-memory.jsonl");
  const dir = path.dirname(cachePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.appendFileSync(cachePath, lines, "utf-8");
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
    if (current.length >= maxPerBatch || charCount + seg.source.length > maxChars) {
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

    // If we need to split (e.g., Riva handles smaller batches)
    const needsSplit = segsForThisModel.length > protocolConfig.maxSegmentsPerBatch;

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
        const reqSegments: TranslationSegmentRequest[] = subSegs.map(toTranslationSegmentRequest);
        const request: TranslationBatchRequest = {
          segments: reqSegments,
          targetLocale: "zh-CN",
          glossary: batchData.glossary,
          preserve: batchData.preserve,
          systemPrompt: batchData.prompt,
          maxOutputTokens: protocolConfig.maxOutputTokens
        };

        try {
          const subResult = await provider.translateBatch(request, candidate);
          subResults.push(subResult);
        } catch (err) {
          const info = provider.classifyError(err);
          console.log(`   ❌ ${candidate.id}: sub-batch failed — ${info.safeMessage}`);
          throw err; // Re-throw to let fallback loop handle it
        }
      }

      // Merge sub-results
      return {
        translations: subResults.flatMap((r) => r.translations),
        metadata: {
          provider: provider.id,
          requestedModel: candidate.id,
          actualModel: candidate.id,
          protocol: candidate.protocol,
          latencyMs: subResults.reduce((sum, r) => sum + r.metadata.latencyMs, 0)
        }
      };
    }

    // Normal batch (no split needed)
    const reqSegments: TranslationSegmentRequest[] = segsForThisModel.map(
      toTranslationSegmentRequest
    );
    const request: TranslationBatchRequest = {
      segments: reqSegments,
      targetLocale: "zh-CN",
      glossary: batchData.glossary,
      preserve: batchData.preserve,
      systemPrompt: batchData.prompt,
      maxOutputTokens: protocolConfig.maxOutputTokens
    };

    try {
      const result = await provider.translateBatch(request, candidate);

      // Validate
      validateTranslationBatch(segsForThisModel, result);

      return result;
    } catch (err) {
      const info = provider.classifyError(err);
      failures.push(`${candidate.id}: ${info.kind}`);
      console.log(`   ❌ ${candidate.id}: ${info.safeMessage}`);

      if (info.fatal) {
        throw new AllModelsFailedError([info]);
      }
    }
  }

  throw new AllModelsFailedError(
    failures.map((f) => ({ kind: "unknown", safeMessage: f, fatal: false }))
  );
}

function validateTranslationBatch(
  segments: TranslationSegment[],
  result: TranslationBatchResult
): void {
  // All segments must have a translation
  const resultIds = new Map(result.translations.map((t) => [t.id, t.text]));

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

  // Placeholder preservation
  for (const seg of segments) {
    const translation = resultIds.get(seg.id) ?? "";
    const srcPlaceholders = (seg.source.match(/\{\{[^}]+\}\}/g) ?? []).length;
    const tgtPlaceholders = (translation.match(/\{\{[^}]+\}\}/g) ?? []).length;
    if (srcPlaceholders !== tgtPlaceholders) {
      throw new Error(
        `Placeholder mismatch in ${seg.id}: src=${srcPlaceholders} tgt=${tgtPlaceholders}`
      );
    }
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
    console.log("   ⚠ No available NVIDIA models. Translation skipped.");
    return [];
  }

  console.log(`   📋 Model chain: ${availableCandidates.map((c) => c.id).join(" → ")}`);

  const batches = groupIntoBatches(segments, policy);
  console.log(`   📊 ${segments.length} segments → ${batches.length} batches`);

  const translated: TranslatedSegment[] = [];

  // Process batches
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    onProgress?.(translated.length, segments.length);

    // Check cache
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

    if (cachedResults.length > 0) {
      console.log(
        `   💾 Batch ${i + 1}/${batches.length}: ${cachedResults.length} cache-hit, ${uncached.length} need translation`
      );
    }
    translated.push(...cachedResults);

    if (uncached.length === 0) continue;

    // Translate uncached
    try {
      const result = await translateWithFallback(
        provider,
        {
          segments: uncached,
          glossary: glossary.terms,
          preserve: glossary.preserve,
          prompt
        },
        availableCandidates
      );

      const batchTranslated: TranslatedSegment[] = result.translations.map((t) => ({
        segmentId: t.id,
        translation: t.text,
        modelUsed: result.metadata.actualModel
      }));

      translated.push(...batchTranslated);

      // Write cache
      const cacheEntries: TranslationMemoryEntry[] = uncached.map((s) => {
        const rt = result.translations.find((t) => t.id === s.id);
        return {
          key: buildCacheKey(s, versions),
          source: s.source,
          translation: rt?.text ?? "",
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
      appendCache(cacheEntries);

      console.log(
        `   ✅ Batch ${i + 1}: ${batchTranslated.length} segments via ${result.metadata.actualModel}`
      );
    } catch (err) {
      if (err instanceof AllModelsFailedError) {
        console.log(
          `   🚫 Batch ${i + 1}: all models failed — skipping, ${uncached.length} segments untranslated`
        );
        // Continue to next batch; checkpoint saves remaining segments at end
        continue;
      }
      throw err;
    }
  }

  onProgress?.(translated.length, segments.length);

  // Save checkpoint
  savePendingSync({
    targetCommit: "",
    startedAt: new Date().toISOString(),
    completedSegmentIds: translated.map((t) => t.segmentId),
    remainingSegmentIds: segments
      .filter((s) => !translated.find((t) => t.segmentId === s.id))
      .map((s) => s.id),
    validCacheEntries: translated.length,
    status: translated.length === segments.length ? "completed" : "translating"
  });

  return translated;
}

function savePendingSync(sync: PendingSync): void {
  const p = path.join(STATE_DIR, "pending-sync.json");
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(sync, null, 2), "utf-8");
}

export { groupIntoBatches, buildCacheKey };
