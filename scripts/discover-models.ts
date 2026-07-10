import type { OpenRouterModel } from "./lib/types.js";

interface DiscoverResult {
  models: OpenRouterModel[];
  freeFallback: OpenRouterModel;
}

const FREE_FALLBACK: OpenRouterModel = {
  id: "openrouter/free",
  name: "OpenRouter Free",
  context_length: 32768,
  pricing: { prompt: "0", completion: "0", request: "0" },
  architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  supported_parameters: ["response_format"]
};

interface RawModel {
  id: string;
  name?: string;
  context_length: number;
  pricing: { prompt?: string; completion?: string; request?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
  created?: number;
  expiration_date?: string;
}

export async function discoverModels(apiKey: string): Promise<DiscoverResult> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  const t0 = Date.now();

  // Fetch /models/user for user-specific models
  const [userModelsRes, generalRes] = await Promise.all([
    fetch(`${baseUrl}/models/user`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }),
    fetch(`${baseUrl}/models?category=translation`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    })
  ]);

  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  function isFree(model: RawModel): boolean {
    const p = model.pricing ?? {};
    const prompt = parseFloat(p.prompt ?? "0");
    const completion = parseFloat(p.completion ?? "0");
    const request = parseFloat(p.request ?? "0");
    return prompt === 0 && completion === 0 && request === 0;
  }

  function isTextInOut(model: RawModel): boolean {
    const arch = model.architecture;
    if (!arch) return true; // assume text if not specified
    const input = arch.input_modalities ?? ["text"];
    const output = arch.output_modalities ?? ["text"];
    return input.includes("text") && output.includes("text");
  }

  function hasResponseFormat(model: RawModel): boolean {
    return model.supported_parameters?.includes("response_format") ?? false;
  }

  function notExpiring(model: RawModel): boolean {
    if (!model.expiration_date) return true;
    return new Date(model.expiration_date).getTime() - now > fourteenDays;
  }

  const allModels: RawModel[] = [];

  let userCount = 0;
  let generalCount = 0;

  if (userModelsRes.ok) {
    const userData = (await userModelsRes.json()) as { data: RawModel[] };
    userCount = userData.data?.length ?? 0;
    allModels.push(...(userData.data ?? []));
    console.log(`   📡 /models/user: ${userCount} models`);
  } else {
    console.log(`   ⚠ /models/user failed (${userModelsRes.status})`);
  }

  if (generalRes.ok) {
    const generalData = (await generalRes.json()) as { data: RawModel[] };
    generalCount = generalData.data?.length ?? 0;
    allModels.push(...(generalData.data ?? []));
    console.log(`   📡 /models (translation): ${generalCount} models`);
  } else {
    console.log(`   ⚠ /models failed (${generalRes.status})`);
  }

  let freeFail = 0;
  let ctxFail = 0;
  let modalFail = 0;
  let respFail = 0;
  let expireFail = 0;

  // Deduplicate by id
  const seen = new Set<string>();
  const filtered: OpenRouterModel[] = [];

  for (const m of allModels) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);

    if (!isFree(m)) {
      freeFail++;
      continue;
    }
    if ((m.context_length ?? 0) < 32768) {
      ctxFail++;
      continue;
    }
    if (!isTextInOut(m)) {
      modalFail++;
      continue;
    }
    if (!hasResponseFormat(m)) {
      respFail++;
      continue;
    }
    if (!notExpiring(m)) {
      expireFail++;
      continue;
    }

    filtered.push({
      id: m.id,
      name: m.name,
      context_length: m.context_length,
      pricing: {
        prompt: m.pricing?.prompt,
        completion: m.pricing?.completion,
        request: m.pricing?.request
      },
      architecture: m.architecture,
      supported_parameters: m.supported_parameters,
      created: m.created,
      expiration_date: m.expiration_date
    });
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totalRaw = allModels.length;
  console.log(
    `   🔎 Filtering: total=${totalRaw} → free=${totalRaw - freeFail} → ctx=${totalRaw - freeFail - ctxFail} → ` +
      `text=${filtered.length + modalFail + respFail + expireFail} → eligible=${filtered.length} ` +
      `(${elapsed}s)`
  );
  if (filtered.length > 0) {
    console.log(`   📋 Eligible: ${filtered.map((m) => m.id).join(", ")}`);
  }

  return { models: filtered, freeFallback: FREE_FALLBACK };
}

if (import.meta.main) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error("OPENROUTER_API_KEY not set");
    process.exit(1);
  }
  const result = await discoverModels(key);
  console.log(JSON.stringify(result.models, null, 2));
  console.log(`\nFound ${result.models.length} eligible models + fallback`);
}
