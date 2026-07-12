import type {
  TranslationProvider,
  TranslationBatchRequest,
  TranslationBatchResult,
  ModelCandidate
} from "../provider.js";
import type { DeepSeekConfig } from "./deepseek-config.js";
import { DeepSeekClient } from "./deepseek-client.js";
import {
  buildStructuredJsonBody,
  parseStructuredJsonResponse
} from "./deepseek-structured-json.js";
import { classifyDeepSeekError } from "./deepseek-errors.js";
import type { ProviderErrorInfo } from "../provider.js";
import { ProviderError } from "../errors.js";

type DeepSeekChatResponse = {
  id: string;
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export class DeepSeekProvider implements TranslationProvider {
  readonly id = "deepseek";
  private client: DeepSeekClient;
  private config: DeepSeekConfig;

  constructor(config: DeepSeekConfig) {
    this.config = config;
    this.client = new DeepSeekClient(config);
  }

  async getCandidateModels(): Promise<ModelCandidate[]> {
    const modelId = this.config.model;
    return [
      {
        id: modelId,
        protocol: "structured-json",
        position: 0,
        available: true
      }
    ];
  }

  async translateBatch(
    request: TranslationBatchRequest,
    model: ModelCandidate
  ): Promise<TranslationBatchResult> {
    const t0 = Date.now();

    const body = buildStructuredJsonBody(model.id, request);

    const req = body as Record<string, unknown>;
    console.log(
      `      📤 ${model.id}: ${req.model}, max_tokens=${req.max_tokens}, ` +
        `json_format=true, segments=${request.segments.length}`
    );

    const response = await this.client.post<DeepSeekChatResponse>("/chat/completions", body);

    const content = response.choices?.[0]?.message?.content ?? "";

    if (!content) {
      throw new ProviderError("empty-response", "Empty response from model", false);
    }

    const logPreview = (text: string) => text.slice(0, 500).replace(/\n/g, "\\n");

    let result: TranslationBatchResult;
    try {
      result = parseStructuredJsonResponse(content, model.protocol, model.id);
    } catch (err) {
      console.log(`      📝 ${model.id} raw: ${logPreview(content)}`);
      throw err;
    }

    result.metadata.latencyMs = Date.now() - t0;
    result.metadata.actualModel = model.id;

    const elapsed = (result.metadata.latencyMs / 1000).toFixed(1);
    console.log(`      ✅ ${model.id}: ${result.translations.length} segments in ${elapsed}s`);

    return result;
  }

  classifyError(error: unknown): ProviderErrorInfo {
    return classifyDeepSeekError(error);
  }
}
