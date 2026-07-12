import type { TranslationProvider } from "./provider.js";
import { DeepSeekProvider } from "./deepseek/deepseek-provider.js";
import { loadDeepSeekConfig } from "./deepseek/deepseek-config.js";

export function createTranslationProvider(): TranslationProvider {
  const config = loadDeepSeekConfig();
  console.log(`   🔧 Provider: deepseek | Model: ${config.model}`);
  return new DeepSeekProvider(config);
}

/** Validate that required env vars are present. Returns null if ok, error message if not. */
export function validateProviderEnv(): string | null {
  if (!process.env.DEEPSEEK_API_KEY) {
    return "Missing DEEPSEEK_API_KEY — set it in .env or GitHub Secrets";
  }

  try {
    loadDeepSeekConfig();
    return null;
  } catch (err) {
    return `DeepSeek config error: ${(err as Error).message}`;
  }
}
