import { z } from "zod";

const NvidiaEnvSchema = z.object({
  NVIDIA_API_KEY: z.string().min(1, "NVIDIA_API_KEY is required"),

  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),

  NVIDIA_MODEL_CHAIN: z
    .string()
    .default(
      "deepseek-ai/deepseek-v4-pro,deepseek-ai/deepseek-v4-flash,nvidia/riva-translate-4b-instruct-v1_1"
    ),

  NVIDIA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),

  NVIDIA_POLL_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),

  NVIDIA_MAX_REQUESTS_PER_RUN: z.coerce.number().int().positive().default(100),

  NVIDIA_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(10),

  NVIDIA_MAX_MODEL_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(1),

  NVIDIA_CHECK_MODEL_AVAILABILITY: z.enum(["true", "false"]).default("true")
});

export type NvidiaConfig = {
  apiKey: string;
  baseUrl: string;
  modelChain: string[];
  requestTimeoutMs: number;
  pollTimeoutMs: number;
  maxRequestsPerRun: number;
  requestsPerMinute: number;
  maxModelAttempts: number;
  checkModelAvailability: boolean;
};

function parseModelChain(value: string): string[] {
  const models = value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const unique = [...new Set(models)];

  if (unique.length === 0) {
    throw new Error("NVIDIA_MODEL_CHAIN must contain at least one model");
  }

  for (const model of unique) {
    if (!model.includes("/")) {
      throw new Error(`Invalid NVIDIA model ID (missing '/'): ${model}`);
    }
  }

  return unique;
}

export function loadNvidiaConfig(env: NodeJS.ProcessEnv = process.env): NvidiaConfig {
  const parsed = NvidiaEnvSchema.parse(env);

  return {
    apiKey: parsed.NVIDIA_API_KEY,
    baseUrl: parsed.NVIDIA_BASE_URL.replace(/\/+$/, ""),
    modelChain: parseModelChain(parsed.NVIDIA_MODEL_CHAIN),
    requestTimeoutMs: parsed.NVIDIA_REQUEST_TIMEOUT_MS,
    pollTimeoutMs: parsed.NVIDIA_POLL_TIMEOUT_MS,
    maxRequestsPerRun: parsed.NVIDIA_MAX_REQUESTS_PER_RUN,
    requestsPerMinute: parsed.NVIDIA_REQUESTS_PER_MINUTE,
    maxModelAttempts: parsed.NVIDIA_MAX_MODEL_ATTEMPTS,
    checkModelAvailability: parsed.NVIDIA_CHECK_MODEL_AVAILABILITY === "true"
  };
}
