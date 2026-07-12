import type {
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationProtocol
} from "../provider.js";
import { z } from "zod";

const TranslationResponseSchema = z
  .object({
    translations: z.array(
      z
        .object({
          id: z.string().min(1),
          text: z.string().min(1)
        })
        .strict()
    )
  })
  .strict();

type ValidatedTranslationResponse = z.infer<typeof TranslationResponseSchema>;

function validateResponseShape(data: unknown): ValidatedTranslationResponse {
  return TranslationResponseSchema.parse(data);
}

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
    temperature: 0.01,
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
    response_format: { type: "json_object" }
  };
}

export function parseStructuredJsonResponse(
  content: string,
  protocol: TranslationProtocol,
  modelId: string
): TranslationBatchResult {
  const parsed: unknown = JSON.parse(content);
  const record =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  let translations: Array<{ id: string; text: string }>;

  // Format 1: { translations: [{ id, text }] }
  if (record && Array.isArray(record.translations)) {
    translations = record.translations.map((t: { id: string; text: string }) => ({
      id: t.id,
      text: t.text
    }));
  }
  // Format 2: { segments: [{ id, translation }] }
  else if (record && Array.isArray(record.segments)) {
    translations = record.segments.map((s: { id: string; translation: string }) => ({
      id: s.id,
      text: s.translation
    }));
  }
  // Format 3: [{ id, translation }] or [{ id, target }] bare array
  else if (Array.isArray(parsed)) {
    translations = parsed.map((item: { id: string; translation?: string; target?: string }) => ({
      id: item.id,
      text: item.translation ?? item.target ?? ""
    }));
  } else {
    throw new Error("Response missing 'translations' or 'segments' array");
  }

  translations = validateResponseShape({ translations }).translations;
  const ids = new Set(translations.map((item) => item.id));
  if (ids.size !== translations.length) throw new Error("Response contains duplicate segment IDs");

  return {
    translations,
    metadata: {
      provider: "deepseek",
      requestedModel: modelId,
      actualModel: modelId,
      protocol,
      latencyMs: 0 // filled by caller
    }
  };
}
