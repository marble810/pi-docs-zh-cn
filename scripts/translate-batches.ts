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
import { OpenRouterClient } from "./openrouter-client.js";
import { rankModels, type RankedModel } from "./rank-models.js";
import { discoverModels } from "./discover-models.js";
import type { OpenRouterModel, ModelHistory } from "./lib/types.js";

interface TranslateBatchesOptions {
  segments: TranslationSegment[];
  apiKey: string;
  maxRequestsPerRun?: number;
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
    // Start new batch if needed
    if (
      current.length >= policy.maxSegmentsPerBatch ||
      charCount + seg.source.length > policy.maxInputCharactersPerBatch ||
      (currentFile !== null &&
        seg.filePath !== currentFile &&
        fileSet.size >= policy.maxFilesPerBatch)
    ) {
      if (current.length > 0) {
        batches.push({
          segments: [...current],
          estimatedChars: charCount
        });
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

function loadModelHistory(): ModelHistory | null {
  const p = path.join(STATE_DIR, "model-history.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8")) as ModelHistory;
}

function saveModelHistory(history: ModelHistory): void {
  const p = path.join(STATE_DIR, "model-history.json");
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(history, null, 2), "utf-8");
}

function buildSchemaForBatch(batch: SegmentBatch): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const seg of batch.segments) {
    props[seg.id] = {
      type: "string",
      description: `Translate to zh-CN: ${seg.source.slice(0, 100)}${seg.source.length > 100 ? "..." : ""}`
    };
  }
  return {
    type: "object",
    properties: props,
    required: batch.segments.map((s) => s.id),
    additionalProperties: false
  };
}

export async function translateBatches(
  options: TranslateBatchesOptions
): Promise<TranslatedSegment[]> {
  const { segments, apiKey, maxRequestsPerRun = 35 } = options;
  const policy = loadTranslationPolicy();
  const versions = getConfigVersions();
  const cache = loadCache();
  const glossary = loadGlossary();
  const prompt = loadTranslationPrompt();

  const limited = Math.min(maxRequestsPerRun, policy.maxRequestsPerRun);
  const batches = groupIntoBatches(segments, policy);

  let requestsUsed = 0;
  const translated: TranslatedSegment[] = [];
  const modelHistory = loadModelHistory() ?? { models: {} };

  // Discover and rank models
  const { models: discoveredModels, freeFallback } = await discoverModels(apiKey);
  const allModels: OpenRouterModel[] = [...discoveredModels, freeFallback];
  const ranked: RankedModel[] = rankModels(allModels, modelHistory);

  const client = new OpenRouterClient(apiKey, policy.fallback.maxRetriesPerModel);

  // Process batches
  for (const batch of batches) {
    if (requestsUsed >= limited) {
      // Save checkpoint
      const remaining = segments.filter((s) => !translated.find((t) => t.segmentId === s.id));
      savePendingSync({
        targetCommit: "",
        startedAt: new Date().toISOString(),
        completedSegmentIds: translated.map((t) => t.segmentId),
        remainingSegmentIds: remaining.map((s) => s.id),
        validCacheEntries: translated.length,
        status: "translating"
      });
      saveModelHistory(modelHistory);
      break;
    }

    // Check cache first
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

    translated.push(...cachedResults);

    if (uncached.length === 0) continue;

    // Build uncached batch
    const uncachedBatch: SegmentBatch = {
      segments: uncached,
      estimatedChars: uncached.reduce((sum, s) => sum + s.source.length, 0)
    };

    // Try each ranked model in order
    let batchResult: TranslatedSegment[] | null = null;

    for (const rankedModel of ranked) {
      if (requestsUsed >= limited) break;
      requestsUsed++;

      const schema = buildSchemaForBatch(uncachedBatch);

      const content = await client.complete({
        model: rankedModel.model.id,
        messages: [
          { role: "system", content: prompt },
          {
            role: "user",
            content: JSON.stringify({
              glossary: glossary.terms,
              preserve: glossary.preserve,
              segments: uncached.map((s) => ({
                id: s.id,
                source: s.source,
                normalizedSource: s.normalizedSource,
                sectionPath: s.sectionPath,
                filePath: s.filePath
              }))
            })
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: schema
        }
      });

      // Update model history
      const mh = modelHistory.models[rankedModel.model.id] ?? {
        attempts: 0,
        successes: 0,
        transportFailures: 0,
        schemaFailures: 0,
        placeholderFailures: 0,
        languageFailures: 0,
        semanticFailures: 0,
        averageLatencyMs: 0,
        lastSuccessAt: undefined,
        lastFailureAt: undefined
      };
      mh.attempts++;
      mh.averageLatencyMs =
        (mh.averageLatencyMs * (mh.attempts - 1) + content.latencyMs) / mh.attempts;
      modelHistory.models[rankedModel.model.id] = mh;

      if (content.error) {
        mh.transportFailures++;
        mh.lastFailureAt = new Date().toISOString();
        continue; // Try next model
      }

      // Parse JSON response
      let parsed: Record<string, string>;
      try {
        parsed = JSON.parse(content.content);
      } catch {
        mh.schemaFailures++;
        mh.lastFailureAt = new Date().toISOString();
        continue;
      }

      // Validate all segments present
      const allPresent = uncached.every((s) => parsed[s.id] !== undefined);
      if (!allPresent) {
        mh.schemaFailures++;
        mh.lastFailureAt = new Date().toISOString();
        continue;
      }

      // Basic validation - placeholder count match
      const placeholderOk = uncached.every((s) => {
        const translation = parsed[s.id];
        const srcPlaceholders = (s.source.match(/\{\{[^}]+\}\}/g) ?? []).length;
        const tgtPlaceholders = (translation.match(/\{\{[^}]+\}\}/g) ?? []).length;
        return srcPlaceholders === tgtPlaceholders;
      });

      if (!placeholderOk) {
        mh.placeholderFailures++;
        mh.lastFailureAt = new Date().toISOString();
        continue;
      }

      // Success
      mh.successes++;
      mh.lastSuccessAt = new Date().toISOString();

      batchResult = uncached.map((s) => ({
        segmentId: s.id,
        translation: parsed[s.id],
        modelUsed: rankedModel.model.id
      }));

      // Write cache entries
      const cacheEntries: TranslationMemoryEntry[] = uncached.map((s) => ({
        key: buildCacheKey(s, versions),
        source: s.source,
        translation: parsed[s.id],
        metadata: {
          targetLocale: "zh-CN",
          filePath: s.filePath,
          sectionPath: s.sectionPath,
          modelRequested: rankedModel.model.id,
          modelUsed: rankedModel.model.id,
          translatedAt: new Date().toISOString()
        }
      }));
      appendCache(cacheEntries);

      break; // Success, stop trying other models
    }

    if (batchResult) {
      translated.push(...batchResult);
    }
  }

  // Final checkpoint
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
  saveModelHistory(modelHistory);

  return translated;
}

function savePendingSync(sync: PendingSync): void {
  const p = path.join(STATE_DIR, "pending-sync.json");
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(sync, null, 2), "utf-8");
}

export { groupIntoBatches, buildCacheKey };
