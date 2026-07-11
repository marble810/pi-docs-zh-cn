import type { TranslationProtocol } from "../provider.js";

const RIVA_ID = "nvidia/riva-translate-4b-instruct-v1_1";

export function resolveTranslationProtocol(modelId: string): TranslationProtocol {
  if (modelId === RIVA_ID) return "tagged-text";
  return "structured-json";
}

/** Whether the model supports OpenAI-style response_format: { type: "json_object" } */
export function supportsJsonResponseFormat(modelId: string): boolean {
  // V4 Flash on NVIDIA doesn't respect json_object and returns plain text
  if (modelId === "deepseek-ai/deepseek-v4-flash") return false;
  return true;
}

export function maxBatchConfig(protocol: TranslationProtocol) {
  if (protocol === "tagged-text") {
    return {
      maxSegmentsPerBatch: 12,
      maxInputCharactersPerBatch: 7_000,
      maxOutputTokens: 3_500
    };
  }
  return {
    maxSegmentsPerBatch: 24,
    maxInputCharactersPerBatch: 20_000,
    maxOutputTokens: 8_000
  };
}
