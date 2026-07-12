import { z } from "zod";

const DeepSeekEnvSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required"),

  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),

  DEEPSEEK_MODEL: z.literal("deepseek-v4-flash").default("deepseek-v4-flash"),

  DEEPSEEK_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),

  DEEPSEEK_MAX_REQUESTS_PER_RUN: z.coerce.number().int().positive().default(1000),

  DEEPSEEK_MAX_MODEL_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(6)
});

export type DeepSeekConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  requestTimeoutMs: number;
  maxRequestsPerRun: number;
  maxModelAttempts: number;
};

export function loadDeepSeekConfig(env: NodeJS.ProcessEnv = process.env): DeepSeekConfig {
  const parsed = DeepSeekEnvSchema.parse(env);

  return {
    apiKey: parsed.DEEPSEEK_API_KEY,
    baseUrl: parsed.DEEPSEEK_BASE_URL.replace(/\/+$/, ""),
    model: parsed.DEEPSEEK_MODEL,
    requestTimeoutMs: parsed.DEEPSEEK_REQUEST_TIMEOUT_MS,
    maxRequestsPerRun: parsed.DEEPSEEK_MAX_REQUESTS_PER_RUN,
    maxModelAttempts: parsed.DEEPSEEK_MAX_MODEL_ATTEMPTS
  };
}
