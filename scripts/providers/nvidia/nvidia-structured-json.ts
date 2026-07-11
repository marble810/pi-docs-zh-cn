import type {
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationProtocol
} from "../provider.js";

export function buildStructuredJsonBody(
  model: string,
  batch: TranslationBatchRequest
): {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
  response_format: { type: "json_object" };
} {
  return {
    model,
    temperature: 0,
    max_tokens: batch.maxOutputTokens,
    messages: [
      {
        role: "system",
        content: batch.systemPrompt
      },
      {
        role: "user",
        content: JSON.stringify({
          targetLocale: batch.targetLocale,
          glossary: batch.glossary,
          preserve: batch.preserve,
          segments: batch.segments.map((seg) => ({
            id: seg.id,
            source: seg.source,
            sectionPath: seg.sectionPath,
            protectedTokens: seg.protectedTokens
          }))
        })
      }
    ],
    response_format: {
      type: "json_object"
    }
  };
}

export type StructuredJsonResponse = {
  translations?: Array<{ id: string; text: string }>;
  segments?: Array<{ id: string; translation: string }>;
};

export function parseStructuredJsonResponse(
  content: string,
  protocol: TranslationProtocol,
  modelId: string
): TranslationBatchResult {
  const parsed = JSON.parse(content) as StructuredJsonResponse;

  let translations: Array<{ id: string; text: string }>;

  // Try { translations: [{ id, text }] } format first
  if (parsed.translations && Array.isArray(parsed.translations)) {
    translations = parsed.translations.map((t) => ({ id: t.id, text: t.text }));
  }
  // Then try { segments: [{ id, translation }] } format (DeepSeek V4 actual output)
  else if (parsed.segments && Array.isArray(parsed.segments)) {
    translations = parsed.segments.map((s) => ({ id: s.id, text: s.translation }));
  } else {
    throw new Error("Response missing 'translations' or 'segments' array");
  }

  return {
    translations,
    metadata: {
      provider: "nvidia-nim",
      requestedModel: modelId,
      actualModel: modelId,
      protocol,
      latencyMs: 0 // filled by caller
    }
  };
}
