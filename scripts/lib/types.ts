export type FileChange =
  | { type: "added"; path: string }
  | { type: "modified"; path: string }
  | { type: "deleted"; path: string }
  | { type: "renamed"; from: string; to: string }
  | { type: "unchanged"; path: string };

export type ProtectedTokenType =
  "inline-code" | "url" | "path" | "identifier" | "command" | "product" | "markdown";

export type ProtectedToken = {
  placeholder: string;
  original: string;
  type: ProtectedTokenType;
};

export type TranslationSegment = {
  id: string;
  filePath: string;
  nodeType: string;
  sectionPath: string[];
  source: string;
  normalizedSource: string;
  sourceStart?: number;
  sourceEnd?: number;
  sourceHash: string;
  contextHash: string;
  protectedTokens: ProtectedToken[];
};

export type SegmentBatch = {
  segments: TranslationSegment[];
  estimatedChars: number;
};

export type TranslationCacheIdentity = {
  sourceHash: string;
  contextHash: string;
  targetLocale: "zh-CN";
  promptVersion: string;
  glossaryVersion: string;
  translationPolicyVersion: string;
};

export type TranslationMemoryEntry = {
  key: string;
  source: string;
  translation: string;
  metadata: {
    targetLocale: "zh-CN";
    filePath: string;
    sectionPath: string[];
    modelRequested: string;
    modelUsed: string;
    translatedAt: string;
  };
};

export type OpenRouterPricing = {
  prompt?: string;
  completion?: string;
  request?: string;
  internal_reasoning?: string;
};

export type OpenRouterArchitecture = {
  input_modalities?: string[];
  output_modalities?: string[];
};

export type OpenRouterModel = {
  id: string;
  name?: string;
  context_length: number;
  pricing: OpenRouterPricing;
  architecture?: OpenRouterArchitecture;
  supported_parameters?: string[];
  created?: number;
  expiration_date?: string;
};

export type ModelAttemptResult = {
  modelId: string;
  success: boolean;
  transportFailure?: boolean;
  schemaFailure?: boolean;
  placeholderFailure?: boolean;
  languageFailure?: boolean;
  semanticFailure?: boolean;
  latencyMs: number;
  errorMessage?: string;
};

export type ModelHistory = {
  models: Record<
    string,
    {
      attempts: number;
      successes: number;
      transportFailures: number;
      schemaFailures: number;
      placeholderFailures: number;
      languageFailures: number;
      semanticFailures: number;
      averageLatencyMs: number;
      lastSuccessAt?: string;
      lastFailureAt?: string;
    }
  >;
};

export type PublishedUpstream = {
  repository: string;
  branch: string;
  docsPath: string;
  publishedCommit: string;
  publishedAt: string;
  releaseTag?: string;
  files: Record<string, { sha256: string }>;
};

export type PendingSync = {
  targetCommit: string;
  startedAt: string;
  completedSegmentIds: string[];
  remainingSegmentIds: string[];
  validCacheEntries: number;
  status: "translating" | "completed" | "failed";
};

export type DocsManifestPage = {
  slug: string;
  filePath: string;
  title: string;
  description?: string;
  section?: string;
};

export type DocsManifest = DocsManifestPage[];

export type NavigationGroup = {
  id: string;
  title: string;
  items: NavigationItem[];
};

export type NavigationItem = {
  slug: string;
  title: string;
  children?: NavigationItem[];
};

export type SearchDocument = {
  id: string;
  slug: string;
  title: string;
  section: string;
  headings: string;
  body: string;
};

export type SyncMetadata = {
  upstreamCommit: string;
  publishedAt: string;
  sourceSite: string;
  targetLocale: string;
  lastModelUsed?: string;
};
