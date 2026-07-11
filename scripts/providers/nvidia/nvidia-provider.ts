import type {
  TranslationProvider,
  TranslationBatchRequest,
  TranslationBatchResult,
  ModelCandidate
} from "../provider.js";
import type { NvidiaConfig } from "./nvidia-config.js";
import { NvidiaClient } from "./nvidia-client.js";
import { fetchAvailableModelIds } from "./nvidia-models.js";
import type { NvidiaChatResponse } from "./nvidia-response.js";
import { resolveTranslationProtocol } from "./nvidia-protocol.js";
import { buildStructuredJsonBody, parseStructuredJsonResponse } from "./nvidia-structured-json.js";
import { buildTaggedTextBody, parseTaggedTextResponse } from "./nvidia-tagged-text.js";
import { classifyNvidiaError } from "./nvidia-errors.js";
import type { ProviderErrorInfo } from "../provider.js";
import { ProviderError } from "../errors.js";

/**
 * Model history data kept purely for diagnostics.
 * Does NOT influence model ordering — that's determined by NVIDIA_MODEL_CHAIN.
 */
export type NvidiaModelDiagnostic = {
  attempts: number;
  successes: number;
  transportFailures: number;
  schemaFailures: number;
  placeholderFailures: number;
  averageLatencyMs: number;
  lastSuccessAt?: string;
  lastFailureAt?: string;
};

export type NvidiaDiagnostics = {
  models: Record<string, NvidiaModelDiagnostic>;
};

export class NvidiaNimProvider implements TranslationProvider {
  readonly id = "nvidia-nim";
  private client: NvidiaClient;
  private config: NvidiaConfig;
  private diagnostics: NvidiaDiagnostics = { models: {} };

  constructor(config: NvidiaConfig) {
    this.config = config;
    this.client = new NvidiaClient(config);
  }

  getDiagnostics(): NvidiaDiagnostics {
    return this.diagnostics;
  }

  private recordAttempt(
    modelId: string,
    success: boolean,
    latencyMs: number,
    failureKind?: string
  ): void {
    const d = this.diagnostics.models[modelId] ?? {
      attempts: 0,
      successes: 0,
      transportFailures: 0,
      schemaFailures: 0,
      placeholderFailures: 0,
      averageLatencyMs: 0
    };
    d.attempts++;
    d.averageLatencyMs = (d.averageLatencyMs * (d.attempts - 1) + latencyMs) / d.attempts;

    if (success) {
      d.successes++;
      d.lastSuccessAt = new Date().toISOString();
    } else {
      d.lastFailureAt = new Date().toISOString();
      if (failureKind) {
        switch (failureKind) {
          case "transport":
          case "timeout":
          case "rate-limit":
          case "server-error":
            d.transportFailures++;
            break;
          case "schema":
          case "missing-segments":
          case "invalid-json":
            d.schemaFailures++;
            break;
          case "placeholder-mismatch":
          case "placeholder":
            d.placeholderFailures++;
            break;
        }
      }
    }
    this.diagnostics.models[modelId] = d;
  }

  async getCandidateModels(): Promise<ModelCandidate[]> {
    const configured = this.config.modelChain;

    let availableSet: Set<string> | null = null;
    if (this.config.checkModelAvailability) {
      availableSet = await fetchAvailableModelIds(this.client);
    }

    return configured.map((id, position) => {
      const protocol = resolveTranslationProtocol(id);
      let available: boolean | "unknown";
      if (availableSet === null) {
        available = "unknown";
      } else {
        available = availableSet.has(id);
        if (!available) {
          console.log(`   ⏭  Skipping unavailable NVIDIA model: ${id}`);
        }
      }
      return { id, protocol, position, available };
    });
  }

  async translateBatch(
    request: TranslationBatchRequest,
    model: ModelCandidate
  ): Promise<TranslationBatchResult> {
    const t0 = Date.now();

    let body: unknown;
    const protocol = model.protocol;

    if (protocol === "tagged-text") {
      body = buildTaggedTextBody(model.id, request);
    } else {
      body = buildStructuredJsonBody(model.id, request);
      // Debug: log request shape
      const req = body as Record<string, unknown>;
      console.log(
        `      📤 ${model.id}: ${req.model}, max_tokens=${req.max_tokens}, ` +
          `response_format=${JSON.stringify(req.response_format)}, ` +
          `segments=${request.segments.length}`
      );
    }

    const response = await this.client.post<NvidiaChatResponse>("/chat/completions", body);

    const content = response.choices?.[0]?.message?.content ?? "";

    if (!content) {
      throw new ProviderError("empty-response", "Empty response from model", false);
    }

    // Debug: log raw response snippet on error
    const logPreview = (text: string) => text.slice(0, 500).replace(/\n/g, "\\n");

    let result: TranslationBatchResult;
    if (protocol === "tagged-text") {
      try {
        result = parseTaggedTextResponse(content, protocol, model.id);
      } catch (err) {
        console.log(`      📝 ${model.id} raw: ${logPreview(content)}`);
        throw err;
      }
    } else {
      try {
        result = parseStructuredJsonResponse(content, protocol, model.id);
      } catch (err) {
        console.log(`      📝 ${model.id} raw: ${logPreview(content)}`);
        throw err;
      }
    }

    result.metadata.latencyMs = Date.now() - t0;
    result.metadata.actualModel = model.id;

    // Log success
    const elapsed = (result.metadata.latencyMs / 1000).toFixed(1);
    console.log(`      ✅ ${model.id}: ${result.translations.length} segments in ${elapsed}s`);

    this.recordAttempt(model.id, true, result.metadata.latencyMs);

    return result;
  }

  classifyError(error: unknown): ProviderErrorInfo {
    return classifyNvidiaError(error);
  }
}
