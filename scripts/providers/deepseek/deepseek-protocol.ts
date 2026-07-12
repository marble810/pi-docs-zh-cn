import type { TranslationProtocol } from "../provider.js";

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
