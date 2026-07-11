import type {
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationProtocol
} from "../provider.js";

export function buildStructuredJsonBody(
  model: string,
  batch: TranslationBatchRequest,
  useResponseFormat = true
): {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: "json_object" };
} {
  const body: ReturnType<typeof buildStructuredJsonBody> = {
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
    ]
  };

  if (useResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  return body;
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
  const parsed = JSON.parse(content);

  let translations: Array<{ id: string; text: string }>;

  // Format 1: { translations: [{ id, text }] }
  if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    parsed.translations &&
    Array.isArray(parsed.translations)
  ) {
    translations = parsed.translations.map((t: { id: string; text: string }) => ({
      id: t.id,
      text: t.text
    }));
  }
  // Format 2: { segments: [{ id, translation }] } (DeepSeek V4 Pro)
  else if (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed) &&
    parsed.segments &&
    Array.isArray(parsed.segments)
  ) {
    translations = parsed.segments.map((s: { id: string; translation: string }) => ({
      id: s.id,
      text: s.translation
    }));
  }
  // Format 3: [{ id, translation }] or [{ id, target }] (V4 Flash bare array)
  else if (Array.isArray(parsed)) {
    translations = parsed.map((item: { id: string; translation?: string; target?: string }) => ({
      id: item.id,
      text: item.translation ?? item.target ?? ""
    }));
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
