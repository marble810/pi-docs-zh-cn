import type { TranslationSegment } from "../lib/types.js";

export type TranslationProtocol = "structured-json" | "tagged-text";

export type ModelCandidate = {
  id: string;
  protocol: TranslationProtocol;
  position: number;
  available: boolean | "unknown";
};

export type TranslationSegmentRequest = {
  id: string;
  source: string;
  sectionPath: string[];
  protectedTokens: string[];
};

export type TranslationBatchRequest = {
  segments: TranslationSegmentRequest[];
  targetLocale: "zh-CN";
  glossary: Record<string, string>;
  preserve: string[];
  systemPrompt: string;
  maxOutputTokens: number;
  filePath?: string;
};

export type TranslationResult = {
  id: string;
  text: string;
};

export type TranslationBatchResult = {
  translations: TranslationResult[];
  metadata: {
    provider: string;
    requestedModel: string;
    actualModel: string;
    protocol: TranslationProtocol;
    latencyMs: number;
  };
};

export interface TranslationProvider {
  readonly id: string;

  getCandidateModels(): Promise<ModelCandidate[]>;

  translateBatch(
    request: TranslationBatchRequest,
    model: ModelCandidate
  ): Promise<TranslationBatchResult>;

  classifyError(error: unknown): ProviderErrorInfo;
}

export type ErrorKind =
  | "auth"
  | "rate-limit"
  | "quota"
  | "model-unavailable"
  | "timeout"
  | "server-error"
  | "empty-response"
  | "invalid-json"
  | "schema-mismatch"
  | "missing-segments"
  | "placeholder-mismatch"
  | "untranslated"
  | "extra-output"
  | "tags-broken"
  | "config-error"
  | "unknown";

export type ProviderErrorInfo = {
  kind: ErrorKind;
  safeMessage: string;
  fatal: boolean;
};

/** toTranslationSegmentRequest converts internal segment to provider request */
export function toTranslationSegmentRequest(seg: TranslationSegment): TranslationSegmentRequest {
  return {
    id: seg.id,
    source: seg.normalizedSource,
    sectionPath: seg.sectionPath,
    protectedTokens: seg.protectedTokens.map((t) => t.placeholder)
  };
}
