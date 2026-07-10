import type { TranslationProvider } from "./provider.js";
import { NvidiaNimProvider } from "./nvidia/nvidia-provider.js";
import { loadNvidiaConfig } from "./nvidia/nvidia-config.js";

export function createTranslationProvider(): TranslationProvider {
  const provider = process.env.AI_PROVIDER ?? "nvidia";

  if (provider === "nvidia") {
    const config = loadNvidiaConfig();
    console.log(`   🔧 Provider: nvidia-nim | Models: ${config.modelChain.join(", ")}`);
    return new NvidiaNimProvider(config);
  }

  throw new Error(`Unknown AI_PROVIDER: ${provider}. Supported: nvidia`);
}

/** Validate that required env vars are present. Returns null if ok, error message if not. */
export function validateProviderEnv(): string | null {
  const provider = process.env.AI_PROVIDER ?? "nvidia";

  if (provider !== "nvidia") {
    return `Unknown AI_PROVIDER: ${provider}`;
  }

  if (!process.env.NVIDIA_API_KEY) {
    return "Missing NVIDIA_API_KEY — set it in .env or GitHub Secrets";
  }

  try {
    loadNvidiaConfig();
    return null;
  } catch (err) {
    return `NVIDIA config error: ${(err as Error).message}`;
  }
}
